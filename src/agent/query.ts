// Natural-language → ChartSpec.
//
// `interpret()` is the deterministic rule-based path (also the fallback when
// the LLM Gateway is unavailable or returns an invalid response, §10.4).
// `buildChart()` turns a resolved intent (from the LLM) into a ChartSpec.

import type { ChartSpec, ChartType, Dataset } from "../shared/types.js";
import {
  aggregateBy,
  categoricalColumns,
  numericColumns,
  summarize,
} from "./analytics.js";

function pickColumn(
  columns: string[],
  hints: string[],
  fallback: string,
): string {
  for (const h of hints) {
    const hit = columns.find((c) => c.toLowerCase().includes(h));
    if (hit) return hit;
  }
  return fallback;
}

const TIME_HINTS = [
  "month",
  "월",
  "date",
  "날짜",
  "일자",
  "time",
  "period",
  "분기",
];
const MEASURE_HINTS = [
  "revenue",
  "매출",
  "sales",
  "판매",
  "amount",
  "sessions",
  "세션",
  "users",
  "사용자",
  "count",
  "orders",
  "주문",
];

export interface ChartIntent {
  chartType: ChartType;
  dimension: string;
  measure: string;
  title?: string;
}

/** Build a ChartSpec from a (validated) intent. */
export function buildChart(dataset: Dataset, intent: ChartIntent): ChartSpec {
  const { chartType, dimension, measure } = intent;
  const sum = summarize(dataset);

  if (chartType === "kpi") {
    const agg = measure
      ? aggregateBy(dataset, dimension, measure, "sum")
      : { labels: [], values: [] };
    return {
      type: "kpi",
      title: intent.title ?? "핵심 KPI 요약",
      kpis: sum.headlineKpis,
      labels: agg.labels,
      series: measure ? [{ label: measure, data: agg.values }] : [],
      note: measure ? `${dimension}별 ${measure} 분포 포함` : "KPI 카드만 표시",
    };
  }

  const { labels, values } = aggregateBy(dataset, dimension, measure, "sum");

  if (chartType === "line") {
    return {
      type: "line",
      title: intent.title ?? `${dimension} 기준 ${measure} 추이`,
      labels,
      series: [{ label: measure, data: values }],
      note: `${dimension}별 ${measure} 합계 시계열`,
    };
  }

  // bar — if the dimension looks like funnel stages, annotate retention %.
  const top = values[0] || 1;
  const looksFunnel = labels.length > 0 && labels.length <= 12;
  return {
    type: "bar",
    indexAxis: looksFunnel ? "y" : "x",
    title: intent.title ?? `${dimension}별 ${measure}`,
    labels,
    series: [{ label: measure, data: values }],
    kpis: looksFunnel
      ? labels.map((l, i) => ({
          label: l,
          value: values[i],
          unit: `${((values[i] / top) * 100).toFixed(1)}%`,
        }))
      : undefined,
    note: "범주별 합계",
  };
}

/** Deterministic rule-based interpreter (fallback + offline path). */
export function interpret(prompt: string, dataset: Dataset): ChartSpec {
  const p = (prompt || "").toLowerCase();
  const nums = numericColumns(dataset);
  const cats = categoricalColumns(dataset);
  const sum = summarize(dataset);

  const wantsTrend = /추이|월별|월간|trend|시계열|성장|증가|흐름/.test(p);
  const wantsFunnel = /이탈|퍼널|funnel|구간|retention|단계|전환|drop/.test(p);
  const wantsKpi = /kpi|핵심|요약|지표|summary|대시보드/.test(p);

  if (wantsTrend && nums.length > 0) {
    const dim = pickColumn(
      dataset.columns,
      TIME_HINTS,
      cats[0] ?? dataset.columns[0],
    );
    const measure = pickColumn(nums, MEASURE_HINTS, nums[0]);
    return buildChart(dataset, { chartType: "line", dimension: dim, measure });
  }

  if (wantsFunnel && nums.length > 0) {
    const stageCol = cats[0] ?? dataset.columns[0];
    const measure = pickColumn(
      nums,
      ["users", "사용자", "count", "sessions"],
      nums[0],
    );
    const spec = buildChart(dataset, {
      chartType: "bar",
      dimension: stageCol,
      measure,
      title: `${stageCol} 퍼널 (${measure})`,
    });
    spec.indexAxis = "y";
    spec.note = "상단 단계 대비 잔존율을 함께 표기";
    return spec;
  }

  if (wantsKpi) {
    const dim = cats[0] ?? dataset.columns[0];
    const measure = nums[0] ?? "";
    return buildChart(dataset, {
      chartType: "kpi",
      dimension: dim,
      measure,
      title: "핵심 KPI 요약",
    });
  }

  if (cats.length > 0 && nums.length > 0) {
    return buildChart(dataset, {
      chartType: "bar",
      dimension: cats[0],
      measure: nums[0],
    });
  }

  return {
    type: "kpi",
    title: "요약",
    kpis: sum.headlineKpis,
    labels: [],
    series: [],
    note: "차트로 만들 수치형 컬럼이 없어 KPI만 표시합니다.",
  };
}
