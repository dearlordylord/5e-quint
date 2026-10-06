import type { McpToolSurface } from "../mcp-tool-surface.ts";
import type { ProtocolToolDefinition } from "../tool-definition-contract.ts";
import { playSessionToolDefinitionsByName } from "../play-session-tool-contract.ts";
import { battleToolDefinitionsByName } from "../battle-tool-definitions.ts";
import { characterToolDefinitionsByName } from "../character-tool-definitions.ts";
import { diceToolDefinitionsByName } from "../dice-tool-definitions.ts";
import {
  canonicalMcpOutputSchema,
  mcpOutputJsonSchema,
} from "../schema-codec.ts";
import { embeddedSchema } from "../json-schema-embedding.ts";
import { BattlePendingProcedureSchema } from "@dnd/battle-runtime";
import {
  isChatGptStatefulToolName,
  playSessionProjectionOperationName,
  type ChatGptStatefulToolName,
} from "./protocol-operation.ts";

// Derive the review grammar from the same owners used by execution and replay.
const operationDefinitions = {
  ...playSessionToolDefinitionsByName,
  ...battleToolDefinitionsByName,
  ...characterToolDefinitionsByName,
  ...diceToolDefinitionsByName,
};

const pendingProcedure = embeddedSchema(
  mcpOutputJsonSchema(BattlePendingProcedureSchema),
  "CanonicalBattlePendingProcedure",
);

function canonicalChatGptOperationOutputSchema(name: ChatGptStatefulToolName) {
  return canonicalMcpOutputSchema(
    operationDefinitions[playSessionProjectionOperationName(name)].outputSchema,
  );
}

export function canonicalToolDefinitionForSurface(
  definition: ProtocolToolDefinition,
  surface: McpToolSurface,
): ProtocolToolDefinition {
  const outputSchema =
    definition.outputSchema === undefined
      ? surface === "chatgpt" && isChatGptStatefulToolName(definition.name)
        ? canonicalChatGptOperationOutputSchema(definition.name)
        : undefined
      : canonicalMcpOutputSchema(definition.outputSchema);
  if (outputSchema === undefined) return definition;
  // Every stateful operation can return the same recovery envelope while a
  // Battle is pending. Retain its procedure owner even when the advertised
  // projection or the unwrapped operation result omits the continuation.
  const reviewOutputSchema = hasBattleRecoveryOutput(definition.name, surface)
    ? {
        ...outputSchema,
        $defs: {
          ...outputDefinitions(outputSchema),
          ...pendingProcedure.definitions,
          CanonicalBattlePendingProcedure: pendingProcedure.schema,
        },
      }
    : outputSchema;
  return { ...definition, outputSchema: reviewOutputSchema };
}

function hasBattleRecoveryOutput(
  name: string,
  surface: McpToolSurface,
): boolean {
  return (
    surface === "chatgpt" &&
    (isChatGptStatefulToolName(name) ||
      name === "create_play_session" ||
      name === "read_play_session")
  );
}

function outputDefinitions(schema: Readonly<Record<string, unknown>>) {
  return typeof schema.$defs === "object" &&
    schema.$defs !== null &&
    !Array.isArray(schema.$defs)
    ? schema.$defs
    : {};
}
