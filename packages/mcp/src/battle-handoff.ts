import type { BattleRuntimeSession } from "@dnd/battle-runtime";
import { settleCharacterSheetFromBattle } from "@dnd/character-battle-runtime";
import { Either } from "effect";

import type { McpPlaySessionRoot } from "./composition-root.ts";
import type { AvailableCharacterSession } from "./session-store.ts";
import { errorContent } from "./tool-content.ts";

export function finalizeCharacterSessionsFromBattle(
  root: McpPlaySessionRoot,
  battleSession: BattleRuntimeSession,
): ReturnType<typeof errorContent> | null {
  const state = battleSession.state;
  const settledSessions: AvailableCharacterSession[] = [];
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

    if (session.tag !== "inBattle") {
      return errorContent("Battle character session is not in battle.", {
        code: "CHARACTER_SESSION_NOT_IN_BATTLE",
        characterId,
      });
    }
    const settledSession = settleCharacterSheetFromBattle({
      combatant,
      state,
      context: battleSession.context,
      sheet: session.sheet,
      unitLibrary: root.unitLibrary,
      statBlockCatalog: root.statBlockCatalog,
    });
    if (Either.isLeft(settledSession)) {
      return errorContent("Battle character session handoff failed.", {
        code: "CHARACTER_SESSION_HANDOFF_INVALID",
        characterId,
        message: settledSession.left.message,
      });
    }
    settledSessions.push(settledSession.right);
  }

  const committed = root.sessionStore.characters.setAll(settledSessions);
  if (Either.isLeft(committed)) {
    return errorContent("Battle character session handoff commit failed.", {
      code: "CHARACTER_SESSION_COMMIT_INVALID",
      message: `Character Session registry rejected the battle handoff: ${committed.left.tag}.`,
      affectedCharacterIds: settledSessions.map(
        (session) => session.characterId,
      ),
      recovery: {
        tag: "characterSessionsUnchanged",
        guidance:
          "No Character Session was committed; correct the session conflict and retry end_battle.",
      },
    });
  }

  return null;
}
