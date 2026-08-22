import { Either } from "effect";
import type { CharacterSheetId } from "@dnd/character-sheet-runtime";

import type {
  CharacterSession,
  CharacterSessionRegistry,
  CharacterSessionRegistryIssue,
} from "./session-store.ts";

type CharacterId = CharacterSheetId;

export function createCharacterSessionRegistry(): CharacterSessionRegistry {
  let sessions = new Map<CharacterId, CharacterSession>();
  return {
    get size() {
      return sessions.size;
    },
    get(characterId: CharacterId): CharacterSession | undefined {
      return sessions.get(characterId);
    },
    has(characterId: CharacterId): boolean {
      return sessions.has(characterId);
    },
    set(session: CharacterSession): void {
      sessions.set(characterSessionId(session), session);
    },
    setAll(nextSessions: readonly CharacterSession[]) {
      const nextIds = new Set<CharacterId>();
      for (const session of nextSessions) {
        const id = characterSessionId(session);
        if (nextIds.has(id)) {
          return Either.left({
            tag: "duplicateCharacterSession",
            characterId: id,
          } satisfies CharacterSessionRegistryIssue);
        }
        if (!sessions.has(id)) {
          return Either.left({
            tag: "unknownCharacterSession",
            characterId: id,
          } satisfies CharacterSessionRegistryIssue);
        }
        nextIds.add(id);
      }
      const next = new Map(sessions);
      for (const session of nextSessions) {
        next.set(characterSessionId(session), session);
      }
      sessions = next;
      return Either.right(undefined);
    },
    entries(): IterableIterator<readonly [CharacterId, CharacterSession]> {
      return sessions.entries();
    },
    keys(): IterableIterator<CharacterId> {
      return sessions.keys();
    },
  };
}

function characterSessionId(session: CharacterSession): CharacterId {
  return session.tag === "inBattle"
    ? session.sheet.characterId
    : session.characterId;
}
