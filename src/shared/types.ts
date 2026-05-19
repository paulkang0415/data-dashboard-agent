// Domain types shared by the Agent Function and the Surface.

export type Cell = string | number | null;
export type Row = Record<string, Cell>;

export type DatasetSource = "sample" | "upload";

export interface Dataset {
  id: string;
  name: string;
  description: string;
  source: DatasetSource;
  columns: string[];
  rows: Row[];
}

/** Lightweight dataset listing (no rows) kept in Session State for the sidebar. */
export interface DatasetMeta {
  id: string;
  name: string;
  description: string;
  source: DatasetSource;
  columns: string[];
  rowCount: number;
}

export interface Kpi {
  label: string;
  value: number;
  unit?: string;
}

export type ChartType = "line" | "bar" | "kpi";

export interface ChartSeries {
  label: string;
  data: number[];
}

export interface ChartSpec {
  type: ChartType;
  title: string;
  labels: string[];
  series: ChartSeries[];
  indexAxis?: "x" | "y";
  kpis?: Kpi[];
  note: string;
}

/** Single JSON document — the AgentHub Session State (§13). */
export interface SessionState {
  datasets: DatasetMeta[];
  /** datasetId -> rows. Kept in state so the Surface can render offline. */
  data: Record<string, Row[]>;
  activeDatasetId: string | null;
  chart: ChartSpec | null;
  kpis: Kpi[];
  note: string;
}

/** Run input — discriminated by `action` (§10.2). */
export type AgentInput =
  | { action: "init" }
  | { action: "select"; datasetId: string }
  | { action: "ingest"; fileId: string; name?: string; format?: "csv" | "json" }
  | { action: "query"; prompt: string; datasetId?: string };
