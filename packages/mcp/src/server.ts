import {
  battleToolDefinitions,
  handleBattleToolCall,
  isBattleToolName,
} from "./battle-tools.ts";
import { decodeBattleToolCall } from "./battle-tool-input.ts";
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
import type { McpCompositionRoot } from "./composition-root.ts";
import { errorContent } from "./tool-content.ts";
import { Either } from "effect";

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
  createMcpCompositionRoot,
  type McpCompositionRoot,
} from "./composition-root.ts";
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
];

export function handleToolCall(
  root: McpCompositionRoot,
  name: string,
  args: unknown,
) {
  if (isCharacterToolName(name)) {
    const decoded = decodeCharacterToolCall({ name, args });
    return Either.isLeft(decoded)
      ? decoded.left
      : handleCharacterToolCall(root, decoded.right);
  }

  if (isContentToolName(name)) {
    const decoded = decodeContentToolCall({ name, args });
    return Either.isLeft(decoded)
      ? decoded.left
      : handleContentToolCall(root, decoded.right);
  }

  if (isBattleToolName(name)) {
    const decoded = decodeBattleToolCall({ name, args });
    return Either.isLeft(decoded)
      ? decoded.left
      : handleBattleToolCall(root, decoded.right);
  }

  return errorContent(`Unknown MCP tool: ${name}`);
}
