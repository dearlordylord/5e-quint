import { createHash } from "node:crypto";

import { Schema } from "effect";

import { BATTLE_TOOL_NAMES, type BattleToolName } from "./battle-tool-input.ts";
import {
  CHARACTER_TOOL_NAMES,
  type CharacterToolName,
} from "./character-tool-input.ts";
import { CONTENT_TOOL_NAMES } from "./content-tools.ts";
import { DICE_TOOL_NAMES, type DiceToolName } from "./dice-tool-input.ts";
import { shareRepeatedSchemas } from "./json-schema-sharing.ts";
import {
  PLAY_SESSION_RESTORATION_GUIDANCE,
  PlaySessionIdSchema,
} from "./play-session.ts";
import type { McpObjectInputSchema, McpOutputSchema } from "./schema-codec.ts";
import { mcpObjectJsonSchema, mcpOutputJsonSchema } from "./schema-codec.ts";
import { McpSessionSummarySchema } from "./session-snapshot-output.ts";
import {
  CREATE_CLOSED_WORLD_TOOL_ANNOTATIONS,
  READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
  type ProtocolToolDefinition,
} from "./tool-definition-contract.ts";

export const playSessionToolNames = {
  create: "create_play_session",
  read: "read_play_session",
} as const;

export const PLAY_SESSION_TOOL_NAMES = [
  playSessionToolNames.create,
  playSessionToolNames.read,
] as const;

export type PlaySessionToolName = (typeof PLAY_SESSION_TOOL_NAMES)[number];
export const PLAY_SESSION_OPERATION_NAMES = [
  ...PLAY_SESSION_TOOL_NAMES,
  ...CHARACTER_TOOL_NAMES,
  ...BATTLE_TOOL_NAMES,
  ...DICE_TOOL_NAMES,
] as const;
export type PlaySessionOperationName =
  (typeof PLAY_SESSION_OPERATION_NAMES)[number];
export const PLAY_SESSION_NEXT_OPERATION_NAMES = [
  ...PLAY_SESSION_OPERATION_NAMES,
  ...CONTENT_TOOL_NAMES,
] as const;
export type PlaySessionNextOperationName =
  (typeof PLAY_SESSION_NEXT_OPERATION_NAMES)[number];
export const PLAY_SESSION_OUTPUT_SCHEMA_BYTE_BUDGET = 700_000;

const EmptyArgsSchema = Schema.Struct({});
const PlaySessionArgsSchema = Schema.Struct({
  playSessionId: PlaySessionIdSchema,
});
const emptyInputSchema = mcpObjectJsonSchema(EmptyArgsSchema);
const playSessionInputSchema = mcpObjectJsonSchema(PlaySessionArgsSchema);
const playSessionIdInputPropertySchema = objectPropertySchema(
  playSessionInputSchema,
  "playSessionId",
);
const playSessionIdJsonSchema = mcpOutputJsonSchema(PlaySessionIdSchema);
const sessionProjectionJsonSchema = mcpOutputJsonSchema(
  McpSessionSummarySchema,
);
const routedOutputSchemas = new Map<
  PlaySessionOperationName,
  WeakMap<object, McpOutputSchema>
>();

export const playSessionToolDefinitions = [
  {
    name: playSessionToolNames.create,
    description:
      "Create an isolated process-lifetime Play Session and return the handle required by every stateful operation.",
    inputSchema: emptyInputSchema,
    annotations: CREATE_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: playSessionLifecycleOutputSchema(
      playSessionToolNames.create,
      "playSessionCreated",
    ),
  },
  {
    name: playSessionToolNames.read,
    description:
      "Resume a live Play Session by returning its current projection, unresolved inputs, and relevant next operations.",
    inputSchema: playSessionInputSchema,
    annotations: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: playSessionLifecycleOutputSchema(
      playSessionToolNames.read,
      "playSessionResumed",
    ),
  },
] as const satisfies readonly ProtocolToolDefinition[];

export function statefulPlaySessionToolDefinition<
  Definition extends {
    readonly name: string;
    readonly description: string;
    readonly inputSchema: McpObjectInputSchema;
    readonly outputSchema?: McpOutputSchema;
    readonly annotations: ProtocolToolDefinition["annotations"];
  },
>(
  definition: Definition,
  operationName: CharacterToolName | BattleToolName | DiceToolName,
) {
  return {
    ...definition,
    inputSchema: playSessionRoutedInputSchema(definition.inputSchema),
    ...(definition.outputSchema === undefined
      ? {}
      : {
          outputSchema: playSessionOperationOutputSchema(
            operationName,
            definition.outputSchema,
          ),
        }),
  };
}

export function isPlaySessionToolName(
  name: string,
): name is PlaySessionToolName {
  return PLAY_SESSION_TOOL_NAMES.some((toolName) => toolName === name);
}

function playSessionRoutedInputSchema(
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

function playSessionLifecycleOutputSchema(
  operationName: PlaySessionToolName,
  resultTag: "playSessionCreated" | "playSessionResumed",
): McpOutputSchema {
  return playSessionOperationOutputSchema(operationName, {
    type: "object",
    properties: {
      tag: { const: resultTag },
      playSessionId: playSessionIdJsonSchema,
    },
    required: ["tag", "playSessionId"],
    additionalProperties: false,
  });
}

function playSessionOperationOutputSchema(
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
    },
    anyOf: [
      availableResultSchema({
        operationName,
        playSessionId: embeddedPlaySessionId.schema,
        operationResult: {
          anyOf: [embeddedOperationResult.schema, operationErrorSchema],
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
      unresolvedInputs: unresolvedInputsSchema(),
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
      unresolvedInputs: { type: "array", maxItems: 0 },
      nextOperations: {
        type: "array",
        items: { const: playSessionToolNames.create },
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
    "unresolvedInputs",
    "nextOperations",
    "restoration",
  ];
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

function unresolvedInputsSchema(): McpOutputSchema {
  return {
    type: "array",
    items: {
      type: "object",
      properties: {
        sourcePath: { type: "string" },
        inputs: { type: "array", items: {} },
      },
      required: ["sourcePath", "inputs"],
      additionalProperties: false,
    },
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

function embeddedSchema(
  schema: McpOutputSchema,
  definitionNamespace: string,
): {
  readonly schema: McpOutputSchema;
  readonly definitions: Readonly<Record<string, unknown>>;
} {
  const rootDefinitions = isJsonObject(schema.$defs) ? schema.$defs : {};
  const body = Object.fromEntries(
    Object.entries(schema).filter(([key]) => key !== "$id" && key !== "$defs"),
  );
  return {
    schema: rewriteDefinitionReferences(body, definitionNamespace),
    definitions: Object.fromEntries(
      Object.entries(rootDefinitions).map(([name, definition]) => [
        `${definitionNamespace}_${name}`,
        rewriteDefinitionReferences(definition, definitionNamespace),
      ]),
    ),
  };
}

function rewriteDefinitionReferences(
  value: McpOutputSchema,
  definitionNamespace: string,
): McpOutputSchema;
function rewriteDefinitionReferences(
  value: unknown,
  definitionNamespace: string,
): unknown;
function rewriteDefinitionReferences(
  value: unknown,
  definitionNamespace: string,
): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) =>
      rewriteDefinitionReferences(entry, definitionNamespace),
    );
  }
  if (!isJsonObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "$id")
      .map(([key, entry]) => [
        key,
        key === "$ref" &&
        typeof entry === "string" &&
        entry.startsWith("#/$defs/")
          ? `#/$defs/${definitionNamespace}_${entry.slice("#/$defs/".length)}`
          : rewriteDefinitionReferences(entry, definitionNamespace),
      ]),
  );
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
