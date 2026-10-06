import { ChatGptBattleGuidanceSchema } from "./chatgpt/battle-guidance-schema.ts";
import { CHATGPT_TOOL_NAMES } from "./chatgpt/protocol-operation.ts";
import type { ChatGptToolName } from "./chatgpt/tool-catalog.ts";
import type { McpToolSurface } from "./mcp-tool-surface.ts";
import { type PlaySessionExecutionOperationName } from "./chatgpt/protocol-operation.ts";
import { createHash } from "node:crypto";

import { Schema } from "effect";

import { shareRepeatedSchemas } from "./json-schema-sharing.ts";
import { embeddedSchema } from "./json-schema-embedding.ts";
import {
  PLAY_SESSION_RESTORATION_GUIDANCE,
  PlaySessionIdSchema,
} from "./play-session.ts";
import { playSessionCreationResultSchema } from "./play-session-creation-schema.ts";
import { BattlePresentationEnvelopeSchema } from "./battle-tool-output.ts";
import {
  modelFacingSessionProjectionSchema,
  modelFacingUnresolvedInputsSchema,
} from "./play-session-model-facing-schema.ts";
import type { McpObjectInputSchema, McpOutputSchema } from "./schema-codec.ts";
import {
  mcpModelOutputJsonSchema,
  mcpObjectJsonSchema,
  mcpOutputJsonSchema,
} from "./schema-codec.ts";
import { McpSessionSummarySchema } from "./session-snapshot-output.ts";
import {
  PLAY_SESSION_NEXT_OPERATION_NAMES,
  playSessionToolNames,
  type PlaySessionToolName,
  type PlaySessionNextOperationName,
} from "./play-session-tool-names.ts";

const EmptyArgsSchema = Schema.Struct({});
const PlaySessionArgsSchema = Schema.Struct({
  playSessionId: PlaySessionIdSchema,
});
export const emptyInputSchema = mcpObjectJsonSchema(EmptyArgsSchema);
export const playSessionInputSchema = mcpObjectJsonSchema(
  PlaySessionArgsSchema,
);
export const deleteSavedPlaySessionInputSchema = mcpObjectJsonSchema(
  Schema.Struct({ playSessionId: PlaySessionIdSchema }),
);
const playSessionIdInputPropertySchema = objectPropertySchema(
  playSessionInputSchema,
  "playSessionId",
);
const playSessionIdJsonSchema = mcpOutputJsonSchema(PlaySessionIdSchema);
const sessionProjectionJsonSchema = modelFacingSessionProjectionSchema(
  mcpModelOutputJsonSchema(McpSessionSummarySchema),
);
const routedOutputSchemas = new Map<
  McpToolSurface,
  Map<PlaySessionExecutionOperationName, WeakMap<object, McpOutputSchema>>
>();
const embeddedBattleEnvelope = embeddedSchema(
  mcpModelOutputJsonSchema(BattlePresentationEnvelopeSchema),
  "BattleEnvelope",
);

export const deleteSavedPlaySessionOutputSchema: McpOutputSchema = {
  type: "object",
  properties: {
    tag: { const: "playSessionDeleted" },
    playSessionId: playSessionIdJsonSchema,
  },
  required: ["tag", "playSessionId"],
  additionalProperties: false,
};

export function playSessionRoutedInputSchema(
  inputSchema: McpObjectInputSchema,
): McpObjectInputSchema {
  const properties = isJsonObject(inputSchema.properties)
    ? inputSchema.properties
    : {};
  const required = Array.isArray(inputSchema.required)
    ? inputSchema.required.filter(
        (entry): entry is string => typeof entry === "string",
      )
    : [];
  return {
    ...inputSchema,
    type: "object",
    properties: {
      ...properties,
      playSessionId: playSessionIdInputPropertySchema,
    },
    required: [...new Set([...required, "playSessionId"])],
    additionalProperties: false,
  };
}

export function playSessionLifecycleOutputSchema(
  operationName: PlaySessionToolName,
  resultTag: "playSessionCreated" | "playSessionResumed",
  toolSurface: McpToolSurface = "regular",
): McpOutputSchema {
  const resumedBattleEnvelope =
    operationName === playSessionToolNames.read
      ? {
          battleEnvelope: {
            anyOf: [embeddedBattleEnvelope.schema, { type: "null" }],
          },
        }
      : {};
  const lifecycleResult = {
    type: "object",
    properties: {
      tag: { const: resultTag },
      playSessionId: playSessionIdJsonSchema,
      ...resumedBattleEnvelope,
    },
    required: [
      "tag",
      "playSessionId",
      ...(operationName === playSessionToolNames.read
        ? ["battleEnvelope"]
        : []),
    ],
    $defs: embeddedBattleEnvelope.definitions,
    additionalProperties: false,
  } satisfies McpOutputSchema;
  return playSessionOperationOutputSchema(
    operationName,
    operationName === "create_play_session"
      ? playSessionCreationResultSchema({
          playSessionId: playSessionIdJsonSchema,
        })
      : lifecycleResult,
    toolSurface,
  );
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

const embeddedChatGptGuidance = embeddedSchema(
  shareRepeatedSchemas(mcpOutputJsonSchema(ChatGptBattleGuidanceSchema)),
  "ChatGptGuidance",
);

export function playSessionOperationOutputSchema(
  operationName: PlaySessionExecutionOperationName,
  operationResultSchema: McpOutputSchema,
  toolSurface: McpToolSurface = "regular",
): McpOutputSchema {
  const surfaceCache =
    routedOutputSchemas.get(toolSurface) ??
    new Map<
      PlaySessionExecutionOperationName,
      WeakMap<object, McpOutputSchema>
    >();
  const operationCache = surfaceCache.get(operationName);
  const cached = operationCache?.get(operationResultSchema);
  if (cached !== undefined) return cached;
  const embeddedPlaySessionId = embeddedSchema(
    playSessionIdJsonSchema,
    "PlaySessionId",
  );
  const embeddedSessionProjection = embeddedSchema(
    sessionProjectionJsonSchema,
    "SessionProjection",
  );
  const embeddedOperationResult = embeddedSchema(
    shareRepeatedSchemas(operationResultSchema),
    "OperationResult",
  );
  const operationErrorSchema = {
    type: "object",
    properties: { error: { type: "string" }, details: {} },
    required: ["error"],
    additionalProperties: false,
  };
  const unavailableResultSchema = {
    type: "object",
    properties: {
      tag: { const: "playSessionUnavailable" },
      restoration: restorationRequiredSchema(),
    },
    required: ["tag", "restoration"],
    additionalProperties: false,
  };
  const schema = {
    type: "object",
    $defs: {
      ...embeddedPlaySessionId.definitions,
      ...embeddedSessionProjection.definitions,
      ...embeddedOperationResult.definitions,
      ...embeddedBattleEnvelope.definitions,
      ...(toolSurface === "chatgpt" ? embeddedChatGptGuidance.definitions : {}),
    },
    anyOf: [
      availableResultSchema({
        toolSurface,
        nextOperationNames:
          toolSurface === "chatgpt"
            ? CHATGPT_TOOL_NAMES
            : PLAY_SESSION_NEXT_OPERATION_NAMES,
        operationName,
        playSessionId: embeddedPlaySessionId.schema,
        operationResult: {
          anyOf: [
            embeddedOperationResult.schema,
            operationErrorSchema,
            recoverableOperationResultSchema({
              operationResult: embeddedOperationResult.schema,
              battleEnvelope: embeddedBattleEnvelope.schema,
              operationError: operationErrorSchema,
            }),
          ],
        },
        projection: embeddedSessionProjection.schema,
      }),
      unavailableEnvelopeSchema({
        operationName,
        playSessionId: embeddedPlaySessionId.schema,
        operationResult: unavailableResultSchema,
      }),
    ],
  } satisfies McpOutputSchema;
  const identified = {
    $id: `urn:dnd:mcp:play-session-envelope:sha256:${createHash("sha256")
      .update(JSON.stringify(schema))
      .digest("hex")}`,
    ...schema,
  } satisfies McpOutputSchema;
  const cache = operationCache ?? new WeakMap<object, McpOutputSchema>();
  cache.set(operationResultSchema, identified);
  surfaceCache.set(operationName, cache);
  routedOutputSchemas.set(toolSurface, surfaceCache);
  return identified;
}

function recoverableOperationResultSchema(input: {
  readonly operationResult: McpOutputSchema;
  readonly operationError: McpOutputSchema;
  readonly battleEnvelope: McpOutputSchema;
}): McpOutputSchema {
  return {
    type: "object",
    properties: {
      result: { anyOf: [input.operationResult, input.operationError] },
      battleEnvelope: input.battleEnvelope,
    },
    required: ["result", "battleEnvelope"],
    additionalProperties: false,
  };
}

function availableResultSchema(input: {
  readonly toolSurface: McpToolSurface;
  readonly nextOperationNames: readonly (
    | PlaySessionNextOperationName
    | ChatGptToolName
  )[];
  readonly operationName: PlaySessionExecutionOperationName;
  readonly playSessionId: McpOutputSchema;
  readonly operationResult: McpOutputSchema;
  readonly projection: McpOutputSchema;
}): McpOutputSchema {
  return {
    type: "object",
    properties: {
      tag: { const: "playSessionAvailable" },
      ...(input.toolSurface === "chatgpt"
        ? {
            chatGptBattleOperations: embeddedChatGptGuidance.schema,
          }
        : {}),
      playSessionId: input.playSessionId,
      operation: operationSchema(input.operationName, input.operationResult),
      projection: input.projection,
      tenure: playSessionTenureSchema(),
      unresolvedInputs: modelFacingUnresolvedInputsSchema(),
      nextOperations: {
        type: "array",
        items: { enum: input.nextOperationNames },
      },
      restoration: {
        type: "object",
        properties: { tag: { const: "retained" } },
        required: ["tag"],
        additionalProperties: false,
      },
    },
    required: [
      ...envelopeRequiredFields(),
      ...(input.toolSurface === "chatgpt" ? ["chatGptBattleOperations"] : []),
    ],
    additionalProperties: false,
  };
}

function unavailableEnvelopeSchema(input: {
  readonly operationName: PlaySessionExecutionOperationName;
  readonly playSessionId: McpOutputSchema;
  readonly operationResult: McpOutputSchema;
}): McpOutputSchema {
  return {
    type: "object",
    properties: {
      tag: { const: "playSessionUnavailable" },
      playSessionId: input.playSessionId,
      operation: operationSchema(input.operationName, input.operationResult),
      projection: { type: "null" },
      tenure: { type: "null" },
      unresolvedInputs: { type: "array", maxItems: 0 },
      nextOperations: {
        type: "array",
        items: { const: "create_play_session" },
        minItems: 1,
        maxItems: 1,
      },
      restoration: restorationRequiredSchema(),
    },
    required: envelopeRequiredFields(),
    additionalProperties: false,
  };
}

function envelopeRequiredFields(): readonly string[] {
  return [
    "tag",
    "playSessionId",
    "operation",
    "projection",
    "tenure",
    "unresolvedInputs",
    "nextOperations",
    "restoration",
  ];
}

function playSessionTenureSchema(): McpOutputSchema {
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

function savedPlaySessionTenureSchema(): McpOutputSchema {
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

function operationSchema(
  operationName: PlaySessionExecutionOperationName,
  resultSchema: McpOutputSchema,
): McpOutputSchema {
  return {
    type: "object",
    properties: {
      name: { const: operationName },
      result: resultSchema,
    },
    required: ["name", "result"],
    additionalProperties: false,
  };
}

function restorationRequiredSchema(): McpOutputSchema {
  return {
    type: "object",
    properties: {
      tag: { const: "newSessionRequired" },
      guidance: { const: PLAY_SESSION_RESTORATION_GUIDANCE },
    },
    required: ["tag", "guidance"],
    additionalProperties: false,
  };
}

function isJsonObject(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function objectPropertySchema(
  schema: McpObjectInputSchema,
  propertyName: string,
): McpOutputSchema {
  const properties = isJsonObject(schema.properties) ? schema.properties : {};
  const property = properties[propertyName];
  if (!isJsonObject(property)) {
    throw new Error(`Generated input schema omitted ${propertyName}.`);
  }
  return property;
}
