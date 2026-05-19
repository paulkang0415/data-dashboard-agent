import express from 'express';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadSampleDatasets,
  listDatasets,
  getDataset,
  addUpload,
} from './datasets.js';
import { summarize } from './analytics.js';
import { interpret } from './query.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');
const PORT = Number(process.env.PORT) || 4000;

loadSampleDatasets();

const app = express();
app.use(express.json({ limit: '8mb' }));
app.use(express.static(PUBLIC_DIR));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'data-dashboard-agent', datasets: listDatasets().length });
});

app.get('/api/datasets', (_req, res) => {
  res.json({ datasets: listDatasets() });
});

app.get('/api/datasets/:id', (req, res) => {
  const ds = getDataset(req.params.id);
  if (!ds) return res.status(404).json({ error: '데이터셋을 찾을 수 없습니다.' });
  res.json(ds);
});

app.get('/api/datasets/:id/summary', (req, res) => {
  const ds = getDataset(req.params.id);
  if (!ds) return res.status(404).json({ error: '데이터셋을 찾을 수 없습니다.' });
  res.json({ id: ds.id, name: ds.name, summary: summarize(ds) });
});

app.post('/api/query', (req, res) => {
  const { datasetId, prompt } = req.body ?? {};
  const ds = getDataset(datasetId);
  if (!ds) return res.status(404).json({ error: '데이터셋을 찾을 수 없습니다.' });
  if (!prompt || !String(prompt).trim()) {
    return res.status(400).json({ error: 'prompt가 필요합니다.' });
  }
  res.json({ datasetId, prompt, spec: interpret(String(prompt), ds) });
});

app.post('/api/upload', (req, res) => {
  try {
    const ds = addUpload(req.body ?? {});
    res.status(201).json({
      dataset: {
        id: ds.id,
        name: ds.name,
        rows: ds.rows.length,
        columns: ds.columns,
      },
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.use((err, _req, res, _next) => {
  res.status(500).json({ error: err.message || '서버 오류' });
});

app.listen(PORT, () => {
  console.log(`데이터 대시보드 에이전트 → http://localhost:${PORT}`);
});
