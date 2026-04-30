import {
  characterDraftId,
  draftRevision,
  type CharacterDraft,
  type CharacterDraftId,
  type UnitLibrary,
} from "./types.ts";

let nextDraftOrdinal = 0;

export function createCharacterDraft(input: {
  readonly unitLibrary?: UnitLibrary;
  readonly draftId?: CharacterDraftId;
}): CharacterDraft {
  void input.unitLibrary;

  return {
    draftId:
      input.draftId ?? characterDraftId(`cc:draft:${nextDraftOrdinal++}`),
    selections: {
      choices: [],
    },
    revision: draftRevision(0),
  };
}
