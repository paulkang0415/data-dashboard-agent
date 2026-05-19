// Aggregation + KPI computation over a Dataset. Pure functions.

import type { Dataset, Kpi, Row } from "../shared/types.js";

export function isNumericColumn(rows: Row[], col: string): boolean {
  let seen = 0;
  for (const row of rows) {
    const v = row[col];
    if (v === null || v === undefined || v === "") continue;
    if (typeof v !== "number" || Number.isNaN(v)) return false;
    seen++;
  }
  return seen > 0;
}

export function numericColumns(dataset: Dataset): string[] {
  return dataset.columns.filter((c) => isNumericColumn(dataset.rows, c));
}

export function categoricalColumns(dataset: Dataset): string[] {
  const nums = new Set(numericColumns(dataset));
  return dataset.columns.filter((c) => !nums.has(c));
}

export interface ColumnStats {
  sum: number;
  avg: number;
  min: number;
  max: number;
  count: number;
}

function stats(rows: Row[], col: string): ColumnStats {
  const vals = rows
    .map((r) => r[col])
    .filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
  if (vals.length === 0) return { sum: 0, avg: 0, min: 0, max: 0, count: 0 };
  const sum = vals.reduce((a, b) => a + b, 0);
  return {
    sum,
    avg: sum / vals.length,
    min: Math.min(...vals),
    max: Math.max(...vals),
    count: vals.length,
  };
}

export interface Aggregation {
  labels: string[];
  values: number[];
}

// Group `measure` by `dimension` using sum|avg, preserving first-seen order.
export function aggregateBy(
  dataset: Dataset,
  dimension: string,
  measure: string,
  agg: "sum" | "avg" = "sum",
): Aggregation {
  const acc = new Map<string, { sum: number; n: number }>();
  for (const row of dataset.rows) {
    const key = String(row[dimension]);
    const raw = row[measure];
    const val = typeof raw === "number" ? raw : 0;
    const entry = acc.get(key) ?? { sum: 0, n: 0 };
    entry.sum += val;
    entry.n += 1;
    acc.set(key, entry);
  }
  const labels = [...acc.keys()];
  const values = labels.map((k) => {
    const e = acc.get(k)!;
    return agg === "avg" ? e.sum / e.n : e.sum;
  });
  return { labels, values };
}

export interface Summary {
  rowCount: number;
  numericColumns: string[];
  categoricalColumns: string[];
  numericStats: Record<string, ColumnStats>;
  categories: Record<string, Array<{ value: string; count: number }>>;
  headlineKpis: Kpi[];
}

export function summarize(dataset: Dataset): Summary {
  const nums = numericColumns(dataset);
  const cats = categoricalColumns(dataset);

  const numericStats: Record<string, ColumnStats> = {};
  for (const c of nums) numericStats[c] = stats(dataset.rows, c);

  const categories: Record<string, Array<{ value: string; count: number }>> =
    {};
  for (const c of cats) {
    const counts = new Map<string, number>();
    for (const row of dataset.rows) {
      const k = String(row[c]);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    categories[c] = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([value, count]) => ({ value, count }));
  }

  // Headline KPI cards: row count, then sum of the leading numeric columns.
  const headline: Kpi[] = [
    { label: "행 수", value: dataset.rows.length, unit: "행" },
  ];
  for (const c of nums.slice(0, 3)) {
    headline.push({ label: `${c} 합계`, value: Math.round(numericStats[c].sum) });
    if (headline.length >= 4) break;
  }
  if (headline.length < 4 && cats.length > 0) {
    const distinct = new Set(dataset.rows.map((r) => String(r[cats[0]]))).size;
    headline.push({ label: `${cats[0]} 종류`, value: distinct, unit: "개" });
  }

  return {
    rowCount: dataset.rows.length,
    numericColumns: nums,
    categoricalColumns: cats,
    numericStats,
    categories,
    headlineKpis: headline.slice(0, 4),
  };
}
