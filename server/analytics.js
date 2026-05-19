// Aggregation + KPI computation over a { columns, rows } dataset.

export function isNumericColumn(rows, col) {
  let seen = 0;
  for (const row of rows) {
    const v = row[col];
    if (v === null || v === undefined || v === '') continue;
    if (typeof v !== 'number' || Number.isNaN(v)) return false;
    seen++;
  }
  return seen > 0;
}

export function numericColumns(dataset) {
  return dataset.columns.filter(c => isNumericColumn(dataset.rows, c));
}

export function categoricalColumns(dataset) {
  const nums = new Set(numericColumns(dataset));
  return dataset.columns.filter(c => !nums.has(c));
}

function stats(rows, col) {
  const vals = rows.map(r => r[col]).filter(v => typeof v === 'number' && !Number.isNaN(v));
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

// Group `measure` by `dimension` using sum|avg, preserving first-seen order.
export function aggregateBy(dataset, dimension, measure, agg = 'sum') {
  const acc = new Map();
  for (const row of dataset.rows) {
    const key = String(row[dimension]);
    const val = typeof row[measure] === 'number' ? row[measure] : 0;
    const entry = acc.get(key) ?? { sum: 0, n: 0 };
    entry.sum += val;
    entry.n += 1;
    acc.set(key, entry);
  }
  const labels = [...acc.keys()];
  const values = labels.map(k => {
    const e = acc.get(k);
    return agg === 'avg' ? e.sum / e.n : e.sum;
  });
  return { labels, values };
}

export function summarize(dataset) {
  const nums = numericColumns(dataset);
  const cats = categoricalColumns(dataset);

  const numericStats = {};
  for (const c of nums) numericStats[c] = stats(dataset.rows, c);

  const categories = {};
  for (const c of cats) {
    const counts = new Map();
    for (const row of dataset.rows) {
      const k = String(row[c]);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    categories[c] = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([value, count]) => ({ value, count }));
  }

  // Headline KPI cards: row count, then sum/avg of the leading numeric columns.
  const headline = [{ label: '행 수', value: dataset.rows.length, unit: '행' }];
  for (const c of nums.slice(0, 3)) {
    headline.push({ label: `${c} 합계`, value: Math.round(numericStats[c].sum) });
    if (headline.length >= 4) break;
  }
  if (headline.length < 4 && cats.length > 0) {
    const distinct = new Set(dataset.rows.map(r => String(r[cats[0]]))).size;
    headline.push({ label: `${cats[0]} 종류`, value: distinct, unit: '개' });
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
