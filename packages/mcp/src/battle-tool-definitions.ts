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
import { MODEL_OUTPUT_SCHEMA_MAX_DEPTH } from "./model-output-json-schema.ts";
import {
  mcpModelOutputJsonSchema,
  mcpOutputJsonSchema,
} from "./schema-codec.ts";
import { battleLifecycleInputSchema } from "./battle-lifecycle-tool-input.ts";
import { startBattleInputSchema } from "./start-battle-tool-input.ts";
import {
  DESTRUCTIVE_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
  DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
  READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
  type ProtocolToolDefinition,
} from "./tool-definition-contract.ts";

const BATTLE_MODEL_OUTPUT_SCHEMA_OPTIONS = {
  maxDepth: MODEL_OUTPUT_SCHEMA_MAX_DEPTH,
} as const;

export const battleToolDefinitions = [
  {
    name: battleToolNames.selectStatBlock,
    title: "Select Stat Block",
    description:
      "Select an SRD Stat Block for the battle session. This stores only the Stat Block id in the MCP session.",
    inputSchema: selectStatBlockInputSchema,
    annotations: DESTRUCTIVE_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: mcpOutputJsonSchema(SelectStatBlockOutputSchema),
  },
  {
    name: battleToolNames.startBattle,
    title: "Start Battle",
    description:
      "Start a battle session from finalized Character Builds and selected SRD Stat Blocks. When list_stat_blocks exposes alternative Sizes, provide one authored size on that Stat Block combatant. The caller must provide Initiative scores for every combatant; choose initialSetup to keep the SDK-owned Initiative setup open for the battle_lifecycle surface.",
    inputSchema: startBattleInputSchema,
    annotations: DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: mcpModelOutputJsonSchema(
      StartBattleOutputSchema,
      BATTLE_MODEL_OUTPUT_SCHEMA_OPTIONS,
    ),
  },
  {
    name: battleToolNames.battleLifecycle,
    title: "Update Battle Lifecycle",
    description:
      "Apply one Battle lifecycle operation: swap Initiative with a willing ally or finalize initial setup, or atomically add/remove a supported Character Session or installed Stat Block combatant while the Battle is active.",
    inputSchema: battleLifecycleInputSchema,
    annotations: DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: mcpModelOutputJsonSchema(
      BattleLifecycleOutputSchema,
      BATTLE_MODEL_OUTPUT_SCHEMA_OPTIONS,
    ),
  },
  {
    name: battleToolNames.readBattleState,
    title: "Read Battle State",
    description:
      "Return the current battle-runtime checkpoint/frontier envelope and MCP session summary.",
    inputSchema: readBattleStateInputSchema,
    annotations: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: mcpModelOutputJsonSchema(
      BattleSessionOutputSchema,
      BATTLE_MODEL_OUTPUT_SCHEMA_OPTIONS,
    ),
  },
  {
    name: battleToolNames.discoverBattleActs,
    title: "Discover Battle Acts",
    description:
      "Read the Battle's current checkpoint/frontier and available acts without changing state. Call after start_battle or any Battle mutation to learn whether setup, pending holes, or executable acts are present; copy a returned subject exactly into resolve_battle_act when initialHoles is empty, otherwise use fill_battle_hole. If the frontier contains pending holes or an interrupt decision, finish it before choosing another act. Returns the same envelope as read_battle_state.",
    inputSchema: discoverBattleActsInputSchema,
    annotations: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: mcpModelOutputJsonSchema(
      BattleSessionOutputSchema,
      BATTLE_MODEL_OUTPUT_SCHEMA_OPTIONS,
    ),
  },
  {
    name: battleToolNames.fillBattleHole,
    title: "Fill Battle Hole",
    description:
      "Fill one hole for a selected battle act subject. MCP retains the base session, subject, and accepted fills while the battle runtime advances the checkpoint/frontier envelope.",
    inputSchema: fillBattleHoleInputSchema,
    annotations: DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: mcpModelOutputJsonSchema(
      BattleResolutionOutputSchema,
      BATTLE_MODEL_OUTPUT_SCHEMA_OPTIONS,
    ),
  },
  {
    name: battleToolNames.resolveBattleAct,
    title: "Resolve Battle Act",
    description:
      "Execute a currently available Battle act whose initialHoles is empty, using its exact subject from discover_battle_acts. This requires an active Battle with no pending fills; use fill_battle_hole for acts that require input. The operation applies the act's effects and resource costs, stores the updated Battle, and may return further required input or reactions. Do not repeat a successful call blindly; creatureFalls also accepts table-supplied reactionSpellTargetFacts.",
    inputSchema: resolveBattleActInputSchema,
    annotations: DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: mcpModelOutputJsonSchema(
      BattleResolutionOutputSchema,
      BATTLE_MODEL_OUTPUT_SCHEMA_OPTIONS,
    ),
  },
  {
    name: battleToolNames.endTurn,
    title: "End Turn",
    description:
      "End the current combatant's turn in an active Battle after all pending fills are resolved. Use actorId for the current actor in the returned Battle state. The operation applies end-of-turn effects and stores the result; the response may require hole fills or reaction decisions before play advances. Continue from the returned frontier with fill_battle_hole when required. Use end_battle to finish the entire Battle.",
    inputSchema: endTurnInputSchema,
    annotations: DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
    outputSchema: mcpModelOutputJsonSchema(
      BattleResolutionOutputSchema,
      BATTLE_MODEL_OUTPUT_SCHEMA_OPTIONS,
    ),
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
