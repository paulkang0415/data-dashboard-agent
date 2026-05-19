// Embedded sample datasets. The Agent isolate has no filesystem access
// (§10.1), so seed data ships as code rather than data/ files.

import type { Dataset, Row } from "../shared/types.js";

function rows<T extends Row>(arr: T[]): Row[] {
  return arr as Row[];
}

const REGIONS = ["서울", "부산", "온라인"] as const;
const MONTHS = [
  "2025-01",
  "2025-02",
  "2025-03",
  "2025-04",
  "2025-05",
  "2025-06",
  "2025-07",
  "2025-08",
] as const;

const SALES_TABLE: Record<string, [number, number][]> = {
  // month: [서울[rev,ord], 부산[rev,ord], 온라인[rev,ord]]
  "2025-01": [
    [48200000, 1240],
    [21500000, 610],
    [63800000, 2180],
  ],
  "2025-02": [
    [51100000, 1310],
    [19800000, 560],
    [67400000, 2320],
  ],
  "2025-03": [
    [55600000, 1425],
    [23900000, 690],
    [72100000, 2510],
  ],
  "2025-04": [
    [53200000, 1360],
    [25400000, 742],
    [75800000, 2660],
  ],
  "2025-05": [
    [58900000, 1502],
    [27100000, 805],
    [81200000, 2890],
  ],
  "2025-06": [
    [61300000, 1588],
    [26800000, 790],
    [86500000, 3104],
  ],
  "2025-07": [
    [59700000, 1540],
    [28300000, 838],
    [90100000, 3260],
  ],
  "2025-08": [
    [64500000, 1672],
    [30100000, 902],
    [94700000, 3438],
  ],
};

const salesRows: Row[] = [];
for (const m of MONTHS) {
  REGIONS.forEach((region, i) => {
    const [revenue, orders] = SALES_TABLE[m][i];
    salesRows.push({ month: m, region, revenue, orders });
  });
}

export const SAMPLE_DATASETS: Dataset[] = [
  {
    id: "sales",
    name: "월별 매출",
    description: "지역별 월간 매출·주문 수",
    source: "sample",
    columns: ["month", "region", "revenue", "orders"],
    rows: salesRows,
  },
  {
    id: "retention",
    name: "사용자 이탈 퍼널",
    description: "온보딩부터 유료 전환까지 단계별 사용자 수",
    source: "sample",
    columns: ["stage", "users"],
    rows: rows([
      { stage: "방문", users: 48200 },
      { stage: "회원가입", users: 18640 },
      { stage: "온보딩 완료", users: 11280 },
      { stage: "첫 액션", users: 7420 },
      { stage: "재방문(7일)", users: 3960 },
      { stage: "유료 전환", users: 1180 },
    ]),
  },
  {
    id: "traffic",
    name: "웹 트래픽",
    description: "채널별 일간 세션·이탈률",
    source: "sample",
    columns: ["date", "channel", "sessions", "bounceRate"],
    rows: rows([
      { date: "2025-08-01", channel: "검색", sessions: 5240, bounceRate: 0.38 },
      { date: "2025-08-01", channel: "소셜", sessions: 3110, bounceRate: 0.52 },
      { date: "2025-08-01", channel: "직접", sessions: 2480, bounceRate: 0.29 },
      { date: "2025-08-02", channel: "검색", sessions: 5610, bounceRate: 0.36 },
      { date: "2025-08-02", channel: "소셜", sessions: 3580, bounceRate: 0.49 },
      { date: "2025-08-02", channel: "직접", sessions: 2390, bounceRate: 0.31 },
      { date: "2025-08-03", channel: "검색", sessions: 6020, bounceRate: 0.34 },
      { date: "2025-08-03", channel: "소셜", sessions: 4120, bounceRate: 0.47 },
      { date: "2025-08-03", channel: "직접", sessions: 2710, bounceRate: 0.27 },
      { date: "2025-08-04", channel: "검색", sessions: 5890, bounceRate: 0.35 },
      { date: "2025-08-04", channel: "소셜", sessions: 3960, bounceRate: 0.50 },
      { date: "2025-08-04", channel: "직접", sessions: 2880, bounceRate: 0.26 },
    ]),
  },
];
