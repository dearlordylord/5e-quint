# CRPI-BLOCK-021

Status: `pass`

- Task: 30
- Driver path: `packages/battle-runtime/battle-runtime-movement-forced-movement-selected-identity.mbt.qnt`
- Accepted projection: `qRoute`
- Evidence file: `tasks/target-replay-evidence/CRPI-BLOCK-021.json`

Task 30 records public reducer qRoute evidence for the movement and forced movement selected-identity driver as a `catalog-after-substrate` task. The selected replay binds SRD catalog identity at the replay/admission boundary; production route evidence is observed from generic movement-resource, forced-movement, special-speed, active-effect, creature-state, interrupt-stack, reaction, and turn-boundary owners.

Current public qRoute coverage:

- Covered: `battle-runtime-movement-forced-movement-selected-identity.route.mbt.qnt` through public Dissonant Whispers forced reaction movement, Command Flee target-turn movement, Expeditious Retreat spell-granted Dash, Ranger Roving special-speed movement, Barbarian Fast Movement Dash, and Monk Unarmored Movement Dash replay in `packages/battle-runtime/src/movement-forced-movement-selected-identity.mbt.test.ts`.
- Remaining required public qRoute coverage: none.

Task 30 fixed the production route projection needed for public evidence: `packages/battle-runtime/src/battle-reducer/reducer-route.ts` now includes generic `forcedMovement`, `movementResource`, and `specialSpeedProjection` route subjects and emits them from typed forced-reaction movement riders, Command Flee movement fills, spell-granted Dash, passive Dash, represented special-speed facts, active effects, movement budget state, and turn-boundary cleanup. No durable `BattleState` field was added.

Revision round 2 fixed the existing Command route parity contract affected by that projection: `packages/battle-runtime/battle-runtime-command-option-next-turn.mbt.qnt` now includes the generic forced-movement substrate route events for successful Command Flee movement, while rejected, no-movement, and interrupt-window Flee paths remain on the existing CommandEffect route.

Verification results:

- Task-base check passed: base ref and HEAD both resolved to `d70a64bbf Mark Ralph task 28 done`; Base SHA is an ancestor of HEAD.
- RAW/ubiquitous-language review passed for local SRD 5.2.1 Movement and Position, Dash, Speed, Climb Speed, Swim Speed, Bonus Action, Reaction, Command, Dissonant Whispers, Expeditious Retreat, and `UBIQUITOUS_LANGUAGE.md` Speed, Movement, Bonus Action, Reaction, Spell Effect, and Boundary Crossing terms.
- `pnpm --filter @dnd/battle-runtime typecheck` passed.
- `pnpm --filter @dnd/battle-runtime exec vitest run src/movement-forced-movement-selected-identity.mbt.test.ts -t "public reducer route replay"` passed: 1 passed, 3 skipped.
- MBT preflight found no actual Vitest runner and no stale `quint_evaluator`; the required grep command matched only unrelated Ralph monitor shell command text.
- Focused Task 30 MBT passed with selected replay and required route connector coverage on final revision: 1 file passed; 2 tests passed, 2 skipped; TOTAL: 8s.
- Revision round 2 affected Command MBT passed: `MBT_TRACES=1 MBT_STEPS=15 pnpm --filter @dnd/battle-runtime exec vitest run src/command-option-next-turn.mbt.test.ts -t "Command option and next-turn MBT"` passed: 1 file passed; 1 test passed; TOTAL: 19s.
- `pnpm --filter @dnd/battle-runtime exec vitest run src/sorcerer-metamagic-careful-selected-identity.mbt.test.ts -t "Careful Command no-effect route"` passed: 1 passed, 2 skipped.
- `pnpm cleanroom-branch-coverage:check` passed with Task 30 evidence after refreshing source-branch inventory/report for the Command route witness update: 738 obligations, 24 sampled inputs.
- `git diff --check` passed.
- `pnpm quality` passed end to end; app lint reported existing warnings and exited 0; turbo typecheck completed 9 successful tasks, 5 from cache.

Reviewer-loop status:

- Round 1 fixed the missing public route subjects/projection for movement substrate routes. Review also kept Command Flee forced-movement discovery gated by the selected `flee` command option so existing Command no-effect route assertions do not receive unrelated forced-movement events.
- Revision round 2 addressed the reviewer-found Command Flee route parity regression by updating the existing active Command witness to include the now-public forcedMovement substrate events only for successful Flee movement.
- Final reviewer pass found no remaining RAW traceability, ubiquitous-language, architecture/connascence, or code-review findings in the Task 30 diff.
