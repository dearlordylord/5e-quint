import { mcpOutputJsonSchema, type McpOutputSchema } from "./schema-codec.ts";
import { UnresolvedInputSourceSchema } from "./unresolved-input-source.ts";

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
  return schema;
}

export function modelFacingUnresolvedInputsSchema(): McpOutputSchema {
  return {
    type: "array",
    items: {
      type: "object",
      properties: {
        source: mcpOutputJsonSchema(UnresolvedInputSourceSchema),
        inputs: {
          type: "array",
          items: ModelFacingUnresolvedInputSchema,
        },
      },
      required: ["source", "inputs"],
      additionalProperties: false,
    },
  };
}
