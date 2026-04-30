import {
  battleToolDefinitions,
  handleBattleToolCall,
  isBattleToolName,
} from "./battle-tools.ts";
import {
  characterToolDefinitions,
  handleCharacterToolCall,
  isCharacterToolName,
} from "./character-tools.ts";
import type { McpCompositionRoot } from "./composition-root.ts";
import { errorContent } from "./tool-content.ts";

export {
  battleCreatureInitFromCharacterBuild,
  startBattleFromCharacterBuildAndStatBlock,
  type CharacterBuildCreatureInput,
} from "./battle-creature-init.ts";
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
  ...characterToolDefinitions,
  ...battleToolDefinitions,
];

export function handleToolCall(
  root: McpCompositionRoot,
  name: string,
  args: unknown,
) {
  if (isCharacterToolName(name)) {
    return handleCharacterToolCall(root, name, args);
  }

  if (isBattleToolName(name)) {
    return handleBattleToolCall(root, name, args);
  }

  return errorContent(`Unknown Surface-runtime MCP tool: ${name}`);
}
