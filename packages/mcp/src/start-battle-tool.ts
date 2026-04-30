import { snapshotBattle } from "@dnd/battle-runtime";

import { startBattleFromCharacterBuildsAndStatBlock } from "./battle-creature-init.ts";
import { battleStateProjection } from "./battle-state-projection.ts";
import { isBattleToolError } from "./battle-tool-input.ts";
import type { McpCompositionRoot } from "./composition-root.ts";
import {
  decodeStartBattleArgs,
  type StartBattleToolInput,
} from "./start-battle-tool-input.ts";
import { errorContent, jsonContent } from "./tool-content.ts";

export function handleStartBattleToolCall(
  root: McpCompositionRoot,
  args: unknown,
) {
  const decoded = decodeStartBattleArgs(args, "start_battle");
  if (isBattleToolError(decoded)) return decoded;
  const activeBattle = root.sessionStore.battleState;
  if (activeBattle !== null) {
    return errorContent("A battle session is already active.", {
      code: "BATTLE_SESSION_ALREADY_ACTIVE",
      battleId: activeBattle.battleId,
    });
  }

  const characterSessions = startBattleCharacterSessions(root, decoded);
  const duplicateInput = duplicateStartBattleInputContent(
    characterSessions.map(({ character }) => character),
    decoded.statBlockCombatantId,
  );
  if (duplicateInput !== null) return duplicateInput;

  const missingCharacter = characterSessions.find(
    (entry) => entry.session == null,
  );
  if (missingCharacter !== undefined) {
    return errorContent(
      `Unknown finalized character session: ${missingCharacter.character.sheetDraftId}`,
      {
        code: "UNKNOWN_FINALIZED_CHARACTER_SHEET",
        sheetDraftId: missingCharacter.character.sheetDraftId,
      },
    );
  }

  const unavailableCharacter = characterSessions.find(
    (entry) => entry.session?.tag !== "available",
  );
  if (unavailableCharacter?.session?.tag === "inBattle") {
    return errorContent("Character is already assigned to a battle.", {
      code: "CHARACTER_ALREADY_IN_BATTLE",
      sheetDraftId: unavailableCharacter.character.sheetDraftId,
      battleId: unavailableCharacter.session.battleId,
    });
  }

  const statBlock = root.sessionStore.getSelectedStatBlock();
  if (statBlock == null) {
    return errorContent("No Stat Block selected for battle.", {
      code: "NO_SELECTED_STAT_BLOCK",
    });
  }

  try {
    const state = startBattleFromCharacterBuildsAndStatBlock({
      battleId: decoded.battleId,
      characters: characterSessions.map(({ character, session }) => {
        if (session?.tag !== "available") {
          throw new Error("Character session is not available.");
        }
        return {
          combatantId: character.combatantId,
          characterId: character.characterId,
          displayName: character.displayName,
          build: session.build,
          initiative: character.initiative,
          currentHp: session.currentHp,
        };
      }),
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
    for (const { character, session } of characterSessions) {
      if (session?.tag !== "available") continue;
      root.sessionStore.characters.set(character.sheetDraftId, {
        tag: "inBattle",
        build: session.build,
        battleId: decoded.battleId,
        characterId: character.characterId,
      });
    }

    return jsonContent({
      battleState: battleStateProjection(state),
      snapshot: snapshotBattle(state),
      session: root.sessionStore.snapshot(),
    });
  } catch (error) {
    return errorContent("Battle session start failed.", {
      code: "BATTLE_START_FAILED",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function startBattleCharacterSessions(
  root: McpCompositionRoot,
  decoded: StartBattleToolInput,
) {
  const characterInputs = [
    {
      sheetDraftId: decoded.sheetDraftId,
      combatantId: decoded.characterCombatantId,
      characterId: decoded.characterId,
      displayName: decoded.characterDisplayName,
      initiative: decoded.characterInitiative,
    },
    ...decoded.additionalCharacters.map((character) => ({
      sheetDraftId: character.sheetDraftId,
      combatantId: character.characterCombatantId,
      characterId: character.characterId,
      displayName: character.characterDisplayName,
      initiative: character.characterInitiative,
    })),
  ];

  return characterInputs.map((character) => ({
    character,
    session: root.sessionStore.characters.get(character.sheetDraftId),
  }));
}

type StartBattleCharacterInput = ReturnType<
  typeof startBattleCharacterSessions
>[number]["character"];

function duplicateStartBattleInputContent(
  characters: readonly StartBattleCharacterInput[],
  statBlockCombatantId: StartBattleToolInput["statBlockCombatantId"],
) {
  const duplicateSheetDraftId = firstDuplicate(
    characters.map((character) => character.sheetDraftId),
  );
  if (duplicateSheetDraftId !== null) {
    return errorContent(
      "Duplicate finalized character sheet in battle start.",
      {
        code: "DUPLICATE_BATTLE_CHARACTER_SHEET",
        sheetDraftId: duplicateSheetDraftId,
      },
    );
  }

  const duplicateCharacterId = firstDuplicate(
    characters.map((character) => character.characterId),
  );
  if (duplicateCharacterId !== null) {
    return errorContent("Duplicate character id in battle start.", {
      code: "DUPLICATE_BATTLE_CHARACTER_ID",
      characterId: duplicateCharacterId,
    });
  }

  const duplicateCombatantId = firstDuplicate([
    ...characters.map((character) => character.combatantId),
    statBlockCombatantId,
  ]);
  if (duplicateCombatantId !== null) {
    return errorContent("Duplicate combatant id in battle start.", {
      code: "DUPLICATE_BATTLE_COMBATANT_ID",
      combatantId: duplicateCombatantId,
    });
  }

  return null;
}

function firstDuplicate<T>(values: readonly T[]): T | null {
  const seen = new Set<T>();
  for (const value of values) {
    if (seen.has(value)) return value;
    seen.add(value);
  }
  return null;
}
