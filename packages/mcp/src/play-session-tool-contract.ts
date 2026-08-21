import { createHash } from "node:crypto";

import { Schema } from "effect";

import {
  PLAY_SESSION_RESTORATION_GUIDANCE,
  PlaySessionIdSchema,
} from "./play-session.ts";
import type { McpObjectInputSchema, McpOutputSchema } from "./schema-codec.ts";
import { mcpObjectJsonSchema, mcpOutputJsonSchema } from "./schema-codec.ts";
import { McpSessionSummarySchema } from "./session-snapshot-output.ts";

export const playSessionToolNames = {
  create: "create_play_session",
  read: "read_play_session",
} as const;

export const PLAY_SESSION_TOOL_NAMES = [
  playSessionToolNames.create,
  playSessionToolNames.read,
] as const;

export type PlaySessionToolName = (typeof PLAY_SESSION_TOOL_NAMES)[number];

const EmptyArgsSchema = Schema.Struct({});
const PlaySessionArgsSchema = Schema.Struct({
  playSessionId: PlaySessionIdSchema,
});
const emptyInputSchema = mcpObjectJsonSchema(EmptyArgsSchema);
const playSessionInputSchema = mcpObjectJsonSchema(PlaySessionArgsSchema);
const playSessionIdJsonSchema = mcpOutputJsonSchema(PlaySessionIdSchema);
const sessionProjectionJsonSchema = mcpOutputJsonSchema(
  McpSessionSummarySchema,
);
const routedOutputSchemaByOperationResult = new WeakMap<
  object,
  McpOutputSchema
>();

export const playSessionToolDefinitions = [
  {
    name: playSessionToolNames.create,
    description:
      "Create an isolated process-lifetime Play Session and return the handle required by every stateful operation.",
    inputSchema: emptyInputSchema,
    outputSchema: playSessionLifecycleOutputSchema("playSessionCreated"),
  },
  {
    name: playSessionToolNames.read,
    description:
      "Resume a live Play Session by returning its current projection, unresolved inputs, and relevant next operations.",
    inputSchema: playSessionInputSchema,
    outputSchema: playSessionLifecycleOutputSchema("playSessionResumed"),
  },
] as const;

export function statefulPlaySessionToolDefinition<
  Definition extends {
    readonly name: string;
    readonly description: string;
    readonly inputSchema: McpObjectInputSchema;
    readonly outputSchema?: McpOutputSchema;
  },
>(definition: Definition) {
  return {
    ...definition,
    inputSchema: playSessionRoutedInputSchema(definition.inputSchema),
    ...(definition.outputSchema === undefined
      ? {}
      : {
          outputSchema: playSessionOperationOutputSchema(
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
      playSessionId: playSessionIdJsonSchema,
    },
    required: [...new Set([...required, "playSessionId"])],
    additionalProperties: false,
  };
}

function playSessionLifecycleOutputSchema(
  resultTag: "playSessionCreated" | "playSessionResumed",
): McpOutputSchema {
  return playSessionOperationOutputSchema({
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
  operationResultSchema: McpOutputSchema,
): McpOutputSchema {
  const cached = routedOutputSchemaByOperationResult.get(operationResultSchema);
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
    operationResultEnvelopeSchema(operationResultSchema),
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
        playSessionId: embeddedPlaySessionId.schema,
        operationResult: {
          anyOf: [embeddedOperationResult.schema, operationErrorSchema],
        },
        projection: embeddedSessionProjection.schema,
      }),
      unavailableEnvelopeSchema({
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
  routedOutputSchemaByOperationResult.set(operationResultSchema, identified);
  return identified;
}

function availableResultSchema(input: {
  readonly playSessionId: McpOutputSchema;
  readonly operationResult: McpOutputSchema;
  readonly projection: McpOutputSchema;
}): McpOutputSchema {
  return {
    type: "object",
    properties: {
      tag: { const: "playSessionAvailable" },
      playSessionId: input.playSessionId,
      operation: operationSchema(input.operationResult),
      projection: input.projection,
      unresolvedInputs: unresolvedInputsSchema(),
      nextOperations: { type: "array", items: { type: "string" } },
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
  readonly playSessionId: McpOutputSchema;
  readonly operationResult: McpOutputSchema;
}): McpOutputSchema {
  return {
    type: "object",
    properties: {
      tag: { const: "playSessionUnavailable" },
      playSessionId: input.playSessionId,
      operation: operationSchema(input.operationResult),
      projection: { type: "null" },
      unresolvedInputs: { type: "array", maxItems: 0 },
      nextOperations: {
        type: "array",
        prefixItems: [{ const: playSessionToolNames.create }],
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

function operationSchema(resultSchema: McpOutputSchema): McpOutputSchema {
  return {
    type: "object",
    properties: { name: { type: "string" }, result: resultSchema },
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

function operationResultEnvelopeSchema(
  operationResultSchema: McpOutputSchema,
): McpOutputSchema {
  const properties = isJsonObject(operationResultSchema.properties)
    ? Object.fromEntries(
        Object.keys(operationResultSchema.properties).map((key) => [key, {}]),
      )
    : {};
  const required = Array.isArray(operationResultSchema.required)
    ? operationResultSchema.required.filter(
        (entry): entry is string => typeof entry === "string",
      )
    : [];
  return {
    type: "object",
    properties,
    required,
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
