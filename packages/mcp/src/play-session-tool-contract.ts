import type { BattleToolName } from "./battle-tool-input.ts";
import type { CharacterToolName } from "./character-tool-input.ts";
import type { DiceToolName } from "./dice-tool-input.ts";
import type { McpObjectInputSchema, McpOutputSchema } from "./schema-codec.ts";
import {
  deleteSavedPlaySessionInputSchema,
  deleteSavedPlaySessionOutputSchema,
  emptyInputSchema,
  playSessionInputSchema,
  playSessionLifecycleOutputSchema,
  playSessionOperationOutputSchema,
  playSessionRoutedInputSchema,
  savePlaySessionInputSchema,
  savedManagementOutputSchema,
  savedPlaySessionSummarySchema,
} from "./play-session-tool-schema.ts";
import {
  PLAY_SESSION_TOOL_NAMES,
  playSessionToolNames,
  type PlaySessionToolName,
} from "./play-session-tool-names.ts";
import {
  DESTRUCTIVE_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
  NON_DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
  READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
  SAVED_PLAY_SESSION_SECURITY_SCHEMES,
  type ProtocolToolDefinition,
} from "./tool-definition-contract.ts";

export {
  PLAY_SESSION_NEXT_OPERATION_NAMES,
  PLAY_SESSION_OPERATION_NAMES,
  PLAY_SESSION_TOOL_NAMES,
  playSessionToolNames,
  type PlaySessionNextOperationName,
  type PlaySessionOperationName,
  type PlaySessionToolName,
} from "./play-session-tool-names.ts";
export const PLAY_SESSION_OUTPUT_SCHEMA_BYTE_BUDGET = 700_000;

export const playSessionToolDefinitions = [
  {
    name: playSessionToolNames.create,
    title: "Create Play Session",
    description:
      "Create an isolated Play Session. Anonymous creation returns a temporary-session guest access grant; authenticated creation is saved by default.",
    inputSchema: emptyInputSchema,
    annotations: NON_DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: playSessionLifecycleOutputSchema(
      playSessionToolNames.create,
      "playSessionCreated",
    ),
  },
  {
    name: playSessionToolNames.read,
    title: "Read Play Session",
    description:
      "Resume an accessible Play Session and return its persistence status, current projection, unresolved inputs, and relevant next operations.",
    inputSchema: playSessionInputSchema,
    annotations: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: playSessionLifecycleOutputSchema(
      playSessionToolNames.read,
      "playSessionResumed",
    ),
  },
  {
    name: playSessionToolNames.save,
    title: "Save Play Session",
    description:
      "Claim this temporary Guest Play Session for the authenticated user without copying it.",
    inputSchema: savePlaySessionInputSchema,
    annotations: DESTRUCTIVE_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
    securitySchemes: SAVED_PLAY_SESSION_SECURITY_SCHEMES,
    outputSchema: savedManagementOutputSchema("playSessionSaved"),
  },
  {
    name: playSessionToolNames.listSaved,
    title: "List Saved Play Sessions",
    description:
      "List the authenticated user's saved Play Sessions for explicit selection and resume.",
    inputSchema: emptyInputSchema,
    annotations: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
    securitySchemes: SAVED_PLAY_SESSION_SECURITY_SCHEMES,
    outputSchema: {
      type: "object",
      properties: {
        tag: { const: "savedPlaySessionsListed" },
        sessions: { type: "array", items: savedPlaySessionSummarySchema() },
      },
      required: ["tag", "sessions"],
      additionalProperties: false,
    },
  },
  {
    name: playSessionToolNames.deleteSaved,
    title: "Delete Saved Play Session",
    description:
      "Permanently delete one saved Play Session owned by the authenticated user.",
    inputSchema: deleteSavedPlaySessionInputSchema,
    annotations: DESTRUCTIVE_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
    securitySchemes: SAVED_PLAY_SESSION_SECURITY_SCHEMES,
    outputSchema: deleteSavedPlaySessionOutputSchema,
  },
] as const satisfies readonly ProtocolToolDefinition[];

export function statefulPlaySessionToolDefinition<
  Definition extends {
    readonly name: string;
    readonly title: string;
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
