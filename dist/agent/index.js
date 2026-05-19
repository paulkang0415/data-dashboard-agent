// src/agent/samples.ts
function rows(arr) {
  return arr;
}
var REGIONS = ["\uC11C\uC6B8", "\uBD80\uC0B0", "\uC628\uB77C\uC778"];
var MONTHS = [
  "2025-01",
  "2025-02",
  "2025-03",
  "2025-04",
  "2025-05",
  "2025-06",
  "2025-07",
  "2025-08"
];
var SALES_TABLE = {
  // month: [서울[rev,ord], 부산[rev,ord], 온라인[rev,ord]]
  "2025-01": [
    [482e5, 1240],
    [215e5, 610],
    [638e5, 2180]
  ],
  "2025-02": [
    [511e5, 1310],
    [198e5, 560],
    [674e5, 2320]
  ],
  "2025-03": [
    [556e5, 1425],
    [239e5, 690],
    [721e5, 2510]
  ],
  "2025-04": [
    [532e5, 1360],
    [254e5, 742],
    [758e5, 2660]
  ],
  "2025-05": [
    [589e5, 1502],
    [271e5, 805],
    [812e5, 2890]
  ],
  "2025-06": [
    [613e5, 1588],
    [268e5, 790],
    [865e5, 3104]
  ],
  "2025-07": [
    [597e5, 1540],
    [283e5, 838],
    [901e5, 3260]
  ],
  "2025-08": [
    [645e5, 1672],
    [301e5, 902],
    [947e5, 3438]
  ]
};
var salesRows = [];
for (const m of MONTHS) {
  REGIONS.forEach((region, i) => {
    const [revenue, orders] = SALES_TABLE[m][i];
    salesRows.push({ month: m, region, revenue, orders });
  });
}
var SAMPLE_DATASETS = [
  {
    id: "sales",
    name: "\uC6D4\uBCC4 \uB9E4\uCD9C",
    description: "\uC9C0\uC5ED\uBCC4 \uC6D4\uAC04 \uB9E4\uCD9C\xB7\uC8FC\uBB38 \uC218",
    source: "sample",
    columns: ["month", "region", "revenue", "orders"],
    rows: salesRows
  },
  {
    id: "retention",
    name: "\uC0AC\uC6A9\uC790 \uC774\uD0C8 \uD37C\uB110",
    description: "\uC628\uBCF4\uB529\uBD80\uD130 \uC720\uB8CC \uC804\uD658\uAE4C\uC9C0 \uB2E8\uACC4\uBCC4 \uC0AC\uC6A9\uC790 \uC218",
    source: "sample",
    columns: ["stage", "users"],
    rows: rows([
      { stage: "\uBC29\uBB38", users: 48200 },
      { stage: "\uD68C\uC6D0\uAC00\uC785", users: 18640 },
      { stage: "\uC628\uBCF4\uB529 \uC644\uB8CC", users: 11280 },
      { stage: "\uCCAB \uC561\uC158", users: 7420 },
      { stage: "\uC7AC\uBC29\uBB38(7\uC77C)", users: 3960 },
      { stage: "\uC720\uB8CC \uC804\uD658", users: 1180 }
    ])
  },
  {
    id: "traffic",
    name: "\uC6F9 \uD2B8\uB798\uD53D",
    description: "\uCC44\uB110\uBCC4 \uC77C\uAC04 \uC138\uC158\xB7\uC774\uD0C8\uB960",
    source: "sample",
    columns: ["date", "channel", "sessions", "bounceRate"],
    rows: rows([
      { date: "2025-08-01", channel: "\uAC80\uC0C9", sessions: 5240, bounceRate: 0.38 },
      { date: "2025-08-01", channel: "\uC18C\uC15C", sessions: 3110, bounceRate: 0.52 },
      { date: "2025-08-01", channel: "\uC9C1\uC811", sessions: 2480, bounceRate: 0.29 },
      { date: "2025-08-02", channel: "\uAC80\uC0C9", sessions: 5610, bounceRate: 0.36 },
      { date: "2025-08-02", channel: "\uC18C\uC15C", sessions: 3580, bounceRate: 0.49 },
      { date: "2025-08-02", channel: "\uC9C1\uC811", sessions: 2390, bounceRate: 0.31 },
      { date: "2025-08-03", channel: "\uAC80\uC0C9", sessions: 6020, bounceRate: 0.34 },
      { date: "2025-08-03", channel: "\uC18C\uC15C", sessions: 4120, bounceRate: 0.47 },
      { date: "2025-08-03", channel: "\uC9C1\uC811", sessions: 2710, bounceRate: 0.27 },
      { date: "2025-08-04", channel: "\uAC80\uC0C9", sessions: 5890, bounceRate: 0.35 },
      { date: "2025-08-04", channel: "\uC18C\uC15C", sessions: 3960, bounceRate: 0.5 },
      { date: "2025-08-04", channel: "\uC9C1\uC811", sessions: 2880, bounceRate: 0.26 }
    ])
  }
];

// src/agent/analytics.ts
function isNumericColumn(rows2, col) {
  let seen = 0;
  for (const row of rows2) {
    const v = row[col];
    if (v === null || v === void 0 || v === "") continue;
    if (typeof v !== "number" || Number.isNaN(v)) return false;
    seen++;
  }
  return seen > 0;
}
function numericColumns(dataset) {
  return dataset.columns.filter((c) => isNumericColumn(dataset.rows, c));
}
function categoricalColumns(dataset) {
  const nums = new Set(numericColumns(dataset));
  return dataset.columns.filter((c) => !nums.has(c));
}
function stats(rows2, col) {
  const vals = rows2.map((r) => r[col]).filter((v) => typeof v === "number" && !Number.isNaN(v));
  if (vals.length === 0) return { sum: 0, avg: 0, min: 0, max: 0, count: 0 };
  const sum = vals.reduce((a, b) => a + b, 0);
  return {
    sum,
    avg: sum / vals.length,
    min: Math.min(...vals),
    max: Math.max(...vals),
    count: vals.length
  };
}
function aggregateBy(dataset, dimension, measure, agg = "sum") {
  const acc = /* @__PURE__ */ new Map();
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
    const e = acc.get(k);
    return agg === "avg" ? e.sum / e.n : e.sum;
  });
  return { labels, values };
}
function summarize(dataset) {
  const nums = numericColumns(dataset);
  const cats = categoricalColumns(dataset);
  const numericStats = {};
  for (const c of nums) numericStats[c] = stats(dataset.rows, c);
  const categories = {};
  for (const c of cats) {
    const counts = /* @__PURE__ */ new Map();
    for (const row of dataset.rows) {
      const k = String(row[c]);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    categories[c] = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([value, count]) => ({ value, count }));
  }
  const headline = [
    { label: "\uD589 \uC218", value: dataset.rows.length, unit: "\uD589" }
  ];
  for (const c of nums.slice(0, 3)) {
    headline.push({ label: `${c} \uD569\uACC4`, value: Math.round(numericStats[c].sum) });
    if (headline.length >= 4) break;
  }
  if (headline.length < 4 && cats.length > 0) {
    const distinct = new Set(dataset.rows.map((r) => String(r[cats[0]]))).size;
    headline.push({ label: `${cats[0]} \uC885\uB958`, value: distinct, unit: "\uAC1C" });
  }
  return {
    rowCount: dataset.rows.length,
    numericColumns: nums,
    categoricalColumns: cats,
    numericStats,
    categories,
    headlineKpis: headline.slice(0, 4)
  };
}

// src/agent/csv.ts
function coerce(value) {
  const v = value.trim();
  if (v === "") return null;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter((l) => l.length > 0);
  if (lines.length === 0) return { columns: [], rows: [] };
  const splitLine = (line) => {
    const out = [];
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
  const rows2 = lines.slice(1).map((line) => {
    const cells = splitLine(line);
    const row = {};
    columns.forEach((col, i) => {
      row[col] = coerce(cells[i] ?? "");
    });
    return row;
  });
  return { columns, rows: rows2 };
}
function normalizeJSON(parsed) {
  if (Array.isArray(parsed)) {
    const rows2 = parsed;
    const columns = rows2.length ? Object.keys(rows2[0]) : [];
    return { columns, rows: rows2 };
  }
  if (parsed && typeof parsed === "object" && Array.isArray(parsed.rows)) {
    const obj = parsed;
    const columns = obj.columns ?? (obj.rows.length ? Object.keys(obj.rows[0]) : []);
    return { columns, rows: obj.rows };
  }
  throw new Error(
    "\uC9C0\uC6D0\uD558\uC9C0 \uC54A\uB294 JSON \uAD6C\uC870\uC785\uB2C8\uB2E4. \uBC30\uC5F4 \uB610\uB294 { columns, rows } \uD615\uD0DC\uC5EC\uC57C \uD569\uB2C8\uB2E4."
  );
}
function parseContent(content, format) {
  if (format === "json") return normalizeJSON(JSON.parse(content));
  return parseCSV(content);
}

// src/agent/query.ts
function pickColumn(columns, hints, fallback) {
  for (const h of hints) {
    const hit = columns.find((c) => c.toLowerCase().includes(h));
    if (hit) return hit;
  }
  return fallback;
}
var TIME_HINTS = [
  "month",
  "\uC6D4",
  "date",
  "\uB0A0\uC9DC",
  "\uC77C\uC790",
  "time",
  "period",
  "\uBD84\uAE30"
];
var MEASURE_HINTS = [
  "revenue",
  "\uB9E4\uCD9C",
  "sales",
  "\uD310\uB9E4",
  "amount",
  "sessions",
  "\uC138\uC158",
  "users",
  "\uC0AC\uC6A9\uC790",
  "count",
  "orders",
  "\uC8FC\uBB38"
];
function buildChart(dataset, intent) {
  const { chartType, dimension, measure } = intent;
  const sum = summarize(dataset);
  if (chartType === "kpi") {
    const agg = measure ? aggregateBy(dataset, dimension, measure, "sum") : { labels: [], values: [] };
    return {
      type: "kpi",
      title: intent.title ?? "\uD575\uC2EC KPI \uC694\uC57D",
      kpis: sum.headlineKpis,
      labels: agg.labels,
      series: measure ? [{ label: measure, data: agg.values }] : [],
      note: measure ? `${dimension}\uBCC4 ${measure} \uBD84\uD3EC \uD3EC\uD568` : "KPI \uCE74\uB4DC\uB9CC \uD45C\uC2DC"
    };
  }
  const { labels, values } = aggregateBy(dataset, dimension, measure, "sum");
  if (chartType === "line") {
    return {
      type: "line",
      title: intent.title ?? `${dimension} \uAE30\uC900 ${measure} \uCD94\uC774`,
      labels,
      series: [{ label: measure, data: values }],
      note: `${dimension}\uBCC4 ${measure} \uD569\uACC4 \uC2DC\uACC4\uC5F4`
    };
  }
  const top = values[0] || 1;
  const looksFunnel = labels.length > 0 && labels.length <= 12;
  return {
    type: "bar",
    indexAxis: looksFunnel ? "y" : "x",
    title: intent.title ?? `${dimension}\uBCC4 ${measure}`,
    labels,
    series: [{ label: measure, data: values }],
    kpis: looksFunnel ? labels.map((l, i) => ({
      label: l,
      value: values[i],
      unit: `${(values[i] / top * 100).toFixed(1)}%`
    })) : void 0,
    note: "\uBC94\uC8FC\uBCC4 \uD569\uACC4"
  };
}
function interpret(prompt, dataset) {
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
      cats[0] ?? dataset.columns[0]
    );
    const measure = pickColumn(nums, MEASURE_HINTS, nums[0]);
    return buildChart(dataset, { chartType: "line", dimension: dim, measure });
  }
  if (wantsFunnel && nums.length > 0) {
    const stageCol = cats[0] ?? dataset.columns[0];
    const measure = pickColumn(
      nums,
      ["users", "\uC0AC\uC6A9\uC790", "count", "sessions"],
      nums[0]
    );
    const spec = buildChart(dataset, {
      chartType: "bar",
      dimension: stageCol,
      measure,
      title: `${stageCol} \uD37C\uB110 (${measure})`
    });
    spec.indexAxis = "y";
    spec.note = "\uC0C1\uB2E8 \uB2E8\uACC4 \uB300\uBE44 \uC794\uC874\uC728\uC744 \uD568\uAED8 \uD45C\uAE30";
    return spec;
  }
  if (wantsKpi) {
    const dim = cats[0] ?? dataset.columns[0];
    const measure = nums[0] ?? "";
    return buildChart(dataset, {
      chartType: "kpi",
      dimension: dim,
      measure,
      title: "\uD575\uC2EC KPI \uC694\uC57D"
    });
  }
  if (cats.length > 0 && nums.length > 0) {
    return buildChart(dataset, {
      chartType: "bar",
      dimension: cats[0],
      measure: nums[0]
    });
  }
  return {
    type: "kpi",
    title: "\uC694\uC57D",
    kpis: sum.headlineKpis,
    labels: [],
    series: [],
    note: "\uCC28\uD2B8\uB85C \uB9CC\uB4E4 \uC218\uCE58\uD615 \uCEEC\uB7FC\uC774 \uC5C6\uC5B4 KPI\uB9CC \uD45C\uC2DC\uD569\uB2C8\uB2E4."
  };
}

// src/agent/prompts.ts
var chartIntentSchema = {
  type: "object",
  additionalProperties: false,
  required: ["chartType", "dimension", "measure"],
  properties: {
    chartType: {
      enum: ["line", "bar", "kpi"],
      description: "line=\uC2DC\uACC4\uC5F4 \uCD94\uC774, bar=\uBC94\uC8FC \uBE44\uAD50/\uD37C\uB110, kpi=\uD575\uC2EC \uC9C0\uD45C \uC694\uC57D"
    },
    dimension: {
      type: "string",
      description: "x\uCD95/\uADF8\uB8F9 \uAE30\uC900 \uCEEC\uB7FC (\uBC94\uC8FC\uD615 \uB610\uB294 \uC2DC\uAC04\uD615)"
    },
    measure: {
      type: "string",
      description: "\uC9D1\uACC4\uD560 \uC218\uCE58\uD615 \uCEEC\uB7FC"
    },
    title: { type: "string", description: "\uCC28\uD2B8 \uC81C\uBAA9 (\uD55C\uAD6D\uC5B4, \uC120\uD0DD)" }
  }
};
function buildIntentMessages(prompt, dataset) {
  const nums = numericColumns(dataset);
  const cats = categoricalColumns(dataset);
  const sample = dataset.rows.slice(0, 3);
  return [
    {
      role: "system",
      content: "\uB108\uB294 \uB370\uC774\uD130 \uC2DC\uAC01\uD654 \uC5B4\uC2DC\uC2A4\uD134\uD2B8\uB2E4. \uC0AC\uC6A9\uC790\uC758 \uC694\uCCAD\uACFC \uB370\uC774\uD130\uC14B \uC2A4\uD0A4\uB9C8\uB97C \uBCF4\uACE0 \uAC00\uC7A5 \uC801\uC808\uD55C \uCC28\uD2B8 \uC758\uB3C4\uB97C JSON\uC73C\uB85C\uB9CC \uCD9C\uB825\uD55C\uB2E4. dimension/measure\uB294 \uBC18\uB4DC\uC2DC \uC8FC\uC5B4\uC9C4 \uCEEC\uB7FC\uBA85 \uC911\uC5D0\uC11C \uACE0\uB978\uB2E4. measure\uB294 \uC218\uCE58\uD615 \uCEEC\uB7FC\uC774\uC5B4\uC57C \uD55C\uB2E4."
    },
    {
      role: "user",
      content: `\uC694\uCCAD: ${prompt}

\uB370\uC774\uD130\uC14B: ${dataset.name}
\uC804\uCCB4 \uCEEC\uB7FC: ${dataset.columns.join(", ")}
\uC218\uCE58\uD615 \uCEEC\uB7FC: ${nums.join(", ") || "(\uC5C6\uC74C)"}
\uBC94\uC8FC/\uC2DC\uAC04\uD615 \uCEEC\uB7FC: ${cats.join(", ") || "(\uC5C6\uC74C)"}
\uC0D8\uD50C \uD589: ${JSON.stringify(sample)}`
    }
  ];
}

// src/agent/runs.ts
function emptyState() {
  return {
    datasets: [],
    data: {},
    activeDatasetId: null,
    chart: null,
    kpis: [],
    note: ""
  };
}
function metaOf(d) {
  return {
    id: d.id,
    name: d.name,
    description: d.description,
    source: d.source,
    columns: d.columns,
    rowCount: d.rows.length
  };
}
function datasetFromState(state, id) {
  if (!id) return null;
  const meta = state.datasets.find((d) => d.id === id);
  const rows2 = state.data[id];
  if (!meta || !rows2) return null;
  return {
    id: meta.id,
    name: meta.name,
    description: meta.description,
    source: meta.source,
    columns: meta.columns,
    rows: rows2
  };
}
function kpisFor(d) {
  return summarize(d).headlineKpis;
}
function loadDatasetPatches(state, d) {
  const exists = state.datasets.some((m) => m.id === d.id);
  const metaPatch = exists ? {
    op: "replace",
    path: `/datasets/${state.datasets.findIndex((m) => m.id === d.id)}`,
    value: metaOf(d)
  } : { op: "add", path: "/datasets/-", value: metaOf(d) };
  return [
    metaPatch,
    { op: "add", path: `/data/${d.id}`, value: d.rows },
    { op: "replace", path: "/activeDatasetId", value: d.id },
    { op: "replace", path: "/kpis", value: kpisFor(d) },
    { op: "replace", path: "/chart", value: null }
  ];
}
function handleInit(state, samples) {
  if (state.datasets.length > 0) {
    return { message: "\uC774\uBBF8 \uB370\uC774\uD130\uC14B\uC774 \uC788\uC2B5\uB2C8\uB2E4.", patches: [] };
  }
  const active = samples[0];
  const patches = [
    { op: "replace", path: "/datasets", value: samples.map(metaOf) },
    {
      op: "replace",
      path: "/data",
      value: Object.fromEntries(samples.map((d) => [d.id, d.rows]))
    },
    { op: "replace", path: "/activeDatasetId", value: active.id },
    { op: "replace", path: "/kpis", value: kpisFor(active) },
    { op: "replace", path: "/chart", value: null },
    {
      op: "replace",
      path: "/note",
      value: "\uC0D8\uD50C \uB370\uC774\uD130\uC14B\uC744 \uBD88\uB7EC\uC654\uC2B5\uB2C8\uB2E4. \uD504\uB86C\uD504\uD2B8\uB85C \uCC28\uD2B8\uB97C \uC0DD\uC131\uD558\uC138\uC694."
    }
  ];
  return {
    message: `\uC0D8\uD50C \uB370\uC774\uD130\uC14B ${samples.length}\uAC1C\uB97C \uBD88\uB7EC\uC654\uC2B5\uB2C8\uB2E4.`,
    patches
  };
}
function handleSelect(state, datasetId) {
  const d = datasetFromState(state, datasetId);
  if (!d) {
    return { message: `\uB370\uC774\uD130\uC14B\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4: ${datasetId}`, patches: [] };
  }
  return {
    message: `${d.name} \uC120\uD0DD\uB428`,
    patches: [
      { op: "replace", path: "/activeDatasetId", value: d.id },
      { op: "replace", path: "/kpis", value: kpisFor(d) },
      { op: "replace", path: "/chart", value: null }
    ]
  };
}
async function handleIngest(ctx, state, input) {
  const file = await ctx.files.get(input.fileId);
  const text = await ctx.files.read(input.fileId);
  const name = (input.name ?? file.name ?? "\uC5C5\uB85C\uB4DC").replace(/\.[^.]+$/, "");
  const lower = (file.name ?? "").toLowerCase();
  const format = input.format ?? (lower.endsWith(".json") || file.mime === "application/json" ? "json" : "csv");
  const parsed = parseContent(text, format);
  if (parsed.rows.length === 0) {
    return { message: "\uAC00\uC838\uC628 \uD30C\uC77C\uC5D0 \uB370\uC774\uD130 \uD589\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.", patches: [] };
  }
  const uploadCount = state.datasets.filter((d) => d.source === "upload").length;
  const dataset = {
    id: `upload-${uploadCount + 1}`,
    name: name || `\uC5C5\uB85C\uB4DC ${uploadCount + 1}`,
    description: "\uC5C5\uB85C\uB4DC\uD55C \uB370\uC774\uD130\uC14B",
    source: "upload",
    columns: parsed.columns,
    rows: parsed.rows
  };
  return {
    message: `"${dataset.name}" \uB4F1\uB85D\uB428 (${dataset.rows.length}\uD589, ${dataset.columns.length}\uC5F4)`,
    patches: loadDatasetPatches(state, dataset)
  };
}
function isChartIntent(v, columns) {
  if (!v || typeof v !== "object") return false;
  const o = v;
  return (o.chartType === "line" || o.chartType === "bar" || o.chartType === "kpi") && typeof o.dimension === "string" && typeof o.measure === "string" && columns.includes(o.dimension) && columns.includes(o.measure);
}
async function handleQuery(ctx, state, input) {
  const id = input.datasetId ?? state.activeDatasetId;
  const dataset = datasetFromState(state, id);
  if (!dataset) {
    return { message: "\uBA3C\uC800 \uB370\uC774\uD130\uC14B\uC744 \uC120\uD0DD\uD558\uC138\uC694.", patches: [] };
  }
  let spec = null;
  if (!ctx.signal.aborted) {
    try {
      const res = await ctx.llm.generate({
        model: "fast",
        messages: buildIntentMessages(input.prompt, dataset),
        response_format: { type: "json_schema", schema: chartIntentSchema }
      });
      if (isChartIntent(res.output, dataset.columns)) {
        spec = buildChart(dataset, res.output);
      }
    } catch {
      spec = null;
    }
  }
  if (!spec) spec = interpret(input.prompt, dataset);
  const kpis = spec.kpis ?? summarize(dataset).headlineKpis;
  return {
    message: spec.title,
    patches: [
      { op: "replace", path: "/chart", value: spec },
      { op: "replace", path: "/kpis", value: kpis },
      { op: "replace", path: "/note", value: spec.note }
    ],
    artifact: {
      type: "json",
      title: `${spec.title}.json`,
      data: spec
    }
  };
}
async function dispatch(ctx, input, state, samples) {
  switch (input.action) {
    case "init":
      return handleInit(state, samples);
    case "select":
      return handleSelect(state, input.datasetId);
    case "ingest":
      return handleIngest(ctx, state, input);
    case "query":
      return handleQuery(ctx, state, input);
  }
}

// src/agent/index.ts
function parseInput(raw) {
  if (!raw || typeof raw !== "object") return null;
  const o = raw;
  switch (o.action) {
    case "init":
      return { action: "init" };
    case "select":
      return typeof o.datasetId === "string" ? { action: "select", datasetId: o.datasetId } : null;
    case "ingest":
      return typeof o.fileId === "string" ? {
        action: "ingest",
        fileId: o.fileId,
        name: typeof o.name === "string" ? o.name : void 0,
        format: o.format === "csv" || o.format === "json" ? o.format : void 0
      } : null;
    case "query":
      return typeof o.prompt === "string" && o.prompt.trim() ? {
        action: "query",
        prompt: o.prompt,
        datasetId: typeof o.datasetId === "string" ? o.datasetId : void 0
      } : null;
    default:
      return null;
  }
}
function coerceState(raw) {
  const base = emptyState();
  if (!raw || typeof raw !== "object") return base;
  const s = raw;
  return {
    datasets: Array.isArray(s.datasets) ? s.datasets : base.datasets,
    data: s.data && typeof s.data === "object" ? s.data : base.data,
    activeDatasetId: typeof s.activeDatasetId === "string" ? s.activeDatasetId : null,
    chart: s.chart ?? null,
    kpis: Array.isArray(s.kpis) ? s.kpis : base.kpis,
    note: typeof s.note === "string" ? s.note : base.note
  };
}
async function run(ctx) {
  const input = parseInput(ctx.input);
  if (!input) {
    return {
      error: {
        code: "bad_input",
        message: "\uC9C0\uC6D0\uD558\uC9C0 \uC54A\uB294 \uC785\uB825\uC785\uB2C8\uB2E4. action\uC740 init | select | ingest | query \uC911 \uD558\uB098\uC5EC\uC57C \uD569\uB2C8\uB2E4.",
        retryable: false
      }
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
        message: e instanceof Error ? e.message : "\uC5D0\uC774\uC804\uD2B8 \uC2E4\uD589 \uC911 \uC624\uB958",
        retryable: false
      }
    };
  }
  const artifacts = [];
  if (result.artifact) {
    artifacts.push(await ctx.artifacts.create(result.artifact));
  }
  return {
    message: result.message,
    surface_patches: result.patches,
    artifacts: artifacts.length ? artifacts : void 0
  };
}
export {
  run
};
