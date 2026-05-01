import type {
  BattleState,
  CharacterBattleSpellSlotState,
  CharacterId,
} from "@dnd/battle-runtime";
import type { CharacterDraftId } from "@dnd/character-creation-runtime";
import type { Hp } from "@dnd/shared/types";

import type { McpCompositionRoot } from "./composition-root.ts";
import { availableCharacterSession } from "./session-store.ts";
import { errorContent } from "./tool-content.ts";

export function finalizeCharacterSessionsFromBattle(
  root: McpCompositionRoot,
  state: BattleState,
): ReturnType<typeof errorContent> | null {
  const updates: {
    readonly sourceDraftId: CharacterDraftId;
    readonly currentHp: Hp;
    readonly spellSlots?: readonly CharacterBattleSpellSlotState[];
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
      ...(combatant.origin.spellcasting === undefined
        ? {}
        : { spellSlots: combatant.origin.spellcasting.spellSlots }),
    });
  }

  for (const update of updates) {
    const session = root.sessionStore.characters.get(update.sourceDraftId);
    if (session?.tag !== "inBattle") continue;
    root.sessionStore.characters.set(
      update.sourceDraftId,
      availableCharacterSession({
        characterId: session.characterId,
        build: session.build,
        currentHp: update.currentHp,
        spellSlots: update.spellSlots,
      }),
    );
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
