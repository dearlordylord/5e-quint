import type { McpToolSurface } from "../mcp-tool-surface.ts";
import type { ProtocolToolDefinition } from "../tool-definition-contract.ts";
import { playSessionToolDefinitionsByName } from "../play-session-tool-contract.ts";
import { battleToolDefinitionsByName } from "../battle-tool-definitions.ts";
import { characterToolDefinitionsByName } from "../character-tool-definitions.ts";
import { diceToolDefinitionsByName } from "../dice-tool-definitions.ts";
import { canonicalMcpOutputSchema } from "../schema-codec.ts";
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
  return { ...definition, outputSchema };
}
