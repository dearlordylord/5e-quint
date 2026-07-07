# CRPI-BLOCK-022

Status: `pass`

- Task: 33
- Driver path: `packages/battle-runtime/battle-runtime-reaction-spell-selected-identity.mbt.qnt`
- Accepted projection: `qRoute`
- Evidence file: `tasks/target-replay-evidence/CRPI-BLOCK-022.json`

Task 33 records public reducer qRoute evidence for the Reaction spell selected-identity driver as a `reducer-routed` task. The selected replay binds SRD spell identity at the replay/admission boundary; production route evidence is observed from generic Reaction payload subjects derived from typed trigger, procedure, and payload facts.

Current public qRoute coverage:

- Covered: `battle-runtime-reaction-interrupt-payload-taxonomy.route.mbt.qnt` through public Shield attack-hit Reaction, Hellish Rebuke after-damage Reaction, Counterspell failed-save interruption, and Counterspell successful-save spell resume replay in `packages/battle-runtime/src/reaction-spell-selected-identity.mbt.test.ts`.
- Remaining required public qRoute coverage: none.

Task 33 fixed the production route projection needed for public evidence: `packages/battle-runtime/src/battle-reducer/reducer-route.ts` now derives `reactionArmorClassEffect`, `reactionAfterDamageEffect`, and `reactionSpellInterruption` route subjects from existing interrupt checkpoint trigger facts plus selected Reaction spell invocation procedure facts. No durable `BattleState` field was added, and production code does not dispatch on selected spell ids or names.

Verification results:

- Task-base check passed: base ref and HEAD both resolved to `7383c481b Complete Task 30 movement route replay`; Base SHA is an ancestor of HEAD.
- RAW/ubiquitous-language review passed for local SRD 5.2.1 Reactions, Reaction spell casting-time triggers, Spell Slots, Saving Throws, Damage Rolls, Armor Class, Shield, Hellish Rebuke, Counterspell, and `UBIQUITOUS_LANGUAGE.md` Reaction, Spell Effect, Spell Slot, Saving Throw, Damage Roll, Armor Class, Offer, Decline, and Advance terms.
- `pnpm --filter @dnd/battle-runtime typecheck` passed.
- `pnpm --filter @dnd/battle-runtime exec vitest run src/reaction-spell-selected-identity.mbt.test.ts -t "compares reaction payload"` passed: 1 file passed; 1 test passed, 1 skipped; TOTAL: 13s. Shield, Hellish Rebuke, Counterspell interruption ended, and Counterspell interruption resumed routes were decoded from copied connector qRoute and compared with public reducer routeEvents.
- Revision round 2 Feather Fall regression check passed: `pnpm --filter @dnd/battle-runtime exec vitest run src/level1-spatial-witness-selected-identity.mbt.test.ts -t "public reducer route replay"` passed: 1 file passed; 2 tests passed, 1 skipped.
- MBT preflight matched only an unrelated Ralph monitor shell command text; no active Vitest runner and no stale `quint_evaluator` were present.
- Revision round 5 focused qRoute replay passed: `pnpm --filter @dnd/battle-runtime exec vitest run src/reaction-casting-time.mbt.test.ts src/reaction-interrupt-routes.mbt.test.ts src/reaction-spell-selected-identity.mbt.test.ts -t "observes the copied Hellish Rebuke qRoute|routes Reaction casting time through explicit battle owners|compares reaction payload"` passed: 3 files passed; 3 tests passed, 8 skipped; TOTAL: 13s.
- Required route connector MBT passed: `START=$(date +%s); MBT_TRACES=1 MBT_STEPS=1 pnpm --filter @dnd/battle-runtime exec vitest run src/reaction-interrupt-routes.mbt.test.ts -t "routes reaction payload taxonomy through generic trigger families and owners" 2>&1; STATUS=$?; echo "TOTAL: $(( $(date +%s) - START ))s"; exit "$STATUS"` passed: 1 file passed; 1 test passed, 5 skipped; TOTAL: 6s.
- Required selected identity MBT passed: `START=$(date +%s); MBT_TRACES=1 MBT_STEPS=1 pnpm --filter @dnd/battle-runtime exec vitest run src/reaction-spell-selected-identity.mbt.test.ts -t "replays deterministic QNT parity" 2>&1; STATUS=$?; echo "TOTAL: $(( $(date +%s) - START ))s"; exit "$STATUS"` passed: 1 file passed; 1 test passed, 1 skipped; TOTAL: 5s.
- `pnpm cleanroom-branch-coverage:check` passed with Task 33 evidence: 738 obligations, 24 sampled inputs.
- `git diff --check` passed.
- `pnpm quality` passed end to end; app lint reported existing warnings and exited 0; turbo typecheck completed 9 successful tasks, 5 from cache.

Reviewer-loop status:

- Round 1 found and fixed the public route projection gap: the selected Reaction spell branches now use payload taxonomy subjects instead of the broad `reactionSpell` route subject. The implementation derives route subjects from typed trigger/procedure facts, reuses existing interrupt-stack, spell-slot/action-economy, active-effect, Armor Class, Saving Throw, and Hit Point owners, and adds no duplicate durable state.
- Revision round 2 fixed the reviewer-found Feather Fall route regression by scoping payload taxonomy route subjects to the Task 33 selected Shield, Hellish Rebuke, and Counterspell branches. Feather Fall remains on the accepted generic `reactionSpell` casting-time route and landing-owned fall mitigation route.
- Revision round 3 fixed the reviewer-found Counterspell connector mismatch by comparing public reducer routeEvents against copied `SpellInterruptionEndedRouteSurface` and `SpellInterruptionResumedRouteSurface` qRoute. Resumed Counterspell now leaves the Magic Missile `rolledDice` hole after the save fill and routes resumed spell damage as `slotSpell` before interrupt-stack cleanup.
- Revision round 4 fixed the reviewer-found Shield and Hellish Rebuke evidence gap by comparing `ReactionArmorClassEffectRouteSurface` and `AfterDamageSaveDamageRouteSurface` public reducer routeEvents against copied connector qRoute instead of adapter-local expected route literals.
- Revision round 5 fixed the reviewer-found Task 32 evidence conflict by updating the prior Hellish Rebuke casting-time route connector/evidence to the same `reactionAfterDamageEffect` payload-taxonomy qRoute now emitted by the public reducer.
- Final reviewer-loop pass found no remaining RAW traceability, ubiquitous-language, architecture/connascence, or code-review findings in the Task 33 diff after the round 5 copied qRoute comparison and prior-evidence refresh.
