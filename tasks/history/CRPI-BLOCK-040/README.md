# CRPI-BLOCK-040 History

Task 83 accepts the Character Sheet feature-resource route replay through
existing Character Sheet, Character Battle resource projection, and Battle
Runtime owners.

- Evidence is recorded in `tasks/target-replay-evidence/CRPI-BLOCK-040.json`.
- The copied connector projection is `packages/character-battle-runtime/character-sheet-feature-resources.route.mbt.qnt#qRoute`.
- The observed target projection is produced by public Character Sheet resource
  and rest entrypoints, Font of Magic conversion entrypoints, Uncanny
  Metabolism Initiative recovery, Character Battle handoff public-result route projection,
  and the public Battle Runtime start/discover/resolve spell action path plus
  settlement bridge exercised by
  `packages/character-battle-runtime/src/character-sheet-feature-resources.mbt.test.ts`
  and `packages/character-battle-runtime/src/reducer-route-connectors.mbt.test.ts`.
- Task 83 exposes feature-resource route projection through
  `appendCharacterBattleFeatureResourceHandoffRoute`, which accepts actual
  public reducer/runtime `Either` results rather than copied QNT branch action
  names. It added no durable `CharacterSheet`, `BattleState`, or
  `BattleCreatureState` fields.

Plan Impact:

- Status: `none`
- Affected task: Task 83 / `CRPI-BLOCK-040` is unblocked by accepted copied
  `qRoute` replay evidence for all 14 feature-resource branches.
- Later character-battle handoff tasks should reuse
  `appendCharacterBattleFeatureResourceHandoffRoute` with public reducer
  results instead of carrying adapter-local feature-resource route tables or
  branching on QNT action names.
- Required plan edits: none.
