// Unit tests for the pure agent logic (§18.3 "테스트 실행").
// Only imports leaf modules with no @agenthub/* runtime deps.

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCSV, normalizeJSON } from "../src/agent/csv.js";
import { summarize, numericColumns } from "../src/agent/analytics.js";
import { interpret, buildChart } from "../src/agent/query.js";
import { SAMPLE_DATASETS } from "../src/agent/samples.js";
import type { Dataset } from "../src/shared/types.js";

const sales = SAMPLE_DATASETS.find((d) => d.id === "sales")!;
const retention = SAMPLE_DATASETS.find((d) => d.id === "retention")!;

test("parseCSV coerces numbers and keeps strings", () => {
  const t = parseCSV("a,b\nx,10\ny,20");
  assert.deepEqual(t.columns, ["a", "b"]);
  assert.equal(t.rows.length, 2);
  assert.equal(t.rows[0].a, "x");
  assert.equal(t.rows[0].b, 10);
});

test("normalizeJSON accepts array and {columns,rows}", () => {
  const a = normalizeJSON([{ x: 1 }]);
  assert.deepEqual(a.columns, ["x"]);
  const b = normalizeJSON({ columns: ["x"], rows: [{ x: 1 }] });
  assert.deepEqual(b.columns, ["x"]);
});

test("numericColumns detects numeric vs categorical", () => {
  assert.deepEqual(numericColumns(sales).sort(), ["orders", "revenue"]);
});

test("summarize headline KPIs include row count", () => {
  const s = summarize(sales);
  assert.equal(s.rowCount, 24);
  assert.equal(s.headlineKpis[0].label, "행 수");
  assert.equal(s.headlineKpis[0].value, 24);
});

test("interpret(trend) → line chart over time dimension", () => {
  const spec = interpret("월별 판매량 추이 차트 만들어줘", sales);
  assert.equal(spec.type, "line");
  assert.deepEqual(spec.labels, [
    "2025-01",
    "2025-02",
    "2025-03",
    "2025-04",
    "2025-05",
    "2025-06",
    "2025-07",
    "2025-08",
  ]);
  assert.equal(spec.series[0].data.length, 8);
});

test("interpret(funnel) → horizontal bar with retention KPIs", () => {
  const spec = interpret("사용자 이탈 구간 분석해줘", retention);
  assert.equal(spec.type, "bar");
  assert.equal(spec.indexAxis, "y");
  assert.ok(spec.kpis && spec.kpis.length === 6);
  assert.equal(spec.kpis![0].unit, "100.0%");
});

test("interpret(kpi) → kpi spec with headline cards", () => {
  const spec = interpret("핵심 KPI 요약 대시보드 구성해줘", sales);
  assert.equal(spec.type, "kpi");
  assert.ok(spec.kpis && spec.kpis.length > 0);
});

test("buildChart respects an explicit intent", () => {
  const spec = buildChart(sales, {
    chartType: "bar",
    dimension: "region",
    measure: "revenue",
  });
  assert.equal(spec.type, "bar");
  assert.deepEqual(spec.labels, ["서울", "부산", "온라인"]);
  assert.equal(spec.series[0].data.length, 3);
});

test("empty-ish dataset falls back to kpi", () => {
  const empty: Dataset = {
    id: "e",
    name: "e",
    description: "",
    source: "upload",
    columns: ["label"],
    rows: [{ label: "only-text" }],
  };
  const spec = interpret("아무거나", empty);
  assert.equal(spec.type, "kpi");
});
