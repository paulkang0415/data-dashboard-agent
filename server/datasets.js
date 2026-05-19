import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');

// Coerce a raw string cell into a number when it cleanly parses, else trim it.
function coerce(value) {
  const v = value.trim();
  if (v === '') return null;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

// Minimal CSV parser with double-quote support (enough for tabular sample data).
export function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter(l => l.length > 0);
  if (lines.length === 0) return { columns: [], rows: [] };

  const splitLine = line => {
    const out = [];
    let cur = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') quoted = false;
        else cur += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ',') { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  };

  const columns = splitLine(lines[0]).map(c => c.trim());
  const rows = lines.slice(1).map(line => {
    const cells = splitLine(line);
    const row = {};
    columns.forEach((col, i) => { row[col] = coerce(cells[i] ?? ''); });
    return row;
  });
  return { columns, rows };
}

// Accept either { columns, rows } or a bare array of row objects.
function normalizeJSON(parsed) {
  if (Array.isArray(parsed)) {
    const columns = parsed.length ? Object.keys(parsed[0]) : [];
    return { columns, rows: parsed };
  }
  if (parsed && Array.isArray(parsed.rows)) {
    const columns = parsed.columns ?? (parsed.rows.length ? Object.keys(parsed.rows[0]) : []);
    return { columns, rows: parsed.rows };
  }
  throw new Error('지원하지 않는 JSON 구조입니다. 배열 또는 { columns, rows } 형태여야 합니다.');
}

const SAMPLE_META = {
  sales: { name: '월별 매출', description: '지역별 월간 매출·주문 수' },
  retention: { name: '사용자 이탈 퍼널', description: '온보딩부터 유료 전환까지 단계별 사용자 수' },
  traffic: { name: '웹 트래픽', description: '채널별 일간 세션·이탈률' },
};

const datasets = new Map();

function register(id, name, description, source, parsed) {
  datasets.set(id, { id, name, description, source, columns: parsed.columns, rows: parsed.rows });
}

export function loadSampleDatasets() {
  for (const file of readdirSync(DATA_DIR)) {
    const id = basename(file, extname(file));
    const ext = extname(file).toLowerCase();
    const raw = readFileSync(join(DATA_DIR, file), 'utf8');
    const parsed = ext === '.json' ? normalizeJSON(JSON.parse(raw)) : parseCSV(raw);
    const meta = SAMPLE_META[id] ?? { name: id, description: '샘플 데이터셋' };
    register(id, meta.name, meta.description, 'sample', parsed);
  }
}

let uploadSeq = 0;

export function addUpload({ name, format, content }) {
  if (typeof content !== 'string' || content.trim() === '') {
    throw new Error('content가 비어 있습니다.');
  }
  const fmt = (format || '').toLowerCase();
  let parsed;
  if (fmt === 'json') parsed = normalizeJSON(JSON.parse(content));
  else if (fmt === 'csv') parsed = parseCSV(content);
  else throw new Error('format은 "csv" 또는 "json"이어야 합니다.');

  if (parsed.rows.length === 0) throw new Error('데이터 행이 없습니다.');

  const id = `upload-${++uploadSeq}`;
  register(id, name?.trim() || `업로드 ${uploadSeq}`, '업로드한 데이터셋', 'upload', parsed);
  return datasets.get(id);
}

export function listDatasets() {
  return [...datasets.values()].map(d => ({
    id: d.id,
    name: d.name,
    description: d.description,
    source: d.source,
    rows: d.rows.length,
    columns: d.columns,
  }));
}

export function getDataset(id) {
  return datasets.get(id) ?? null;
}
