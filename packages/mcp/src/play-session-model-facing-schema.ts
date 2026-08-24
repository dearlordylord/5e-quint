import type { McpOutputSchema } from "./schema-codec.ts";

const ModelFacingBattleHoleSchema = {
  type: "object",
  description:
    "A pending Battle hole. Preserve this exact object and use its discriminant and identity fields when constructing fill_battle_hole input.",
  properties: {
    kind: { type: "string" },
    holeId: { type: "string" },
    holeInstanceKey: { type: "string" },
    label: { type: "string" },
  },
  required: ["kind", "holeId", "holeInstanceKey", "label"],
  additionalProperties: true,
} as const satisfies McpOutputSchema;

const ModelFacingUnresolvedInputSchema = {
  type: "object",
  description:
    "An exact unresolved input returned by the operation. Preserve the full object; kind identifies its typed creation or Battle variant.",
  properties: {
    kind: { type: "string" },
    holeId: { type: "string" },
    holeInstanceKey: { type: "string" },
    label: { type: "string" },
  },
  required: ["kind"],
  additionalProperties: true,
} as const satisfies McpOutputSchema;

export function modelFacingSessionProjectionSchema(
  schema: McpOutputSchema,
): McpOutputSchema {
  const properties = isJsonObject(schema.properties) ? schema.properties : {};
  if (!("pendingBattleHoles" in properties)) {
    throw new Error(
      "Generated Play Session projection schema omitted pendingBattleHoles.",
    );
  }
  return {
    ...schema,
    properties: {
      ...properties,
      pendingBattleHoles: {
        anyOf: [
          {
            type: "array",
            items: ModelFacingBattleHoleSchema,
            minItems: 1,
          },
          { type: "null" },
        ],
      },
    },
  };
}

export function modelFacingUnresolvedInputsSchema(): McpOutputSchema {
  return {
    type: "array",
    items: {
      type: "object",
      properties: {
        sourcePath: { type: "string" },
        inputs: {
          type: "array",
          items: ModelFacingUnresolvedInputSchema,
        },
      },
      required: ["sourcePath", "inputs"],
      additionalProperties: false,
    },
  };
}

function isJsonObject(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
