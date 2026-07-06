# CRPI-BLOCK-038 History

Task 79 accepted the Character Battle Origin feat selected-reference route
replay through public target handoff route entrypoints.

- Evidence is recorded in `tasks/target-replay-evidence/CRPI-BLOCK-038.json`.
- The copied connector projection is `packages/character-battle-runtime/character-battle-origin-feat-selected-identity.route.mbt.qnt#qRoute`.
- The observed target projection is produced by public `packages/character-battle-runtime/src/index.ts#characterSheetBattleInitWithRoute` and `#startBattleFromCharacterSheetAndStatBlock` route events after public character creation finalization retains the background-granted Origin feat in existing `CharacterBuild` unit refs.
- Task 79 added no durable state fields. `CharacterBuild` remains the canonical selected-reference source; Character Battle exposes only a derived route projection for selected-reference retention and Initiative runtime entry.

Plan Impact:

- Status: `none`
- Affected task: Task 79 / `CRPI-BLOCK-038` is unblocked by accepted copied `qRoute` replay evidence.
- Later character-battle handoff tasks remain unchanged; this task does not add new character creation selection state or battle runtime authored-identity dispatch.
- Required plan edits: none.
