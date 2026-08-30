import { createHash } from "node:crypto";

import { Schema } from "effect";

import { shareRepeatedSchemas } from "./json-schema-sharing.ts";
import { embeddedSchema } from "./json-schema-embedding.ts";
import {
  PLAY_SESSION_RESTORATION_GUIDANCE,
  PlaySessionIdSchema,
} from "./play-session.ts";
import { GuestAccessGrantSchema } from "./play-session-access.ts";
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
  type PlaySessionOperationName,
  type PlaySessionToolName,
} from "./play-session-tool-names.ts";

const EmptyArgsSchema = Schema.Struct({});
const PlaySessionArgsSchema = Schema.Struct({
  playSessionId: PlaySessionIdSchema,
  guestAccessGrant: Schema.optionalKey(GuestAccessGrantSchema),
});
const SavePlaySessionArgsSchema = Schema.Struct({
  playSessionId: PlaySessionIdSchema,
  guestAccessGrant: GuestAccessGrantSchema,
});
export const emptyInputSchema = mcpObjectJsonSchema(EmptyArgsSchema);
export const playSessionInputSchema = mcpObjectJsonSchema(
  PlaySessionArgsSchema,
);
export const savePlaySessionInputSchema = mcpObjectJsonSchema(
  SavePlaySessionArgsSchema,
);
export const deleteSavedPlaySessionInputSchema = mcpObjectJsonSchema(
  Schema.Struct({ playSessionId: PlaySessionIdSchema }),
);
const playSessionIdInputPropertySchema = objectPropertySchema(
  playSessionInputSchema,
  "playSessionId",
);
const guestAccessGrantInputPropertySchema = objectPropertySchema(
  playSessionInputSchema,
  "guestAccessGrant",
);
const playSessionIdJsonSchema = mcpOutputJsonSchema(PlaySessionIdSchema);
const guestAccessGrantJsonSchema = mcpOutputJsonSchema(GuestAccessGrantSchema);
const sessionProjectionJsonSchema = modelFacingSessionProjectionSchema(
  mcpModelOutputJsonSchema(McpSessionSummarySchema),
);
const routedOutputSchemas = new Map<
  PlaySessionOperationName,
  WeakMap<object, McpOutputSchema>
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
      guestAccessGrant: guestAccessGrantInputPropertySchema,
    },
    required: [...new Set([...required, "playSessionId"])],
    additionalProperties: false,
  };
}

export function playSessionLifecycleOutputSchema(
  operationName: PlaySessionToolName,
  resultTag: "playSessionCreated" | "playSessionResumed",
): McpOutputSchema {
  const resumedBattleEnvelope =
    operationName === playSessionToolNames.read
      ? { battleEnvelope: embeddedBattleEnvelope.schema }
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
          guestAccessGrant: guestAccessGrantJsonSchema,
        })
      : lifecycleResult,
  );
}

export function savedManagementOutputSchema(
  tag: "playSessionSaved",
): McpOutputSchema {
  return {
    type: "object",
    properties: {
      tag: { const: tag },
      playSessionId: playSessionIdJsonSchema,
      tenure: savedPlaySessionTenureSchema(),
    },
    required: ["tag", "playSessionId", "tenure"],
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

export function playSessionOperationOutputSchema(
  operationName: PlaySessionOperationName,
  operationResultSchema: McpOutputSchema,
): McpOutputSchema {
  const operationCache = routedOutputSchemas.get(operationName);
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
    },
    anyOf: [
      availableResultSchema({
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
  routedOutputSchemas.set(operationName, cache);
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
  readonly operationName: PlaySessionOperationName;
  readonly playSessionId: McpOutputSchema;
  readonly operationResult: McpOutputSchema;
  readonly projection: McpOutputSchema;
}): McpOutputSchema {
  return {
    type: "object",
    properties: {
      tag: { const: "playSessionAvailable" },
      playSessionId: input.playSessionId,
      operation: operationSchema(input.operationName, input.operationResult),
      projection: input.projection,
      tenure: playSessionTenureSchema(),
      unresolvedInputs: modelFacingUnresolvedInputsSchema(),
      nextOperations: {
        type: "array",
        items: { enum: PLAY_SESSION_NEXT_OPERATION_NAMES },
      },
      restoration: {
        type: "object",
        properties: { tag: { const: "retained" } },
        required: ["tag"],
        additionalProperties: false,
      },
    },
    required: envelopeRequiredFields(),
    additionalProperties: false,
  };
}

function unavailableEnvelopeSchema(input: {
  readonly operationName: PlaySessionOperationName;
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
          tag: { const: "guest" },
          persistence: { const: "temporary" },
          inactiveExpiresAt: { type: "string", format: "date-time" },
          pressureCleanupEligibleAt: { type: "string", format: "date-time" },
          save: {
            anyOf: [
              {
                type: "object",
                properties: { tag: { const: "available" } },
                required: ["tag"],
                additionalProperties: false,
              },
              {
                type: "object",
                properties: {
                  tag: { const: "unavailable" },
                  reason: { const: "oauthNotConfigured" },
                },
                required: ["tag", "reason"],
                additionalProperties: false,
              },
            ],
          },
        },
        required: [
          "tag",
          "persistence",
          "inactiveExpiresAt",
          "pressureCleanupEligibleAt",
          "save",
        ],
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
      inactiveExpiresAt: { type: "string", format: "date-time" },
      deletionAvailable: { const: true },
    },
    required: ["tag", "persistence", "inactiveExpiresAt", "deletionAvailable"],
    additionalProperties: false,
  };
}

function operationSchema(
  operationName: PlaySessionOperationName,
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
