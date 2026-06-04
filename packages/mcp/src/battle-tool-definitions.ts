import {
  BATTLE_TOOL_NAMES,
  battleToolNames,
  discoverBattleActsInputSchema,
  endBattleInputSchema,
  endTurnInputSchema,
  fillBattleHoleInputSchema,
  readBattleStateInputSchema,
  resolveBattleActInputSchema,
  selectStatBlockInputSchema,
  type BattleToolName,
} from "./battle-tool-input.ts";
import {
  BattleResolutionOutputSchema,
  BattleSessionOutputSchema,
  EndBattleOutputSchema,
  SelectStatBlockOutputSchema,
  StartBattleOutputSchema,
} from "./battle-tool-output.ts";
import { mcpOutputJsonSchema } from "./schema-codec.ts";
import { startBattleInputSchema } from "./start-battle-tool-input.ts";

export const battleToolDefinitions = [
  {
    name: battleToolNames.selectStatBlock,
    description:
      "Select an SRD Stat Block for the battle session. This stores only the Stat Block id in the MCP session.",
    inputSchema: selectStatBlockInputSchema,
    outputSchema: mcpOutputJsonSchema(SelectStatBlockOutputSchema),
  },
  {
    name: battleToolNames.startBattle,
    description:
      "Start the battle session from finalized Character Builds and the selected SRD Stat Block. The caller must provide Initiative scores for every character combatant and the Stat Block combatant.",
    inputSchema: startBattleInputSchema,
    outputSchema: mcpOutputJsonSchema(StartBattleOutputSchema),
  },
  {
    name: battleToolNames.readBattleState,
    description:
      "Return the current battle-runtime snapshot, including discoverable battle acts, and the MCP session summary.",
    inputSchema: readBattleStateInputSchema,
    outputSchema: mcpOutputJsonSchema(BattleSessionOutputSchema),
  },
  {
    name: battleToolNames.discoverBattleActs,
    description:
      "Return the current battle snapshot and runtime-discovered available acts for the current combatant.",
    inputSchema: discoverBattleActsInputSchema,
    outputSchema: mcpOutputJsonSchema(BattleSessionOutputSchema),
  },
  {
    name: battleToolNames.fillBattleHole,
    description:
      "Fill one hole for a selected battle act subject. MCP stores transient target, spell target allocation, attack-roll, damage-result, and feature-roll fills until the battle runtime resolves the act.",
    inputSchema: fillBattleHoleInputSchema,
    outputSchema: mcpOutputJsonSchema(BattleResolutionOutputSchema),
  },
  {
    name: battleToolNames.resolveBattleAct,
    description:
      "Resolve a selected battle act subject that does not need holes, such as Action Surge.",
    inputSchema: resolveBattleActInputSchema,
    outputSchema: mcpOutputJsonSchema(BattleResolutionOutputSchema),
  },
  {
    name: battleToolNames.endTurn,
    description:
      "Resolve the current actor's End Turn runtime command and store the returned BattleState.",
    inputSchema: endTurnInputSchema,
    outputSchema: mcpOutputJsonSchema(BattleResolutionOutputSchema),
  },
  {
    name: battleToolNames.endBattle,
    description:
      "Finalize the stored battle session and hand character-owned post-battle facts, including current HP, back to durable character session state.",
    inputSchema: endBattleInputSchema,
    outputSchema: mcpOutputJsonSchema(EndBattleOutputSchema),
  },
] as const;

export function isBattleToolName(name: string): name is BattleToolName {
  return BATTLE_TOOL_NAMES.some((toolName) => toolName === name);
}
