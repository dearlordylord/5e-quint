import {
  snapshotBattle,
  type BattleCreatureState,
  type BattleState,
} from "@dnd/battle-runtime";

import type { GreenMcpCompositionRoot } from "./composition-root.ts";
import {
  decodeReadBattleStateArgs,
  decodeSelectStatBlockArgs,
  decodeStartBattleArgs,
  isGreenBattleToolError,
  readBattleStateInputSchema,
  selectStatBlockInputSchema,
  startBattleInputSchema,
} from "./battle-tool-input.ts";
import { startBattleFromCharacterBuildAndStatBlock } from "./battle-creature-init.ts";
import { errorContent, jsonContent } from "../tool-content.ts";

export const greenBattleToolDefinitions = [
  {
    name: "select_stat_block",
    description:
      "Select an SRD Surface Stat Block for the partial green battle session shell. This stores only the Stat Block id in the MCP session.",
    inputSchema: selectStatBlockInputSchema,
  },
  {
    name: "start_battle",
    description:
      "Start the partial green battle session shell from a finalized Character Build and the selected SRD Stat Block. The caller must provide Initiative scores for both combatants.",
    inputSchema: startBattleInputSchema,
  },
  {
    name: "read_battle_state",
    description:
      "Return the stored partial green battle state projection and current battle snapshot. This shell does not accept battle acts yet.",
    inputSchema: readBattleStateInputSchema,
  },
] as const;

const GREEN_BATTLE_TOOL_NAMES = greenBattleToolDefinitions.map(
  (tool) => tool.name,
) satisfies ReadonlyArray<(typeof greenBattleToolDefinitions)[number]["name"]>;
type GreenBattleToolName = (typeof GREEN_BATTLE_TOOL_NAMES)[number];

export type GreenBattleToolResult =
  | ReturnType<typeof jsonContent>
  | ReturnType<typeof errorContent>;

export function isGreenBattleToolName(
  name: string,
): name is GreenBattleToolName {
  return greenBattleToolDefinitions.some((tool) => tool.name === name);
}

export function handleGreenBattleToolCall(
  root: GreenMcpCompositionRoot,
  name: string,
  args: unknown,
): GreenBattleToolResult {
  if (!isGreenBattleToolName(name)) {
    return errorContent(`Unknown Surface-runtime battle tool: ${name}`);
  }

  if (name === "select_stat_block") {
    const statBlockId = decodeSelectStatBlockArgs(args, name);
    if (isGreenBattleToolError(statBlockId)) return statBlockId;
    try {
      const selected = root.sessionStore.selectStatBlock(statBlockId);
      return jsonContent({
        selectedStatBlock: selected,
        session: root.sessionStore.snapshot(),
      });
    } catch (error) {
      return unknownStatBlockContent(statBlockId, error);
    }
  }

  if (name === "start_battle") {
    const decoded = decodeStartBattleArgs(args, name);
    if (isGreenBattleToolError(decoded)) return decoded;
    const sheet = root.sessionStore.sheets.get(decoded.sheetDraftId);
    if (sheet == null) {
      return errorContent(
        `Unknown finalized character sheet: ${decoded.sheetDraftId}`,
        {
          code: "UNKNOWN_FINALIZED_CHARACTER_SHEET",
          sheetDraftId: decoded.sheetDraftId,
        },
      );
    }
    const statBlock = root.sessionStore.getSelectedStatBlock();
    if (statBlock == null) {
      return errorContent("No Stat Block selected for battle.", {
        code: "NO_SELECTED_STAT_BLOCK",
      });
    }

    try {
      const state = startBattleFromCharacterBuildAndStatBlock({
        battleId: decoded.battleId,
        character: {
          combatantId: decoded.characterCombatantId,
          characterId: decoded.characterId,
          displayName: decoded.characterDisplayName,
          build: sheet,
          initiative: decoded.characterInitiative,
          ...(decoded.characterCurrentHp === undefined
            ? {}
            : { currentHp: decoded.characterCurrentHp }),
          ...(decoded.characterTempHp === undefined
            ? {}
            : { tempHp: decoded.characterTempHp }),
        },
        statBlockBattleInput: {
          combatantId: decoded.statBlockCombatantId,
          statBlock,
          initiative: decoded.statBlockInitiative,
          ...(decoded.statBlockCurrentHp === undefined
            ? {}
            : { currentHp: decoded.statBlockCurrentHp }),
          ...(decoded.statBlockTempHp === undefined
            ? {}
            : { tempHp: decoded.statBlockTempHp }),
        },
        unitLibrary: root.unitLibrary,
      });
      root.sessionStore.battleState = state;
      root.sessionStore.transientBattleFills = null;

      return jsonContent(battleSessionPayload(root, state));
    } catch (error) {
      return errorContent("Battle session start failed.", {
        code: "BATTLE_START_FAILED",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const decoded = decodeReadBattleStateArgs(args, name);
  if (isGreenBattleToolError(decoded)) return decoded;
  return jsonContent(battleSessionPayload(root, root.sessionStore.battleState));
}

function unknownStatBlockContent(statBlockId: string, error: unknown) {
  return errorContent(`Unknown Stat Block: ${statBlockId}`, {
    code: "UNKNOWN_STAT_BLOCK",
    statBlockId,
    message: error instanceof Error ? error.message : String(error),
  });
}

function battleSessionPayload(
  root: GreenMcpCompositionRoot,
  state: BattleState | null,
) {
  return {
    battleState: state === null ? null : battleStateProjection(state),
    snapshot: state === null ? null : battleShellSnapshot(state),
    session: root.sessionStore.snapshot(),
  };
}

function battleShellSnapshot(state: BattleState) {
  const { acts: _acts, ...snapshot } = snapshotBattle(state);
  return snapshot;
}

function battleStateProjection(state: BattleState) {
  return {
    battleId: state.battleId,
    initiative: state.initiative,
    combatants: Array.from(state.combatants.values()).map(
      battleCreatureStateProjection,
    ),
    currentTurnResources: state.currentTurnResources,
  };
}

function battleCreatureStateProjection(combatant: BattleCreatureState) {
  return {
    combatantId: combatant.combatantId,
    displayName: combatant.displayName,
    initiative: combatant.initiative,
    hp: combatant.hp,
    maxHp: combatant.maxHp,
    tempHp: combatant.tempHp,
    originKind: combatant.origin.kind,
    zeroHpLifecycle: combatant.zeroHpLifecycle,
  };
}
