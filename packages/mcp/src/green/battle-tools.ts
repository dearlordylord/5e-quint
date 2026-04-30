import {
  resolveBattleSubject,
  snapshotBattle,
  type BattleCreatureState,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
} from "@dnd/battle-runtime";

import type { GreenMcpCompositionRoot } from "./composition-root.ts";
import {
  decodeDiscoverBattleActsArgs,
  decodeEndTurnArgs,
  decodeFillBattleHoleArgs,
  decodeReadBattleStateArgs,
  decodeSelectStatBlockArgs,
  decodeStartBattleArgs,
  discoverBattleActsInputSchema,
  endTurnInputSchema,
  fillBattleHoleInputSchema,
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
      "Return the stored green battle state projection and current battle snapshot, including discoverable battle acts.",
    inputSchema: readBattleStateInputSchema,
  },
  {
    name: "discover_battle_acts",
    description:
      "Return the current battle snapshot and available acts for the current combatant. Supported character and Stat Block attacks expose Attack subjects with an attackName plus End Turn.",
    inputSchema: discoverBattleActsInputSchema,
  },
  {
    name: "fill_battle_hole",
    description:
      "Fill one hole for the current actor's named Attack replay. MCP stores transient target, attack-roll, and damage-result fills until the battle runtime resolves the Attack.",
    inputSchema: fillBattleHoleInputSchema,
  },
  {
    name: "end_turn",
    description:
      "Resolve the current actor's End Turn runtime command and store the returned BattleState.",
    inputSchema: endTurnInputSchema,
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

  if (name === "read_battle_state") {
    const decoded = decodeReadBattleStateArgs(args, name);
    if (isGreenBattleToolError(decoded)) return decoded;
    return jsonContent(
      battleSessionPayload(root, root.sessionStore.battleState),
    );
  }

  if (name === "discover_battle_acts") {
    const decoded = decodeDiscoverBattleActsArgs(args, name);
    if (isGreenBattleToolError(decoded)) return decoded;
    return jsonContent(
      battleSessionPayload(root, root.sessionStore.battleState),
    );
  }

  if (name === "fill_battle_hole") {
    const decoded = decodeFillBattleHoleArgs(args, name);
    if (isGreenBattleToolError(decoded)) return decoded;
    const state = root.sessionStore.battleState;
    if (state == null) return noStoredBattleContent();

    const subject: BattleSubject = {
      tag: "srdAction",
      actorId: decoded.actorId,
      action: "attack",
      attackName: decoded.attackName,
    };
    const previous = root.sessionStore.transientBattleFills;
    if (previous !== null && !sameBattleSubject(previous.subject, subject)) {
      return errorContent("A different battle subject has pending fills.", {
        code: "BATTLE_FILL_SUBJECT_MISMATCH",
        pendingSubject: previous.subject,
        requestedSubject: subject,
      });
    }

    const fills = [...(previous?.fills ?? []), decoded.fill];
    const result = resolveBattleSubject({ state, subject, fills });
    if (result.tag === "resolved") {
      root.sessionStore.battleState = result.state;
      root.sessionStore.transientBattleFills = null;
      return jsonContent(battleResolutionPayload(root, result));
    }
    if (result.tag === "needsHoles") {
      root.sessionStore.transientBattleFills = { subject, fills };
      return jsonContent(battleResolutionPayload(root, result));
    }

    return jsonContent(battleResolutionPayload(root, result));
  }

  if (name === "end_turn") {
    const decoded = decodeEndTurnArgs(args, name);
    if (isGreenBattleToolError(decoded)) return decoded;
    const state = root.sessionStore.battleState;
    if (state == null) return noStoredBattleContent();
    const result = resolveBattleSubject({
      state,
      subject: {
        tag: "runtimeCommand",
        actorId: decoded.actorId,
        command: "endTurn",
      },
      fills: [],
    });
    if (result.tag === "resolved") {
      root.sessionStore.battleState = result.state;
      root.sessionStore.transientBattleFills = null;
    }
    return jsonContent(battleResolutionPayload(root, result));
  }

  const unhandledToolName: never = name;
  return errorContent(
    `Unhandled Surface-runtime battle tool: ${unhandledToolName}`,
  );
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
    snapshot: state === null ? null : snapshotBattle(state),
    session: root.sessionStore.snapshot(),
  };
}

function battleResolutionPayload(
  root: GreenMcpCompositionRoot,
  result: BattleResolutionResult,
) {
  return {
    result,
    battleState:
      result.tag === "resolved" ? battleStateProjection(result.state) : null,
    snapshot: result.snapshot,
    session: root.sessionStore.snapshot(),
  };
}

function noStoredBattleContent() {
  return errorContent("No battle session has been started.", {
    code: "NO_BATTLE_SESSION",
  });
}

function sameBattleSubject(left: BattleSubject, right: BattleSubject): boolean {
  if (left.tag !== right.tag || left.actorId !== right.actorId) return false;
  if (left.tag === "srdAction" && right.tag === "srdAction") {
    return left.action === right.action && left.attackName === right.attackName;
  }
  if (left.tag === "runtimeCommand" && right.tag === "runtimeCommand") {
    return left.command === right.command;
  }

  return false;
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
