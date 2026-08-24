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
  BattleLifecycleOutputSchema,
  BattleSessionOutputSchema,
  EndBattleOutputSchema,
  SelectStatBlockOutputSchema,
  StartBattleOutputSchema,
} from "./battle-tool-output.ts";
import {
  mcpModelOutputJsonSchema,
  mcpOutputJsonSchema,
} from "./schema-codec.ts";
import { battleLifecycleInputSchema } from "./battle-lifecycle-tool-input.ts";
import { startBattleInputSchema } from "./start-battle-tool-input.ts";
import {
  DESTRUCTIVE_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
  DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
  IDEMPOTENT_NON_DESTRUCTIVE_CLOSED_WORLD_TOOL_ANNOTATIONS,
  READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
  type ProtocolToolDefinition,
} from "./tool-definition-contract.ts";

export const battleToolDefinitions = [
  {
    name: battleToolNames.selectStatBlock,
    title: "Select Stat Block",
    description:
      "Select an SRD Stat Block for the battle session. This stores only the Stat Block id in the MCP session.",
    inputSchema: selectStatBlockInputSchema,
    annotations: IDEMPOTENT_NON_DESTRUCTIVE_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: mcpOutputJsonSchema(SelectStatBlockOutputSchema),
  },
  {
    name: battleToolNames.startBattle,
    title: "Start Battle",
    description:
      "Start a battle session from finalized Character Builds and the selected SRD Stat Block. The caller must provide Initiative scores for every combatant; choose initialSetup to keep the SDK-owned Initiative setup open for the battle_lifecycle surface.",
    inputSchema: startBattleInputSchema,
    annotations: DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: mcpModelOutputJsonSchema(StartBattleOutputSchema),
  },
  {
    name: battleToolNames.battleLifecycle,
    title: "Update Battle Lifecycle",
    description:
      "Apply one Battle lifecycle operation: swap Initiative with a willing ally or finalize initial setup, or atomically add/remove a supported Character Session or installed Stat Block combatant while the Battle is active.",
    inputSchema: battleLifecycleInputSchema,
    annotations: DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: mcpModelOutputJsonSchema(BattleLifecycleOutputSchema),
  },
  {
    name: battleToolNames.readBattleState,
    title: "Read Battle State",
    description:
      "Return the current battle-runtime snapshot, including discoverable battle acts, and the MCP session summary.",
    inputSchema: readBattleStateInputSchema,
    annotations: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: mcpModelOutputJsonSchema(BattleSessionOutputSchema),
  },
  {
    name: battleToolNames.discoverBattleActs,
    title: "Discover Battle Acts",
    description:
      "Return the current battle snapshot and runtime-discovered available acts for the current combatant.",
    inputSchema: discoverBattleActsInputSchema,
    annotations: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: mcpModelOutputJsonSchema(BattleSessionOutputSchema),
  },
  {
    name: battleToolNames.fillBattleHole,
    title: "Fill Battle Hole",
    description:
      "Fill one hole for a selected battle act subject. MCP stores transient fills until the battle runtime has enough table facts to resolve the act.",
    inputSchema: fillBattleHoleInputSchema,
    annotations: DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: mcpModelOutputJsonSchema(BattleResolutionOutputSchema),
  },
  {
    name: battleToolNames.resolveBattleAct,
    title: "Resolve Battle Act",
    description:
      "Resolve a selected battle act subject that does not need holes, such as Action Surge.",
    inputSchema: resolveBattleActInputSchema,
    annotations: DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: mcpModelOutputJsonSchema(BattleResolutionOutputSchema),
  },
  {
    name: battleToolNames.endTurn,
    title: "End Turn",
    description:
      "Resolve the current actor's End Turn runtime command and store the updated battle session.",
    inputSchema: endTurnInputSchema,
    annotations: DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: mcpModelOutputJsonSchema(BattleResolutionOutputSchema),
  },
  {
    name: battleToolNames.endBattle,
    title: "End Battle",
    description:
      "Finalize the stored battle session and hand character-owned post-battle facts, including current HP, back to durable character session state.",
    inputSchema: endBattleInputSchema,
    annotations: DESTRUCTIVE_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: mcpOutputJsonSchema(EndBattleOutputSchema),
  },
] as const satisfies readonly ProtocolToolDefinition[];

export function isBattleToolName(name: string): name is BattleToolName {
  return BATTLE_TOOL_NAMES.some((toolName) => toolName === name);
}
