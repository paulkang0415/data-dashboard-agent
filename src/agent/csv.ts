// CSV / JSON parsing — pure, no fs (Agent runs in an isolate, §10.1).

import type { Cell, Row } from "../shared/types.js";

export interface ParsedTable {
  columns: string[];
  rows: Row[];
}

function coerce(value: string): Cell {
  const v = value.trim();
  if (v === "") return null;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

// Minimal CSV parser with double-quote support.
export function parseCSV(text: string): ParsedTable {
  const lines = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((l) => l.length > 0);
  if (lines.length === 0) return { columns: [], rows: [] };

  const splitLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') {
          quoted = false;
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        quoted = true;
      } else if (ch === ",") {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  };

  const columns = splitLine(lines[0]).map((c) => c.trim());
  const rows: Row[] = lines.slice(1).map((line) => {
    const cells = splitLine(line);
    const row: Row = {};
    columns.forEach((col, i) => {
      row[col] = coerce(cells[i] ?? "");
    });
    return row;
  });
  return { columns, rows };
}

// Accept either { columns, rows } or a bare array of row objects.
export function normalizeJSON(parsed: unknown): ParsedTable {
  if (Array.isArray(parsed)) {
    const rows = parsed as Row[];
    const columns = rows.length ? Object.keys(rows[0]) : [];
    return { columns, rows };
  }
  if (
    parsed &&
    typeof parsed === "object" &&
    Array.isArray((parsed as { rows?: unknown }).rows)
  ) {
    const obj = parsed as { columns?: string[]; rows: Row[] };
    const columns =
      obj.columns ?? (obj.rows.length ? Object.keys(obj.rows[0]) : []);
    return { columns, rows: obj.rows };
  }
  throw new Error(
    "지원하지 않는 JSON 구조입니다. 배열 또는 { columns, rows } 형태여야 합니다.",
  );
}

export function parseContent(
  content: string,
  format: "csv" | "json",
): ParsedTable {
  if (format === "json") return normalizeJSON(JSON.parse(content));
  return parseCSV(content);
}
