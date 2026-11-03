import {
  createCharacterDraft,
  type CharacterDraftId,
} from "@dnd/character-creation-runtime";
import type { McpPlaySessionRoot } from "./composition-root.ts";
import { characterIdFromDraftId } from "./session-store.ts";

export function createDraftForSession(
  root: McpPlaySessionRoot,
  draftId: CharacterDraftId | undefined,
) {
  if (draftId !== undefined)
    return createCharacterDraft({ unitLibrary: root.unitLibrary, draftId });
  const ownedCount =
    root.sessionStore.drafts.size + root.sessionStore.characters.size;
  let draft = createCharacterDraft({ unitLibrary: root.unitLibrary });
  for (let retries = 0; retries < ownedCount; retries++) {
    if (
      !root.sessionStore.drafts.has(draft.draftId) &&
      !root.sessionStore.characters.has(characterIdFromDraftId(draft.draftId))
    )
      return draft;
    draft = createCharacterDraft({ unitLibrary: root.unitLibrary });
  }
  return draft;
}
