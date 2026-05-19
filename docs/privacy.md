# 데이터 처리 정책

- **data_policy**: `processed_in_agenthub_only` (아키텍처 §17)
- 외부 API·custom LLM을 사용하지 않습니다 (`agenthub.yaml`에 `external_apis` 없음,
  `llm.mode = agenthub`).
- 이용자가 업로드한 CSV/JSON과 프롬프트는 AgentHub Session·File 서비스와
  공식 LLM Gateway 내부에서만 처리됩니다. 비-AgentHub 외부 서버로의
  전송이 없습니다.
- 프롬프트 해석을 위해 데이터셋의 **컬럼명·소수의 샘플 행**이 LLM Gateway로
  전달됩니다(차트 의도 추론용). 전체 데이터셋 본문은 코드 내부 집계에만
  사용되며 모델로 전송되지 않습니다.
- 산출물(차트 스펙 JSON)은 세션 Artifact로 저장됩니다.

> 이 문서는 마켓플레이스 상세의 "데이터 처리" 항목으로 노출됩니다(§17).
