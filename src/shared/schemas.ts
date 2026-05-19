// JSON Schema for the Session State document.
// Referenced by agenthub.yaml `surface.state_schema = src/shared/schemas.ts#SessionState`.
// The Host validates the state after each Patch (§13.1).

export const SessionState = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "SessionState",
  type: "object",
  additionalProperties: false,
  required: ["datasets", "data", "activeDatasetId", "chart", "kpis", "note"],
  properties: {
    datasets: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "name", "description", "source", "columns", "rowCount"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          source: { enum: ["sample", "upload"] },
          columns: { type: "array", items: { type: "string" } },
          rowCount: { type: "integer", minimum: 0 },
        },
      },
    },
    data: {
      // datasetId -> rows; row cells are string | number | null.
      type: "object",
      additionalProperties: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: { type: ["string", "number", "null"] },
        },
      },
    },
    activeDatasetId: { type: ["string", "null"] },
    chart: {
      type: ["object", "null"],
      additionalProperties: false,
      required: ["type", "title", "labels", "series", "note"],
      properties: {
        type: { enum: ["line", "bar", "kpi"] },
        title: { type: "string" },
        labels: { type: "array", items: { type: "string" } },
        series: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["label", "data"],
            properties: {
              label: { type: "string" },
              data: { type: "array", items: { type: "number" } },
            },
          },
        },
        indexAxis: { enum: ["x", "y"] },
        kpis: { $ref: "#/definitions/kpiArray" },
        note: { type: "string" },
      },
    },
    kpis: { $ref: "#/definitions/kpiArray" },
    note: { type: "string" },
  },
  definitions: {
    kpiArray: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "value"],
        properties: {
          label: { type: "string" },
          value: { type: "number" },
          unit: { type: "string" },
        },
      },
    },
  },
} as const;
