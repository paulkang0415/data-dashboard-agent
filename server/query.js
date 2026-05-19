import { aggregateBy, numericColumns, categoricalColumns, summarize } from './analytics.js';

// Pick the column whose name best matches a list of hints, else fall back.
function pickColumn(columns, hints, fallback) {
  for (const h of hints) {
    const hit = columns.find(c => c.toLowerCase().includes(h));
    if (hit) return hit;
  }
  return fallback;
}

const TIME_HINTS = ['month', '월', 'date', '날짜', '일자', 'time', 'period', '분기'];
const MEASURE_HINTS = ['revenue', '매출', 'sales', '판매', 'amount', 'sessions', '세션', 'users', '사용자', 'count', 'orders', '주문'];

// Rule-based natural-language → chart spec interpreter.
export function interpret(prompt, dataset) {
  const p = (prompt || '').toLowerCase();
  const nums = numericColumns(dataset);
  const cats = categoricalColumns(dataset);
  const sum = summarize(dataset);

  const wantsTrend = /추이|월별|월간|trend|시계열|성장|증가|흐름/.test(p);
  const wantsFunnel = /이탈|퍼널|funnel|구간|retention|단계|전환|drop/.test(p);
  const wantsKpi = /kpi|핵심|요약|지표|summary|대시보드/.test(p);

  if (wantsTrend && nums.length > 0) {
    const dim = pickColumn(dataset.columns, TIME_HINTS, cats[0] ?? dataset.columns[0]);
    const measure = pickColumn(nums, MEASURE_HINTS, nums[0]);
    const { labels, values } = aggregateBy(dataset, dim, measure, 'sum');
    return {
      type: 'line',
      title: `${dim} 기준 ${measure} 추이`,
      labels,
      series: [{ label: measure, data: values }],
      note: `${dim}별 ${measure} 합계 시계열`,
    };
  }

  if (wantsFunnel && nums.length > 0) {
    const stageCol = cats[0] ?? dataset.columns[0];
    const measure = pickColumn(nums, ['users', '사용자', 'count', 'sessions'], nums[0]);
    const { labels, values } = aggregateBy(dataset, stageCol, measure, 'sum');
    const top = values[0] || 1;
    const kpis = labels.map((l, i) => ({
      label: l,
      value: values[i],
      unit: `${((values[i] / top) * 100).toFixed(1)}%`,
    }));
    return {
      type: 'bar',
      indexAxis: 'y',
      title: `${stageCol} 퍼널 (${measure})`,
      labels,
      series: [{ label: measure, data: values }],
      kpis,
      note: '상단 단계 대비 잔존율을 함께 표기',
    };
  }

  if (wantsKpi) {
    const dim = cats[0] ?? dataset.columns[0];
    const measure = nums[0];
    const agg = measure ? aggregateBy(dataset, dim, measure, 'sum') : { labels: [], values: [] };
    return {
      type: 'kpi',
      title: '핵심 KPI 요약',
      kpis: sum.headlineKpis,
      labels: agg.labels,
      series: measure ? [{ label: measure, data: agg.values }] : [],
      note: measure ? `${dim}별 ${measure} 분포 포함` : 'KPI 카드만 표시',
    };
  }

  // Default: first categorical × first numeric bar chart.
  if (cats.length > 0 && nums.length > 0) {
    const dim = cats[0];
    const measure = nums[0];
    const { labels, values } = aggregateBy(dataset, dim, measure, 'sum');
    return {
      type: 'bar',
      title: `${dim}별 ${measure}`,
      labels,
      series: [{ label: measure, data: values }],
      note: '기본 해석: 첫 범주형 × 첫 수치형',
    };
  }

  return {
    type: 'kpi',
    title: '요약',
    kpis: sum.headlineKpis,
    labels: [],
    series: [],
    note: '차트로 만들 수치형 컬럼이 없어 KPI만 표시합니다.',
  };
}
