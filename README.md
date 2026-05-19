# 데이터 대시보드 — AgentHub 에이전트

CSV·JSON 데이터를 입력하면 KPI 요약과 차트를 자동으로 구성하는 데이터 시각화 에이전트입니다.

> AgentHub Git 기반 에이전트 아키텍처(v3)에 맞춰 구성된 배포 가능 저장소입니다.
> Manifest(§7) · Agent 진입점(§8.1) · Surface 진입점(§8.2) · Session State(§13) ·
> 권한(§15) 규격을 따릅니다.

## 구조 (아키텍처 §6)

```
data-dashboard-agent/
├─ agenthub.yaml              # Manifest (정본 §7)
├─ package.json / tsconfig.json
├─ types/                     # @agenthub/sdk · surface-sdk ambient 스텁(런타임 제공)
├─ src/
│   ├─ agent/                 # Agent Function Runtime (서버, 신뢰)
│   │   ├─ index.ts           #   run(ctx) 진입점 (§8.1)
│   │   ├─ runs.ts            #   action 디스패치 (init/select/ingest/query)
│   │   ├─ prompts.ts         #   LLM 프롬프트
│   │   ├─ analytics.ts       #   KPI/집계
│   │   ├─ query.ts           #   규칙 기반 폴백 해석기
│   │   ├─ csv.ts             #   CSV/JSON 파서
│   │   └─ samples.ts         #   임베디드 샘플 데이터셋
│   ├─ surface/               # Surface (iframe 샌드박스, 비신뢰)
│   │   ├─ App.tsx            #   진입점 (§8.2)
│   │   ├─ main.tsx · Chart.tsx · styles.css
│   └─ shared/
│       ├─ types.ts
│       └─ schemas.ts         #   SessionState JSON Schema (§13.1)
├─ examples/sample-input.json
├─ docs/usage.md · privacy.md
├─ public/icon.svg · preview.svg
└─ tests/agent.test.ts
```

## 동작 모델

- **상태**: 단일 JSON document(Session State, §13). `surface.state_mode=agenthub-managed` —
  Agent만 `RunResult.surface_patches`로 상태를 바꾸고 Surface는 read-only.
- **Run action**:
  - `init` — 샘플 데이터셋(월별 매출 / 이탈 퍼널 / 웹 트래픽) 시드
  - `select` — 활성 데이터셋 전환 + KPI 갱신
  - `ingest` — 업로드한 CSV/JSON(`files.read`) 파싱 후 데이터셋 추가
  - `query` — 자연어 프롬프트를 LLM Gateway(`llm.generate`, 구조화 출력)로
    차트 의도 해석 → 데이터에서 차트 스펙 계산. LLM 실패 시 규칙 기반 폴백.
- **LLM**: 공식 Gateway(`mode=agenthub`), 코드에서는 alias만 사용(`fast`/`main`).
- **외부 호출 없음**: `data_policy = processed_in_agenthub_only`.

## 개발/검증

```bash
npm install          # react, typescript, 타입 (@agenthub/* 는 런타임 제공 — 스텁 사용)
npm run build        # = tsc --noEmit (Manifest validate 단계의 타입 검증)
npm test             # 순수 로직(파서/집계/해석기) 단위 테스트
```

`@agenthub/sdk`·`@agenthub/surface-sdk`는 AgentHub 빌드/런타임이 주입합니다.
로컬 타입 검증은 `types/*.d.ts` ambient 스텁으로 수행됩니다.

## 배포 (아키텍처 §5.3 / §25)

GitHub Repository를 AgentHub에 연동 → Manifest 검증 → 빌드 → Preview → 심사 → 배포.
`marketplace.visibility`는 `unlisted` 기본값이며 필요 시 `public`으로 변경합니다.
