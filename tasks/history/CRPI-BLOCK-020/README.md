# CRPI-BLOCK-020

## CRPI-BLOCK-020

Status: `pass`

- Task: 28
- Driver path: `packages/battle-runtime/battle-runtime-mage-armor-selected-identity.mbt.qnt`
- Accepted projection: `qRoute`
- Evidence file: `tasks/target-replay-evidence/CRPI-BLOCK-020.json`

Task 28 required target replay for the Mage Armor selected-identity driver as a `reducer-routed` route task. The copied route connector is `packages/battle-runtime/battle-runtime-spell-base-armor-class-effect.route.mbt.qnt`.

Current public qRoute coverage:

- Covered: `battle-runtime-spell-base-armor-class-effect.route.mbt.qnt` target admission, armored-target rejection, active Spell Effect admission, Armor Class projection, and duration expiry cleanup through `packages/battle-runtime/src/mage-armor-selected-identity.mbt.test.ts` public reducer route replay.
- Remaining required public qRoute coverage: none.

Task 28 made a focused production route-projection change in `packages/battle-runtime/src/battle-reducer/reducer-route.ts`: the public reducer route vocabulary now includes the generic `spellBaseArmorClassEffect` subject, and public discovery/resolution emits that subject for typed `persistentArmorEffect` spell procedures plus `spellBaseArmorClass` active-effect deltas. The selected replay compares public route events against the shared connector-driver projection in `packages/battle-runtime/src/battle-runtime-mbt-driver-kit.ts`. The route evidence uses BattleState active effects and derived Armor Class projection, not duplicate Armor Class state or authored spell identity dispatch.

RAW and ubiquitous-language review checked local SRD 5.2.1 text for spell Targets and Duration, Rules Glossary Armor Class and Target, and `UBIQUITOUS_LANGUAGE.md` terms for Armor Class, Spell Effect, Target, Duration, and Boundary Crossing. The local SRD 5.2.1 corpus does not include a Mage Armor spell-name passage, so the target route evidence remains generic and typed by procedure/effect shape.

Verification results:

- Task-base check passed: base ref and HEAD both resolved to `65b00711d Mark Ralph task 27 done`; Base SHA is an ancestor of HEAD.
- `pnpm --filter @dnd/battle-runtime typecheck` passed.
- `pnpm --filter @dnd/battle-runtime exec vitest run src/mage-armor-selected-identity.mbt.test.ts -t "public reducer route replay"` passed: 1 passed, 1 skipped.
- MBT preflight found no actual Vitest runner and no stale `quint_evaluator`; the required grep command matched only an unrelated monitor shell command text.
- `START=$(date +%s); MBT_TRACES=1 pnpm --filter @dnd/battle-runtime exec vitest run src/mage-armor-selected-identity.mbt.test.ts src/reducer-route-connectors.mbt.test.ts -t "(Mage Armor selected identity replay|public reducer route replay|routes spell base Armor Class effects through the shared reducer surface)" 2>&1; STATUS=$?; echo "TOTAL: $(( $(date +%s) - START ))s"; exit "$STATUS"` passed: 2 files passed; 3 tests passed, 33 skipped; TOTAL: 6s.
- `pnpm cleanroom-branch-coverage:check` passed with Task 28 evidence: 738 obligations, 24 sampled inputs.
- `git diff --check` passed.
- `pnpm quality` passed end to end; app lint reported existing warnings and exited 0; turbo typecheck completed 9 successful tasks, 5 from cache.

Reviewer-loop status:

- Round 1 found the missing public route subject/projection for spell base Armor Class effects. The implementation added generic route events from typed procedure shape and active-effect deltas, with no new durable BattleState field and no authored-identity production dispatch. The initial public replay used local expected route literals; review moved that comparison onto the shared connector-driver projection so target replay is not satisfied by adapter-local expected routes.
- Round 2 found no remaining RAW traceability, ubiquitous-language, architecture/connascence, or code-review findings in the Task 28 diff.
