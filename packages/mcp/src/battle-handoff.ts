import type { BattleState } from "@dnd/battle-runtime";
import {
  applyBattleCompanionHandoffToCharacterSheet,
  applyBattleHandoffToCharacterSheet,
} from "@dnd/character-battle-runtime";
import { Either } from "effect";

import type { McpCompositionRoot } from "./composition-root.ts";
import { errorContent } from "./tool-content.ts";

export function finalizeCharacterSessionsFromBattle(
  root: McpCompositionRoot,
  state: BattleState,
): ReturnType<typeof errorContent> | null {
  for (const combatant of state.combatants.values()) {
    if (combatant.origin.kind !== "character") continue;

    const characterId = combatant.origin.characterId;
    const session = root.sessionStore.characters.get(characterId);
    if (session == null) {
      return errorContent("Battle character has no matching session record.", {
        code: "UNKNOWN_BATTLE_CHARACTER_SESSION",
        combatantId: combatant.combatantId,
        characterId,
      });
    }

    if (session?.tag !== "inBattle") {
      return errorContent("Battle character session is not in battle.", {
        code: "CHARACTER_SESSION_NOT_IN_BATTLE",
        characterId,
      });
    }
    const availableSession = applyBattleHandoffToCharacterSheet({
      combatant,
      sheet: session.sheet,
      unitLibrary: root.unitLibrary,
      statBlockCatalog: root.statBlockCatalog,
    });
    if (Either.isLeft(availableSession)) {
      return errorContent("Battle character session handoff failed.", {
        code: "CHARACTER_SESSION_HANDOFF_INVALID",
        characterId,
        message: availableSession.left.message,
      });
    }
    const withCompanion = applyBattleCompanionHandoffToCharacterSheet({
      sheet: availableSession.right,
      state,
      ownerCombatantId: combatant.combatantId,
    });
    if (Either.isLeft(withCompanion)) {
      return errorContent("Battle companion session handoff failed.", {
        code: "COMPANION_SESSION_HANDOFF_INVALID",
        characterId,
        message: withCompanion.left.message,
      });
    }
    root.sessionStore.characters.set(withCompanion.right);
  }

  return null;
}
