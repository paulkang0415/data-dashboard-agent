// Agent entrypoint — called by the AgentHub Agent Function Runtime (§8.1).
// Trusted server-side code: may use the LLM Gateway, state, files, artifacts.

import type {
  AgentRunContext,
  ArtifactRef,
  RunResult,
} from "@agenthub/sdk";
import type { AgentInput, SessionState } from "../shared/types.js";
import { SAMPLE_DATASETS } from "./samples.js";
import { dispatch, emptyState } from "./runs.js";

function parseInput(raw: unknown): AgentInput | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  switch (o.action) {
    case "init":
      return { action: "init" };
    case "select":
      return typeof o.datasetId === "string"
        ? { action: "select", datasetId: o.datasetId }
        : null;
    case "ingest":
      return typeof o.fileId === "string"
        ? {
            action: "ingest",
            fileId: o.fileId,
            name: typeof o.name === "string" ? o.name : undefined,
            format: o.format === "csv" || o.format === "json" ? o.format : undefined,
          }
        : null;
    case "query":
      return typeof o.prompt === "string" && o.prompt.trim()
        ? {
            action: "query",
            prompt: o.prompt,
            datasetId:
              typeof o.datasetId === "string" ? o.datasetId : undefined,
          }
        : null;
    default:
      return null;
  }
}

function coerceState(raw: unknown): SessionState {
  const base = emptyState();
  if (!raw || typeof raw !== "object") return base;
  const s = raw as Partial<SessionState>;
  return {
    datasets: Array.isArray(s.datasets) ? s.datasets : base.datasets,
    data:
      s.data && typeof s.data === "object" ? s.data : base.data,
    activeDatasetId:
      typeof s.activeDatasetId === "string" ? s.activeDatasetId : null,
    chart: s.chart ?? null,
    kpis: Array.isArray(s.kpis) ? s.kpis : base.kpis,
    note: typeof s.note === "string" ? s.note : base.note,
  };
}

export async function run(ctx: AgentRunContext): Promise<RunResult> {
  const input = parseInput(ctx.input);
  if (!input) {
    return {
      error: {
        code: "bad_input",
        message:
          "지원하지 않는 입력입니다. action은 init | select | ingest | query 중 하나여야 합니다.",
        retryable: false,
      },
    };
  }

  const state = coerceState(await ctx.state.read());

  let result;
  try {
    result = await dispatch(ctx, input, state, SAMPLE_DATASETS);
  } catch (e) {
    return {
      error: {
        code: "agent_threw",
        message: e instanceof Error ? e.message : "에이전트 실행 중 오류",
        retryable: false,
      },
    };
  }

  const artifacts: ArtifactRef[] = [];
  if (result.artifact) {
    artifacts.push(await ctx.artifacts.create(result.artifact));
  }

  return {
    message: result.message,
    surface_patches: result.patches,
    artifacts: artifacts.length ? artifacts : undefined,
  };
}
