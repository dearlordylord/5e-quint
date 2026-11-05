import { mcpOutputJsonSchema, type McpOutputSchema } from "./schema-codec.ts";
import { PlaySessionIdSchema } from "./play-session.ts";

export const playSessionIdJsonSchema = mcpOutputJsonSchema(PlaySessionIdSchema);

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

export function playSessionTenureSchema(): McpOutputSchema {
  return {
    anyOf: [
      {
        type: "object",
        properties: {
          tag: { const: "ephemeral" },
          persistence: { const: "processLifetime" },
        },
        required: ["tag", "persistence"],
        additionalProperties: false,
      },
      savedPlaySessionTenureSchema(),
    ],
  };
}

export function savedPlaySessionTenureSchema(): McpOutputSchema {
  return {
    type: "object",
    properties: {
      tag: { const: "saved" },
      persistence: { const: "saved" },
      deletionAvailable: { const: true },
    },
    required: ["tag", "persistence", "deletionAvailable"],
    additionalProperties: false,
  };
}

export function savedPlaySessionSummarySchema(): McpOutputSchema {
  return {
    type: "object",
    properties: {
      playSessionId: playSessionIdJsonSchema,
      tenure: savedPlaySessionTenureSchema(),
    },
    required: ["playSessionId", "tenure"],
    additionalProperties: false,
  };
}
