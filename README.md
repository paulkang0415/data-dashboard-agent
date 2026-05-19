# 데이터 대시보드 에이전트

CSV·JSON 데이터를 입력하면 KPI 요약과 차트를 자동으로 구성하는 데이터 시각화 에이전트입니다.

> AgentHub 마켓플레이스의 "데이터 대시보드"(category: 데이터, board: placeholder) 에이전트를
> 독립 실행형으로 구현한 **테스트용 에이전트**입니다. 이후 AgentHub 마이그레이션 단계를 거치므로
> AgentHub 런타임 계약과 1:1로 일치하지는 않습니다.

## 구성

- **백엔드**: Node.js + Express (`server/`)
- **프런트엔드**: 정적 대시보드 (`public/`, Chart.js CDN, 빌드 단계 없음)
- **샘플 데이터**: `data/` (월별 매출, 사용자 이탈 퍼널, 웹 트래픽)

## 실행

```bash
npm install
npm start          # http://localhost:4000
# 개발: npm run dev (파일 변경 시 자동 재시작)
```

`PORT` 환경변수로 포트를 바꿀 수 있습니다. (`PORT=5005 npm start`)

## API

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/health` | 헬스 체크 |
| GET | `/api/datasets` | 데이터셋 목록 |
| GET | `/api/datasets/:id` | 데이터셋 원본(columns/rows) |
| GET | `/api/datasets/:id/summary` | KPI 요약(합계·평균·최소·최대·상위 카테고리) |
| POST | `/api/query` | `{ datasetId, prompt }` → 차트 스펙(규칙 기반 해석) |
| POST | `/api/upload` | `{ name, format: "csv"\|"json", content }` → 인메모리 데이터셋 등록 |

### 프롬프트 해석 (규칙 기반)

`/api/query`는 자연어 프롬프트의 키워드로 차트를 선택합니다.

- "월별 / 추이 / trend" → 시계열 라인 차트
- "이탈 / 퍼널 / 구간 / retention" → 퍼널(가로 막대)
- "KPI / 핵심 / 요약" → KPI 카드 + 요약 막대
- 그 외 → 첫 범주형 × 첫 수치형 막대 차트

예: `월별 판매량 추이 차트 만들어줘`, `사용자 이탈 구간 분석해줘`, `핵심 KPI 요약 대시보드 구성해줘`

## 디렉터리

```
data-dashboard-agent/
  server/
    index.js       Express 서버 / 라우팅
    datasets.js    샘플 로더 + 인메모리 업로드 저장소 + CSV 파서
    analytics.js   KPI / 집계 계산
    query.js       프롬프트 → 차트 스펙
  public/
    index.html     대시보드 UI
    app.js          프런트엔드 로직
    styles.css
  data/
    sales.csv  retention.csv  traffic.json
```
