# CRPI-BLOCK-018

## CRPI-BLOCK-018

Status: `pass`

- Task: 26
- Driver path: `packages/battle-runtime/battle-runtime-level2-damage-spell-selected-identity.mbt.qnt`
- Accepted projection: `qRoute`
- Evidence file: `tasks/target-replay-evidence/CRPI-BLOCK-018.json`

Task 26 required target replay for the level-2 damage spell selected-identity driver as a `reducer-routed` route task. The in-scope selected branches are Flaming Sphere and Moonbeam concentration-backed area hazards.

Current public qRoute coverage:

- Covered: `battle-runtime-concentration-hazard-selected-route.route.mbt.qnt` selected Flaming Sphere and Moonbeam hazard admission through `packages/battle-runtime/src/level2-damage-spell-selected-identity.mbt.test.ts` public reducer route replay.
- Covered: `battle-runtime-concentration-hazard-exact-damage.route.mbt.qnt` through public end-turn hazard Saving Throw and rolled-damage resolution for Flaming Sphere and Moonbeam.
- Covered: `battle-runtime-spatial-effect-route-surfaces.qnt` through the shared `spatialEffect` route event vocabulary used by the selected hazard and exact-damage replay.
- Covered: `battle-runtime-spatial-effects.route.mbt.qnt` through the focused reducer route connector MBT plus the Task 26 public route replay.
- Remaining required public qRoute coverage: none.

Task 26 made a focused production route-projection change in `packages/battle-runtime/src/battle-reducer/reducer-route.ts`: the existing spatial-effect route projection now admits typed Flaming Sphere and Moonbeam procedures, and runtime movable-zone saves emit Saving Throw and Hit Point route events. This uses procedure shape and runtime command shape rather than authored spell identity, and it adds no durable `BattleState` field.

RAW and ubiquitous-language review checked local SRD 5.2.1 text for Flaming Sphere, Moonbeam, Concentration, Saving Throws, Damage Rolls, Half Damage, Hit Points, Area of Effect, Dim Light, and related `UBIQUITOUS_LANGUAGE.md` terms for Spell Invocation, Spell Effect, Area of Effect, Concentration, Saving Throw, Damage, Hit Points, Movement, Illumination, and Table Decision.

Verification results:

- Task-base check passed: base ref and HEAD both resolved to `425185039 Mark Ralph task 25 done`; Base SHA is an ancestor of HEAD.
- `pnpm --filter @dnd/battle-runtime typecheck` passed.
- `pnpm --filter @dnd/battle-runtime exec vitest run src/level2-damage-spell-selected-identity.mbt.test.ts -t "public reducer route replay"` passed: 2 passed, 1 skipped.
- MBT preflight found no active Vitest runner and no stale `quint_evaluator`.
- `START=$(date +%s); MBT_TRACES=1 pnpm --filter @dnd/battle-runtime exec vitest run src/level2-damage-spell-selected-identity.mbt.test.ts src/reducer-route-connectors.mbt.test.ts src/concentration-hazard-exact-damage-route.mbt.test.ts -t "(Level 2 damage spell selected identity replay|public reducer route replay|routes selected concentration-backed hazards through generic spatial hazard surfaces|routes save-triggered concentration hazard damage to Hit Point ownership|routes spatial effects through light, sight, hazard, and table-witness owners)" 2>&1; STATUS=$?; echo "TOTAL: $(( $(date +%s) - START ))s"; exit "$STATUS"` passed: 3 files passed; 6 tests passed, 32 skipped; TOTAL: 13s.
- `pnpm cleanroom-branch-coverage:check` passed: 738 obligations, 24 sampled inputs.
- `git diff --check` passed.
- `pnpm quality` passed end to end; app lint reported existing warnings and exited 0; turbo typecheck completed 9 successful tasks, 5 from cache.

Reviewer-loop status:

- Round 1 found the route projection helper name and admission predicate were still shaped around Task 25 level-1 spatial spells. The implementation generalized the helper naming and admitted level-2 concentration hazard procedures by typed procedure shape. No authored-identity production dispatch or duplicate state was added.
