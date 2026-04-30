import {
  resolveBattleSubject,
  snapshotBattle,
  type BattleCreatureState,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
  type CharacterId,
} from "@dnd/battle-runtime";
import type { CharacterDraftId } from "@dnd/character-creation-runtime";
import type { Hp } from "@dnd/shared/types";

import type { McpCompositionRoot } from "./composition-root.ts";
import {
  decodeDiscoverBattleActsArgs,
  decodeEndBattleArgs,
  decodeEndTurnArgs,
  decodeFillBattleHoleArgs,
  decodeReadBattleStateArgs,
  decodeSelectStatBlockArgs,
  decodeStartBattleArgs,
  discoverBattleActsInputSchema,
  endBattleInputSchema,
  endTurnInputSchema,
  fillBattleHoleInputSchema,
  isBattleToolError,
  readBattleStateInputSchema,
  selectStatBlockInputSchema,
  startBattleInputSchema,
} from "./battle-tool-input.ts";
import { startBattleFromCharacterBuildAndStatBlock } from "./battle-creature-init.ts";
import { errorContent, jsonContent } from "./tool-content.ts";

export const battleToolDefinitions = [
  {
    name: "select_stat_block",
    description:
      "Select an SRD Surface Stat Block for the battle session. This stores only the Stat Block id in the MCP session.",
    inputSchema: selectStatBlockInputSchema,
  },
  {
    name: "start_battle",
    description:
      "Start the battle session from a finalized Character Build and the selected SRD Stat Block. The caller must provide Initiative scores for both combatants.",
    inputSchema: startBattleInputSchema,
  },
  {
    name: "read_battle_state",
    description:
      "Return the stored battle state projection and current battle snapshot, including discoverable battle acts.",
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
  {
    name: "end_battle",
    description:
      "Finalize the stored battle session and hand character-owned post-battle facts, including current HP, back to durable character session state.",
    inputSchema: endBattleInputSchema,
  },
] as const;

const BATTLE_TOOL_NAMES = battleToolDefinitions.map(
  (tool) => tool.name,
) satisfies ReadonlyArray<(typeof battleToolDefinitions)[number]["name"]>;
type BattleToolName = (typeof BATTLE_TOOL_NAMES)[number];

export type BattleToolResult =
  | ReturnType<typeof jsonContent>
  | ReturnType<typeof errorContent>;

export function isBattleToolName(name: string): name is BattleToolName {
  return battleToolDefinitions.some((tool) => tool.name === name);
}

export function handleBattleToolCall(
  root: McpCompositionRoot,
  name: string,
  args: unknown,
): BattleToolResult {
  if (!isBattleToolName(name)) {
    return errorContent(`Unknown Surface-runtime battle tool: ${name}`);
  }

  if (name === "select_stat_block") {
    const statBlockId = decodeSelectStatBlockArgs(args, name);
    if (isBattleToolError(statBlockId)) return statBlockId;
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
    if (isBattleToolError(decoded)) return decoded;
    const activeBattle = root.sessionStore.battleState;
    if (activeBattle !== null) {
      return errorContent("A battle session is already active.", {
        code: "BATTLE_SESSION_ALREADY_ACTIVE",
        battleId: activeBattle.battleId,
      });
    }
    const characterSession = root.sessionStore.characters.get(
      decoded.sheetDraftId,
    );
    if (characterSession == null) {
      return errorContent(
        `Unknown finalized character session: ${decoded.sheetDraftId}`,
        {
          code: "UNKNOWN_FINALIZED_CHARACTER_SHEET",
          sheetDraftId: decoded.sheetDraftId,
        },
      );
    }
    if (characterSession.tag !== "available") {
      return errorContent("Character is already assigned to a battle.", {
        code: "CHARACTER_ALREADY_IN_BATTLE",
        sheetDraftId: decoded.sheetDraftId,
        battleId: characterSession.battleId,
      });
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
          build: characterSession.build,
          initiative: decoded.characterInitiative,
          currentHp: characterSession.currentHp,
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
      root.sessionStore.characters.set(decoded.sheetDraftId, {
        tag: "inBattle",
        build: characterSession.build,
        battleId: decoded.battleId,
        characterId: decoded.characterId,
      });

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
    if (isBattleToolError(decoded)) return decoded;
    return jsonContent(
      battleSessionPayload(root, root.sessionStore.battleState),
    );
  }

  if (name === "discover_battle_acts") {
    const decoded = decodeDiscoverBattleActsArgs(args, name);
    if (isBattleToolError(decoded)) return decoded;
    return jsonContent(
      battleSessionPayload(root, root.sessionStore.battleState),
    );
  }

  if (name === "fill_battle_hole") {
    const decoded = decodeFillBattleHoleArgs(args, name);
    if (isBattleToolError(decoded)) return decoded;
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
    if (isBattleToolError(decoded)) return decoded;
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

  if (name === "end_battle") {
    const decoded = decodeEndBattleArgs(args, name);
    if (isBattleToolError(decoded)) return decoded;
    const state = root.sessionStore.battleState;
    if (state == null) return noStoredBattleContent();
    if (root.sessionStore.transientBattleFills !== null) {
      return errorContent("Cannot end battle with pending battle fills.", {
        code: "BATTLE_FILLS_PENDING",
        pendingSubject: root.sessionStore.transientBattleFills.subject,
      });
    }

    const handoff = finalizeCharacterSessionsFromBattle(root, state);
    if (handoff !== null) return handoff;
    root.sessionStore.battleState = null;
    root.sessionStore.transientBattleFills = null;

    return jsonContent({
      endedBattleId: state.battleId,
      characters: Array.from(root.sessionStore.characters.entries()).map(
        ([sourceDraftId, session]) => ({
          sourceDraftId,
          session,
        }),
      ),
      session: root.sessionStore.snapshot(),
    });
  }

  const unhandledToolName: never = name;
  return errorContent(
    `Unhandled Surface-runtime battle tool: ${unhandledToolName}`,
  );
}

function finalizeCharacterSessionsFromBattle(
  root: McpCompositionRoot,
  state: BattleState,
): ReturnType<typeof errorContent> | null {
  const updates: {
    readonly sourceDraftId: CharacterDraftId;
    readonly currentHp: Hp;
  }[] = [];

  for (const combatant of state.combatants.values()) {
    if (combatant.origin.kind !== "character") continue;
    if (combatant.hp === 0) {
      return errorContent(
        "Post-battle handoff for 0 HP characters is outside the first vertical.",
        {
          code: "POST_BATTLE_ZERO_HP_DEFERRED",
          combatantId: combatant.combatantId,
          characterId: combatant.origin.characterId,
        },
      );
    }

    const sourceDraftId = sourceDraftIdForInBattleCharacter(
      root,
      state,
      combatant.origin.characterId,
    );
    if (sourceDraftId === null) {
      return errorContent("Battle character has no matching session record.", {
        code: "UNKNOWN_BATTLE_CHARACTER_SESSION",
        combatantId: combatant.combatantId,
        characterId: combatant.origin.characterId,
      });
    }

    const session = root.sessionStore.characters.get(sourceDraftId);
    if (session?.tag !== "inBattle") {
      return errorContent("Battle character session is not in battle.", {
        code: "CHARACTER_SESSION_NOT_IN_BATTLE",
        sourceDraftId,
      });
    }
    updates.push({
      sourceDraftId,
      currentHp: combatant.hp,
    });
  }

  for (const update of updates) {
    const session = root.sessionStore.characters.get(update.sourceDraftId);
    if (session?.tag !== "inBattle") continue;
    root.sessionStore.characters.set(update.sourceDraftId, {
      tag: "available",
      build: session.build,
      currentHp: update.currentHp,
    });
  }

  return null;
}

function sourceDraftIdForInBattleCharacter(
  root: McpCompositionRoot,
  state: BattleState,
  characterId: CharacterId,
) {
  for (const [sourceDraftId, session] of root.sessionStore.characters) {
    if (
      session.tag === "inBattle" &&
      session.battleId === state.battleId &&
      session.characterId === characterId
    ) {
      return sourceDraftId;
    }
  }

  return null;
}

function unknownStatBlockContent(statBlockId: string, error: unknown) {
  return errorContent(`Unknown Stat Block: ${statBlockId}`, {
    code: "UNKNOWN_STAT_BLOCK",
    statBlockId,
    message: error instanceof Error ? error.message : String(error),
  });
}

function battleSessionPayload(
  root: McpCompositionRoot,
  state: BattleState | null,
) {
  return {
    battleState: state === null ? null : battleStateProjection(state),
    snapshot: state === null ? null : snapshotBattle(state),
    session: root.sessionStore.snapshot(),
  };
}

function battleResolutionPayload(
  root: McpCompositionRoot,
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
