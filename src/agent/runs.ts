// Run action handlers. Each returns a message + Session State patches
// (RFC 6902 subset, §13.2). The Host applies patches on Run completion
// because the manifest declares state_mode=agenthub-managed (§13.3).

import type {
  AgentRunContext,
  SurfacePatch,
} from "@agenthub/sdk";
import type {
  AgentInput,
  ChartSpec,
  Dataset,
  DatasetMeta,
  Kpi,
  SessionState,
} from "../shared/types.js";
import { summarize } from "./analytics.js";
import { parseContent } from "./csv.js";
import { buildChart, interpret, type ChartIntent } from "./query.js";
import { buildIntentMessages, chartIntentSchema } from "./prompts.js";

export function emptyState(): SessionState {
  return {
    datasets: [],
    data: {},
    activeDatasetId: null,
    chart: null,
    kpis: [],
    note: "",
  };
}

function metaOf(d: Dataset): DatasetMeta {
  return {
    id: d.id,
    name: d.name,
    description: d.description,
    source: d.source,
    columns: d.columns,
    rowCount: d.rows.length,
  };
}

function datasetFromState(
  state: SessionState,
  id: string | null,
): Dataset | null {
  if (!id) return null;
  const meta = state.datasets.find((d) => d.id === id);
  const rows = state.data[id];
  if (!meta || !rows) return null;
  return {
    id: meta.id,
    name: meta.name,
    description: meta.description,
    source: meta.source,
    columns: meta.columns,
    rows,
  };
}

function kpisFor(d: Dataset): Kpi[] {
  return summarize(d).headlineKpis;
}

export interface ActionResult {
  message: string;
  patches: SurfacePatch[];
  artifact?: { type: string; title: string; data: unknown };
}

function loadDatasetPatches(
  state: SessionState,
  d: Dataset,
): SurfacePatch[] {
  const exists = state.datasets.some((m) => m.id === d.id);
  const metaPatch: SurfacePatch = exists
    ? {
        op: "replace",
        path: `/datasets/${state.datasets.findIndex((m) => m.id === d.id)}`,
        value: metaOf(d),
      }
    : { op: "add", path: "/datasets/-", value: metaOf(d) };
  return [
    metaPatch,
    { op: "add", path: `/data/${d.id}`, value: d.rows },
    { op: "replace", path: "/activeDatasetId", value: d.id },
    { op: "replace", path: "/kpis", value: kpisFor(d) },
    { op: "replace", path: "/chart", value: null },
  ];
}

// ── init: seed sample datasets if the session is empty ──
function handleInit(
  state: SessionState,
  samples: Dataset[],
): ActionResult {
  if (state.datasets.length > 0) {
    return { message: "이미 데이터셋이 있습니다.", patches: [] };
  }
  const active = samples[0];
  const patches: SurfacePatch[] = [
    { op: "replace", path: "/datasets", value: samples.map(metaOf) },
    {
      op: "replace",
      path: "/data",
      value: Object.fromEntries(samples.map((d) => [d.id, d.rows])),
    },
    { op: "replace", path: "/activeDatasetId", value: active.id },
    { op: "replace", path: "/kpis", value: kpisFor(active) },
    { op: "replace", path: "/chart", value: null },
    {
      op: "replace",
      path: "/note",
      value: "샘플 데이터셋을 불러왔습니다. 프롬프트로 차트를 생성하세요.",
    },
  ];
  return {
    message: `샘플 데이터셋 ${samples.length}개를 불러왔습니다.`,
    patches,
  };
}

// ── select: switch the active dataset ──
function handleSelect(state: SessionState, datasetId: string): ActionResult {
  const d = datasetFromState(state, datasetId);
  if (!d) {
    return { message: `데이터셋을 찾을 수 없습니다: ${datasetId}`, patches: [] };
  }
  return {
    message: `${d.name} 선택됨`,
    patches: [
      { op: "replace", path: "/activeDatasetId", value: d.id },
      { op: "replace", path: "/kpis", value: kpisFor(d) },
      { op: "replace", path: "/chart", value: null },
    ],
  };
}

// ── ingest: parse an uploaded CSV/JSON file into a new dataset ──
async function handleIngest(
  ctx: AgentRunContext,
  state: SessionState,
  input: Extract<AgentInput, { action: "ingest" }>,
): Promise<ActionResult> {
  const file = await ctx.files.get(input.fileId);
  const text = await ctx.files.read(input.fileId);
  const name = (input.name ?? file.name ?? "업로드").replace(/\.[^.]+$/, "");
  const lower = (file.name ?? "").toLowerCase();
  const format: "csv" | "json" =
    input.format ??
    (lower.endsWith(".json") || file.mime === "application/json"
      ? "json"
      : "csv");

  const parsed = parseContent(text, format);
  if (parsed.rows.length === 0) {
    return { message: "가져온 파일에 데이터 행이 없습니다.", patches: [] };
  }

  const uploadCount = state.datasets.filter((d) => d.source === "upload").length;
  const dataset: Dataset = {
    id: `upload-${uploadCount + 1}`,
    name: name || `업로드 ${uploadCount + 1}`,
    description: "업로드한 데이터셋",
    source: "upload",
    columns: parsed.columns,
    rows: parsed.rows,
  };

  return {
    message: `"${dataset.name}" 등록됨 (${dataset.rows.length}행, ${dataset.columns.length}열)`,
    patches: loadDatasetPatches(state, dataset),
  };
}

function isChartIntent(v: unknown, columns: string[]): v is ChartIntent {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    (o.chartType === "line" ||
      o.chartType === "bar" ||
      o.chartType === "kpi") &&
    typeof o.dimension === "string" &&
    typeof o.measure === "string" &&
    columns.includes(o.dimension) &&
    columns.includes(o.measure)
  );
}

// ── query: prompt → chart spec via LLM Gateway, rule-based fallback ──
async function handleQuery(
  ctx: AgentRunContext,
  state: SessionState,
  input: Extract<AgentInput, { action: "query" }>,
): Promise<ActionResult> {
  const id = input.datasetId ?? state.activeDatasetId;
  const dataset = datasetFromState(state, id);
  if (!dataset) {
    return { message: "먼저 데이터셋을 선택하세요.", patches: [] };
  }

  let spec: ChartSpec | null = null;
  if (!ctx.signal.aborted) {
    try {
      const res = await ctx.llm.generate({
        model: "fast",
        messages: buildIntentMessages(input.prompt, dataset),
        response_format: { type: "json_schema", schema: chartIntentSchema },
      });
      if (isChartIntent(res.output, dataset.columns)) {
        spec = buildChart(dataset, res.output);
      }
    } catch {
      // LLM Gateway 오류 → 규칙 기반 폴백 (§10.5: Run 자체는 자동 재시도 없음)
      spec = null;
    }
  }
  if (!spec) spec = interpret(input.prompt, dataset);

  const kpis = spec.kpis ?? summarize(dataset).headlineKpis;
  return {
    message: spec.title,
    patches: [
      { op: "replace", path: "/chart", value: spec },
      { op: "replace", path: "/kpis", value: kpis },
      { op: "replace", path: "/note", value: spec.note },
    ],
    artifact: {
      type: "json",
      title: `${spec.title}.json`,
      data: spec,
    },
  };
}

export async function dispatch(
  ctx: AgentRunContext,
  input: AgentInput,
  state: SessionState,
  samples: Dataset[],
): Promise<ActionResult> {
  switch (input.action) {
    case "init":
      return handleInit(state, samples);
    case "select":
      return handleSelect(state, input.datasetId);
    case "ingest":
      return handleIngest(ctx, state, input);
    case "query":
      return handleQuery(ctx, state, input);
  }
}
