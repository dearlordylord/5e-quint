import {
  battleToolDefinitions,
  handleBattleToolCall,
  isBattleToolName,
} from "./battle-tools.ts";
import { decodeBattleToolCall } from "./battle-tool-input.ts";
import { diceToolDefinitions } from "./dice-tool-definitions.ts";
import { decodeDiceToolCall, isDiceToolName } from "./dice-tool-input.ts";
import { handleDiceToolCall } from "./dice-tools.ts";
import {
  characterToolDefinitions,
  handleCharacterToolCall,
  isCharacterToolName,
} from "./character-tools.ts";
import { decodeCharacterToolCall } from "./character-tool-input.ts";
import {
  contentToolDefinitions,
  decodeContentToolCall,
  handleContentToolCall,
  isContentToolName,
} from "./content-tools.ts";
import type {
  McpApplicationServices,
  McpPlaySessionRoot,
} from "./composition-root.ts";
import { errorContent } from "./tool-content.ts";
import { Result } from "effect";
import type { ProtocolToolDefinition } from "./tool-definition-contract.ts";

export {
  battleCreatureInitFromCharacterBuild,
  startBattleFromCharacterBuildAndStatBlock,
  type CharacterBuildCreatureInput,
} from "@dnd/character-battle-runtime";
export {
  battleToolDefinitions,
  handleBattleToolCall,
  isBattleToolName,
  type BattleToolResult,
} from "./battle-tools.ts";
export {
  characterToolDefinitions,
  handleCharacterToolCall,
  isCharacterToolName,
  type CharacterToolResult,
} from "./character-tools.ts";
export {
  contentToolDefinitions,
  handleContentToolCall,
  isContentToolName,
  type ContentToolResult,
} from "./content-tools.ts";
export {
  createMcpApplicationServices,
  createMcpPlaySessionRoot,
  type McpApplicationServices,
  type McpPlaySessionRoot,
} from "./composition-root.ts";
export {
  createPlaySessionRegistry,
  decodePlaySessionId,
  PlaySessionIdSchema,
  type PlaySessionId,
  type PlaySessionRegistry,
  type PlaySessionUnavailable,
} from "./play-session.ts";
export {
  createMcpSessionStore,
  type AvailableCharacterSession,
  type BattleFillSession,
  type CharacterSession,
  type InBattleCharacterSession,
  type McpSessionSnapshot,
  type McpSessionStore,
} from "./session-store.ts";

export const toolDefinitions = [
  ...contentToolDefinitions,
  ...characterToolDefinitions,
  ...battleToolDefinitions,
  ...diceToolDefinitions,
] as const satisfies readonly ProtocolToolDefinition[];

export function handleToolCall(
  root: McpPlaySessionRoot,
  name: string,
  args: unknown,
) {
  if (isCharacterToolName(name)) {
    const decoded = decodeCharacterToolCall({ name, args });
    return Result.isFailure(decoded)
      ? decoded.failure
      : handleCharacterToolCall(root, decoded.success);
  }

  if (isContentToolName(name)) {
    return handleApplicationToolCall(root, name, args);
  }

  if (isBattleToolName(name)) {
    const decoded = decodeBattleToolCall({ name, args });
    return Result.isFailure(decoded)
      ? decoded.failure
      : handleBattleToolCall(root, decoded.success);
  }

  if (isDiceToolName(name)) {
    const decoded = decodeDiceToolCall({ name, args });
    return Result.isFailure(decoded)
      ? decoded.failure
      : handleDiceToolCall(root, decoded.success);
  }

  return errorContent(`Unknown MCP tool: ${name}`);
}

export function handleApplicationToolCall(
  services: McpApplicationServices,
  name: string,
  args: unknown,
) {
  if (isContentToolName(name)) {
    const decoded = decodeContentToolCall({ name, args });
    return Result.isFailure(decoded)
      ? decoded.failure
      : handleContentToolCall(services, decoded.success);
  }

  return errorContent(`Unknown MCP application tool: ${name}`);
}
