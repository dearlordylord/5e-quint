Implemented the round 8 fixes for Task 23.

**Files Changed**
- Runtime: `api-lifecycle.ts`, `spell-created-mount.ts`, mount state/codec/dispatcher/fill/protocol integration files.
- Tests/proofs: added `spell-created-mount-lifecycle.mbt.test.ts`, `battle-runtime-spell-created-mount-lifecycle.mbt.qnt`; updated Phantom Steed focused test and QNT artifacts.
- Coverage artifacts: regenerated `plans/rules-kernel-coverage/*` and `plans/unit-profile-coverage/*` Task 23 rows.
- Surface: `phantom_steed.dhall`.

**What Changed**
- `completedLongCastSpell` is no longer discovered as an ordinary cast act.
- Spell-created mount resolution now spends resources through `spendSpellCastResources`, committing Magic action and Spell Slot turn state.
- The created mount is inserted as a combatant outside Initiative, so it does not get a separate stat-block turn/action surface.
- Added focused MBT parity for completion, non-initiative mount creation, damage fade, duration fade, and grace expiry.
- Coverage claims now explicitly defer ordinary long-cast progress and mounted control.

**Verification**
- Base check: passed.
- `pnpm --filter @dnd/battle-runtime exec vitest run src/unit-profile-admission-phantom-steed.test.ts`: passed.
- `pnpm --filter @dnd/battle-runtime exec quint test battle-runtime-spell-created-mount.qnt`: passed.
- Focused MBT with protocol: `MBT_TRACES=1 MBT_STEPS=4 pnpm exec vitest run src/spell-created-mount-lifecycle.mbt.test.ts`: passed, `TOTAL: 7s`.
- `pnpm check:mbt-driver-closure`: passed.
- `pnpm rules-kernel-coverage:check` and `pnpm unit-profile-coverage:check`: passed.
- `git diff --check 04ccdbb2b336d228accecdadf99aef25d05c5602`: passed.
- `pnpm --filter @dnd/battle-runtime exec tsc --noEmit --pretty false`: failed on existing broad spell typing/unit-feature errors; filtered log had no Task 23 touched-file diagnostics.

**Unresolved Risks**
- Full `pnpm quality` remains blocked by baseline typecheck failures outside this task surface.
- Ordinary long-cast progress is not modeled here; Task 23 now honestly consumes an explicit completed-cast subject.

**Plan Impact**
- Status: update-required.
- Affected tasks:
  - Task 23: unblocked, ready for review.
  - Task 24: left unchanged/deferred.
  - Task 25: left unchanged/deferred.
  - Add `L3-FOLLOWUP-LONG-CAST-PROGRESS-STATE`: added.
  - `L3-FOLLOWUP-PHANTOM-STEED-MOUNTED-CONTROL`: left unchanged.
- Observations: Phantom Steed lifecycle can be supported without ordinary long-cast progress or mounted-control state, but those are separate RAW owners.
- Required plan edits: add a long-cast progress follow-up for Magic-action-per-turn casting, Concentration while casting, failure before completion, and completed-cast subject emission.