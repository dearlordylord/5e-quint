# CRPI-BLOCK-016

## CRPI-BLOCK-016

Status: `pass`

- Task: 24
- Driver path: `packages/battle-runtime/battle-runtime-level1-damage-spell-selected-identity.mbt.qnt`
- Accepted projection: `qRoute`
- Evidence file: `tasks/target-replay-evidence/CRPI-BLOCK-016.json`

Task 24 required target replay for the level-1 damage spell selected-identity driver as a `catalog-after-substrate` route task. The selected replay already exercises SRD catalog admission for Burning Hands, Chromatic Orb, Ice Knife, Poison Spray, Ray of Sickness, Sacred Flame, Sorcerous Burst, Starry Wisp, and Vicious Mockery through public battle reducer entrypoints.

Current public qRoute coverage:

- Covered: `battle-runtime-save-gated-spell-ordering.route.mbt.qnt` through public `startBattle`, `discoverBattleActs`, and `resolveBattleSubject` route events in `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#createSaveGatedSpellOrderingRouteDriver`.
- Covered: `battle-runtime-spell-attack-ordering.route.mbt.qnt` through public spell Attack procedure route events in `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#createSpellAttackOrderingRouteDriver`.
- Covered: `battle-runtime-chained-attack-sequence.route.mbt.qnt` through public chained spell Attack route events in `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#createChainedAttackProcedureRouteDriver`.
- Covered: `battle-runtime-mixed-target-outcomes.route.mbt.qnt` through generic mixed target outcome route evidence in `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#createMixedTargetOutcomeRouteDriver`.
- Covered: `battle-runtime-starry-wisp-object.route.mbt.qnt` through public object-target spell Attack route events in `packages/battle-runtime/src/starry-wisp-object.mbt.test.ts#createStarryWispObjectRouteDriver`.
- Covered: `battle-runtime-condition-riders.route.mbt.qnt` through generic condition lifecycle route evidence in `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#createConditionRiderRouteDriver`.
- Remaining required public qRoute coverage: none.

No new production `BattleState` field or duplicate route ledger was added. The durable owner remains the existing battle runtime reducer surface: selected spell identity enters at catalog/support-profile admission, while route evidence is projected from typed spell procedures, target fills, Attack Roll, Saving Throw, object target, condition rider, mixed outcome, and Hit Point effect facts.

The focused Task 24 MBT run exposed one production route projection gap: chained spell Attack target-choice qRoute omitted the generic spell Attack procedure owner event expected by `battle-runtime-chained-attack-sequence.route.mbt.qnt`. `packages/battle-runtime/src/battle-reducer/reducer-route.ts` now emits the procedure owner for `chainedSpellAttackDamage` target-choice and damage fills, without branching on authored spell identity.

RAW and ubiquitous-language review checked local SRD 5.2.1 spell and generic rule passages for the selected damage spell substrates, plus `UBIQUITOUS_LANGUAGE.md` terms for Spell Invocation, Attack Roll, Saving Throw, Damage, Damage Type, Hit Points, Condition, Spell Effect, and Rider.

Verification results:

- Task-base check passed: base ref and HEAD both resolved to `314ce0f1d Mark Ralph task 23 done`; Base SHA is an ancestor of HEAD.
- `git diff --check` passed.
- MBT preflight `ps aux | grep vitest | grep -v grep` and `ps aux | grep quint_evaluator | grep -v grep` found no active runner/evaluator before focused MBT runs.
- `START=$(date +%s); MBT_TRACES=1 pnpm --filter @dnd/battle-runtime exec vitest run src/reducer-route-connectors.mbt.test.ts -t "routes chained spell Attack procedures through the shared reducer surface" 2>&1; STATUS=$?; echo "TOTAL: $(( $(date +%s) - START ))s"; exit "$STATUS"` passed after the route-owner fix: 1 passed, 33 skipped, TOTAL: 8s.
- `START=$(date +%s); MBT_TRACES=1 pnpm --filter @dnd/battle-runtime exec vitest run src/level1-damage-spell-selected-identity.mbt.test.ts src/reducer-route-connectors.mbt.test.ts src/starry-wisp-object.mbt.test.ts -t "(Level 1 damage spell selected identity replay|routes save-gated spell ordering|routes spell Attack ordering|routes chained spell Attack procedures|routes mixed target outcomes|routes condition and poison riders|routes object-target boundary facts)" 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"` passed: 3 files passed; 7 tests passed, 30 skipped; TOTAL: 32s.
- `pnpm cleanroom-branch-coverage:check` passed with Task 24 evidence: 738 obligations, 24 sampled inputs.
- `pnpm quality` passed end to end; app lint reported existing warnings and exited 0; turbo typecheck completed 9 successful tasks, 5 from cache.

Reviewer-loop status:

- Round 1 found and fixed the chained spell Attack procedure owner gap. The task uses generic public route owners, does not add authored-identity production dispatch, and does not duplicate route state.
