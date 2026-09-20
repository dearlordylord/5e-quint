import type { McpOutputSchema } from "./schema-codec.ts";

export function playSessionCreationResultSchema(input: {
  readonly playSessionId: McpOutputSchema;
}): McpOutputSchema {
  return {
    type: "object",
    properties: {
      tag: { const: "playSessionCreated" },
      playSessionId: input.playSessionId,
    },
    required: ["tag", "playSessionId"],
    additionalProperties: false,
  };
}
