// LLM prompt + structured-output schema for chart-intent resolution (§9.5).

import type { LlmMessage } from "@agenthub/sdk";
import type { Dataset } from "../shared/types.js";
import { categoricalColumns, numericColumns } from "./analytics.js";

// JSON Schema passed as response_format (structured output).
export const chartIntentSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["chartType", "dimension", "measure"],
  properties: {
    chartType: {
      enum: ["line", "bar", "kpi"],
      description:
        "line=시계열 추이, bar=범주 비교/퍼널, kpi=핵심 지표 요약",
    },
    dimension: {
      type: "string",
      description: "x축/그룹 기준 컬럼 (범주형 또는 시간형)",
    },
    measure: {
      type: "string",
      description: "집계할 수치형 컬럼",
    },
    title: { type: "string", description: "차트 제목 (한국어, 선택)" },
  },
};

export function buildIntentMessages(
  prompt: string,
  dataset: Dataset,
): LlmMessage[] {
  const nums = numericColumns(dataset);
  const cats = categoricalColumns(dataset);
  const sample = dataset.rows.slice(0, 3);

  return [
    {
      role: "system",
      content:
        "너는 데이터 시각화 어시스턴트다. 사용자의 요청과 데이터셋 스키마를 보고 " +
        "가장 적절한 차트 의도를 JSON으로만 출력한다. dimension/measure는 반드시 " +
        "주어진 컬럼명 중에서 고른다. measure는 수치형 컬럼이어야 한다.",
    },
    {
      role: "user",
      content:
        `요청: ${prompt}\n\n` +
        `데이터셋: ${dataset.name}\n` +
        `전체 컬럼: ${dataset.columns.join(", ")}\n` +
        `수치형 컬럼: ${nums.join(", ") || "(없음)"}\n` +
        `범주/시간형 컬럼: ${cats.join(", ") || "(없음)"}\n` +
        `샘플 행: ${JSON.stringify(sample)}`,
    },
  ];
}
