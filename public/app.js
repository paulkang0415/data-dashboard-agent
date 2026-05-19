const state = { datasets: [], currentId: null, chart: null };

const $ = sel => document.querySelector(sel);

function fmt(n) {
  if (typeof n !== 'number') return n;
  if (Math.abs(n) >= 1e8) return (n / 1e8).toFixed(1) + '억';
  if (Math.abs(n) >= 1e4) return (n / 1e4).toFixed(1) + '만';
  return n.toLocaleString('ko-KR');
}

async function api(path, opts) {
  const res = await fetch(path, opts);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || `요청 실패 (${res.status})`);
  return body;
}

function renderDatasetList() {
  const ul = $('#dataset-list');
  ul.innerHTML = '';
  for (const d of state.datasets) {
    const li = document.createElement('li');
    li.className = 'dataset-item' + (d.id === state.currentId ? ' active' : '');
    li.innerHTML = `
      <div class="dataset-item__name">${d.name}
        <span class="dataset-item__src">${d.source === 'upload' ? '업로드' : '샘플'}</span>
      </div>
      <div class="dataset-item__meta">${d.rows}행 · ${d.columns.length}열</div>`;
    li.onclick = () => selectDataset(d.id);
    ul.appendChild(li);
  }
}

function renderKpis(kpis) {
  const row = $('#kpi-row');
  row.innerHTML = '';
  for (const k of kpis || []) {
    const card = document.createElement('div');
    card.className = 'kpi-card';
    card.innerHTML = `
      <div class="kpi-card__val">${fmt(k.value)}${k.unit ? `<span class="kpi-card__unit">${k.unit}</span>` : ''}</div>
      <div class="kpi-card__label">${k.label}</div>`;
    row.appendChild(card);
  }
}

function showEmpty(show) {
  $('#empty-state').classList.toggle('hidden', !show);
  $('.chart-wrap').classList.toggle('hidden', show);
}

function renderChart(spec) {
  $('#chart-title').textContent = spec.title || '차트';
  $('#chart-note').textContent = spec.note || '';
  if (spec.kpis && spec.kpis.length) renderKpis(spec.kpis);

  const hasSeries = spec.series && spec.series.length && spec.labels && spec.labels.length;
  if (!hasSeries) { showEmpty(true); if (state.chart) { state.chart.destroy(); state.chart = null; } return; }
  showEmpty(false);

  const palette = ['#5b8cff', '#3fcf8e', '#ffb454', '#ff6b6b', '#a78bfa'];
  const config = {
    type: spec.type === 'line' ? 'line' : 'bar',
    data: {
      labels: spec.labels,
      datasets: spec.series.map((s, i) => ({
        label: s.label,
        data: s.data,
        backgroundColor: spec.type === 'line' ? 'transparent' : palette[i % palette.length],
        borderColor: palette[i % palette.length],
        borderWidth: 2,
        tension: 0.3,
        pointRadius: spec.type === 'line' ? 3 : 0,
        borderRadius: 5,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: spec.indexAxis === 'y' ? 'y' : 'x',
      plugins: {
        legend: { labels: { color: '#9aa0ad' } },
        tooltip: { callbacks: { label: c => `${c.dataset.label}: ${fmt(c.parsed[spec.indexAxis === 'y' ? 'x' : 'y'])}` } },
      },
      scales: {
        x: { ticks: { color: '#9aa0ad' }, grid: { color: '#2a2f3c' } },
        y: { ticks: { color: '#9aa0ad', callback: v => fmt(v) }, grid: { color: '#2a2f3c' } },
      },
    },
  };

  if (state.chart) state.chart.destroy();
  state.chart = new Chart($('#chart'), config);
}

async function selectDataset(id) {
  state.currentId = id;
  renderDatasetList();
  const ds = state.datasets.find(d => d.id === id);
  $('#ds-name').textContent = ds.name;
  $('#ds-desc').textContent = `${ds.description || ''} · ${ds.columns.join(', ')}`;
  const { summary } = await api(`/api/datasets/${id}/summary`);
  renderKpis(summary.headlineKpis);
  showEmpty(true);
  $('#chart-title').textContent = '차트';
  $('#chart-note').textContent = '';
}

async function runQuery(prompt) {
  if (!state.currentId) { alert('먼저 데이터셋을 선택하세요.'); return; }
  if (!prompt.trim()) return;
  $('#prompt-send').disabled = true;
  try {
    const { spec } = await api('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ datasetId: state.currentId, prompt }),
    });
    renderChart(spec);
  } catch (e) {
    alert(e.message);
  } finally {
    $('#prompt-send').disabled = false;
  }
}

async function handleUpload(file) {
  const msg = $('#upload-msg');
  try {
    const content = await file.text();
    const format = file.name.toLowerCase().endsWith('.json') ? 'json' : 'csv';
    const { dataset } = await api('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: file.name.replace(/\.[^.]+$/, ''), format, content }),
    });
    msg.textContent = `"${dataset.name}" 등록됨 (${dataset.rows}행)`;
    msg.className = 'upload-msg ok';
    await loadDatasets();
    selectDataset(dataset.id);
  } catch (e) {
    msg.textContent = e.message;
    msg.className = 'upload-msg err';
  }
}

async function loadDatasets() {
  const { datasets } = await api('/api/datasets');
  state.datasets = datasets;
  renderDatasetList();
}

function bindEvents() {
  $('#prompt-send').onclick = () => runQuery($('#prompt-input').value);
  $('#prompt-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') runQuery($('#prompt-input').value);
  });
  document.querySelectorAll('.chip').forEach(c => {
    c.onclick = () => { $('#prompt-input').value = c.textContent.trim(); runQuery(c.textContent.trim()); };
  });
  $('#file-input').onchange = e => { if (e.target.files[0]) handleUpload(e.target.files[0]); };
}

(async function init() {
  bindEvents();
  await loadDatasets();
  if (state.datasets.length) selectDataset(state.datasets[0].id);
})();
