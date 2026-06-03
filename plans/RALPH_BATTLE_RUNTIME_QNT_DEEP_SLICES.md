# Ralph Lane: Battle Runtime QNT Deep Slice Closure

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "BRQNT-DS01-DEATH-SAVING-THROW-MBT-SPLIT",
      "status": "done",
      "title": "Extract Death Saving Throw MBT into its focused TS driver"
    },
    {
      "number": 2,
      "id": "BRQNT-DS02-SLEEP-REPEAT-SAVE-MBT-SPLIT",
      "status": "done",
      "title": "Extract Sleep repeat-save MBT into its focused TS driver"
    },
    {
      "number": 3,
      "id": "BRQNT-DS03-SPIRITUAL-WEAPON-MBT-SPLIT",
      "status": "done",
      "title": "Extract Spiritual Weapon MBT into its focused TS driver"
    },
    {
      "number": 4,
      "id": "BRQNT-DS04-STARRY-WISP-OBJECT-MBT-SPLIT",
      "status": "done",
      "title": "Extract Starry Wisp object MBT into its focused TS driver"
    },
    {
      "number": 5,
      "id": "BRQNT-DS05-ELDRITCH-BLAST-MBT-SPLIT",
      "status": "done",
      "title": "Extract Eldritch Blast MBT into its focused TS driver"
    },
    {
      "number": 6,
      "id": "BRQNT-DS06-BATTLE-RUNTIME-QNT-SHELL-ALIAS-CLOSURE",
      "status": "done",
      "title": "Remove stale battle-runtime.qnt shell aliases after focused module migration"
    }
  ]
}
-->

## Objective

Finish the already-established battle-runtime QNT/MBT split through deep
vertical slices. This is not a new architecture. The repo already has focused
`*.mbt.qnt` specs and many focused `*.mbt.test.ts` drivers. The remaining work
is to move leftover driver/projection/evidence code out of
`retired grouped battle-runtime MBT harness` and away from the
`battle-runtime.qnt` shell, one behavior at a time.

Each task owns one behavior/profile slice from QNT witness through TS MBT driver
to the public production reducer path. Do not perform wide cleanup across
unrelated drivers in one task.

Correction note: tasks 1-5 completed the aggregate TS MBT driver extraction,
but they did not close the visible `battle-runtime.qnt` shell. Task 6 is the
remaining closure task: remove stale compatibility aliases such as
`grantActionSurge` and `resolveSecondWind` once their callers have already moved
to focused QNT modules.

Declared Base SHA for every task in this lane:

```text
f29a3f30564aa318391b1ddbb7625ef0d7d0c6fc
```

Before starting each task, run and log:

```sh
git rev-parse HEAD
git merge-base --is-ancestor f29a3f30564aa318391b1ddbb7625ef0d7d0c6fc HEAD
```

If the ancestor check fails, stop and report the branch-base mismatch. Do not
repair branch state by rebasing against `master`; the Ralph runner or decider
owns branch repair.

## Global Acceptance Criteria

Every task must answer these acceptance questions for its slice. A task is not
done if any answer is missing.

1. QNT step coverage: every action in the focused `*.mbt.qnt` file is driven by
   a matching TS driver command, and every production-relevant QNT helper used
   by those actions is observed by the slice projection or justified as pure
   vocabulary/fact support.
2. TS MBT connectivity: the focused `*.mbt.test.ts` driver calls production
   package entrypoints from `./index.ts`, such as `startBattle`,
   `discoverBattleActs`, `resolveBattleSubject`, `resolveBattleReaction`, and
   `snapshotBattle`. It must not use a test-only reducer clone.
3. Production reachability: the slice records a short production path note in
   the focused test file or task closeout, naming the chain from Surface/support
   profile or runtime command admission through discovery/subject resolution,
   reducer dispatch, `BattleState` mutation, and projection.
4. No dead shell logic: after the slice moves, `rg` for its driver factory,
   projection type/check, focused MBT spec path, and coverage/evidence markers
   must show no remaining owner in `retired grouped battle-runtime MBT harness` except
   unrelated shared helpers that are still used by remaining slices.
5. Marker locality: any `KERNEL-COVERAGE`, `UNIT-PROFILE-COVERAGE`,
   `UNIT-IDENTITY-EVIDENCE`, or `UNIT-IDENTITY-MBT-REPLAY` marker for the slice
   moves with the focused test owner. Do not leave slice markers on an aggregate
   test file.
6. Shell closure: the lane is not complete while
   `packages/battle-runtime/battle-runtime.qnt` owns compatibility wrappers for
   focused behavior modules. After closure, `rg "^\\s*pure def "
   packages/battle-runtime/battle-runtime.qnt` must return no helper
   definitions, and searches for removed wrapper names must not find shell-owned
   definitions or callers.

Literal line coverage is not the goal. The required coverage unit is executable
obligation coverage: actions/transitions and the helpers that affect their
observed results.

## Global Constraints

- Use `pnpm`, never `npm`.
- Do not change runtime semantics in this lane. If a slice reveals a production
  behavior mismatch, stop the task with a concrete follow-up instead of fixing
  unrelated behavior under an extraction task.
- Do not broaden MBT coverage while splitting. Keep the same QNT actions,
  action names, trace count, and max step intent unless a task documents a
  bug in the old bridge.
- Prefer moving reusable fixture primitives into existing
  `src/battle-runtime-test-support.ts` only when multiple focused drivers truly
  share them. Scenario-specific fixtures should live with the focused driver.
- Do not introduce a replacement aggregate test file or fixture barrel.
- Before changing any modeled rule behavior, read the relevant SRD passage in
  `.references/srd-5.2.1/` and `UBIQUITOUS_LANGUAGE.md`. Pure test extraction
  should preserve existing behavior and can document that no RAW behavior moved.

## Verification

Every task must run:

```sh
git diff --check
pnpm check:mbt-driver-closure
```

Every task must also run its focused MBT vitest command with one trace:

```sh
MBT_TRACES=1 MBT_STEPS=6 pnpm --filter @dnd/battle-runtime exec vitest run src/<focused-file>.mbt.test.ts
```

Before any MBT command, check for existing MBT processes:

```sh
ps aux | grep vitest | grep -v grep
ps aux | grep quint_evaluator | grep -v grep
```

If stale `quint_evaluator` processes exist from prior runs, kill them with
`killall -9 quint_evaluator` before launching the focused command. Do not run
two MBT commands concurrently.

After significant changes, run the reviewer loop to convergence:
RAW traceability if behavior moved, ubiquitous-language/domain language,
architecture/connascence, and code review. Fix every reasonable finding, reject
only with a concrete reason, and repeat until no reasonable findings remain.

## DAG / Queue Order

| # | Task | Status | Purpose |
| ---: | --- | --- | --- |
| 1 | BRQNT-DS01-DEATH-SAVING-THROW-MBT-SPLIT - Extract Death Saving Throw MBT into its focused TS driver | done | Smallest no-unit-profile slice; proves production-command MBT extraction and kernel marker movement. |
| 2 | BRQNT-DS02-SLEEP-REPEAT-SAVE-MBT-SPLIT - Extract Sleep repeat-save MBT into its focused TS driver | done | First marker-heavy spell lifecycle slice after the pilot extraction. |
| 3 | BRQNT-DS03-SPIRITUAL-WEAPON-MBT-SPLIT - Extract Spiritual Weapon MBT into its focused TS driver | done | Spell-hosted attack proxy slice with force-position holes and repeat attack. |
| 4 | BRQNT-DS04-STARRY-WISP-OBJECT-MBT-SPLIT - Extract Starry Wisp object MBT into its focused TS driver | done | Object-target and object-damage spell attack slice. |
| 5 | BRQNT-DS05-ELDRITCH-BLAST-MBT-SPLIT - Extract Eldritch Blast MBT into its focused TS driver | done | Beam sequencing slice using selected SRD structured input and focused target projection. |
| 6 | BRQNT-DS06-BATTLE-RUNTIME-QNT-SHELL-ALIAS-CLOSURE - Remove stale battle-runtime.qnt shell aliases after focused module migration | done | Close the missed shell cleanup by deleting unused compatibility aliases that point at already-focused modules. |

## Task Details

### Task 1 - BRQNT-DS01-DEATH-SAVING-THROW-MBT-SPLIT - Extract Death Saving Throw MBT into its focused TS driver

Status: `done`

Move the Death Saving Throw MBT driver code out of
`retired grouped battle-runtime MBT harness` into a new focused test
file:

```text
packages/battle-runtime/src/death-saving-throw.mbt.test.ts
```

Inputs:

- `packages/battle-runtime/battle-runtime-death-saving-throw.mbt.qnt`
- `retired grouped battle-runtime MBT harness`
- `packages/battle-runtime/src/index.ts`
- `packages/battle-runtime/src/battle-runtime-test-support.ts`

Move or recreate only the Death Saving Throw-owned pieces:

- `DeathSavingThrowMbtProjection`
- `DeathSavingThrowMbtTurnRole`
- `createDeathSavingThrowDriver`
- `normalizeDeathSavingThrowQuintState`
- `deathSavingThrowStateCheck`
- `projectDeathSavingThrowMbtState`
- `deathSavingThrowBattle`
- any tiny helper used only by this slice
- the `BATTLE.DAMAGE.DEATH_SAVING_THROW_LIFECYCLE` kernel coverage marker

Acceptance:

- The new focused test file has a production path note for the slice.
- Every QNT action in `battle-runtime-death-saving-throw.mbt.qnt` is represented
  by a TS driver command: `init`, `doDiscoverEndTurnDeathSavingThrow`,
  `doFillDeathSavingThrowNaturalOne`, `doFillDeathSavingThrowFailure`,
  `doFillDeathSavingThrowSuccess`, `doFillDeathSavingThrowNaturalTwenty`,
  `doRejectWrongActorEndTurnAfterResolved`, and `step`.
- `retired grouped battle-runtime MBT harness` no longer runs
  `battle-runtime-death-saving-throw.mbt.qnt` and no longer owns the
  `BATTLE.DAMAGE.DEATH_SAVING_THROW_LIFECYCLE` marker.
- The focused driver calls production entrypoints through `./index.ts`, not a
  test-only reducer clone.
- `rg "battle-runtime-death-saving-throw|createDeathSavingThrowDriver|DeathSavingThrowMbtProjection|BATTLE.DAMAGE.DEATH_SAVING_THROW_LIFECYCLE" retired grouped battle-runtime MBT harness`
  returns no slice-owned leftovers.

Verification:

```sh
git diff --check
pnpm check:mbt-driver-closure
MBT_TRACES=1 MBT_STEPS=6 pnpm --filter @dnd/battle-runtime exec vitest run src/death-saving-throw.mbt.test.ts
```

### Task 2 - BRQNT-DS02-SLEEP-REPEAT-SAVE-MBT-SPLIT - Extract Sleep repeat-save MBT into its focused TS driver

Status: `done`

Move the Sleep repeat-save MBT driver code out of
`retired grouped battle-runtime MBT harness` into a new focused test
file:

```text
packages/battle-runtime/src/sleep-repeat-save.mbt.test.ts
```

Inputs:

- `packages/battle-runtime/battle-runtime-sleep-repeat-save.mbt.qnt`
- `retired grouped battle-runtime MBT harness`
- `packages/battle-runtime/src/index.ts`
- `packages/battle-runtime/src/battle-runtime-test-support.ts`

Move or recreate only the Sleep repeat-save-owned pieces:

- `SleepRepeatSaveMbtProjection`
- `createSleepRepeatSaveDriver`
- `normalizeSleepRepeatSaveQuintState`
- `sleepRepeatSaveStateCheck`
- `projectSleepRepeatSaveMbtState`
- `sleepRepeatSaveBattle`
- `sleepCasterCreatureInit`
- `sleepTargetCreatureInit`
- Sleep-specific subject/hole/fill helpers
- `spell.invocation-sleep-repeat-save-lifecycle` focused-MBT marker
- selected-identity replay/evidence markers only if they are actually owned by
  this focused slice rather than a selected-identity batch file

Acceptance:

- The new focused test file has a production path note for the slice.
- Every QNT action in `battle-runtime-sleep-repeat-save.mbt.qnt` is represented
  by a TS driver command: `init`, `doFillInitialSaveFailure`,
  `doBreakConcentrationBeforeRepeat`, `doEndCasterTurn`,
  `doEndCasterTurnAfterConcentrationBreak`,
  `doEndTargetTurnAfterConcentrationBreak`, `doDiscoverRepeatSave`,
  `doFillRepeatSaveSuccess`, `doFillRepeatSaveFailure`, and `step`.
- `retired grouped battle-runtime MBT harness` no longer runs
  `battle-runtime-sleep-repeat-save.mbt.qnt` and no longer owns
  `spell.invocation-sleep-repeat-save-lifecycle`.
- The focused driver calls production entrypoints through `./index.ts`, not a
  test-only reducer clone.
- `rg "battle-runtime-sleep-repeat-save|createSleepRepeatSaveDriver|SleepRepeatSaveMbtProjection|spell.invocation-sleep-repeat-save-lifecycle" retired grouped battle-runtime MBT harness`
  returns no slice-owned leftovers.

Verification:

```sh
git diff --check
pnpm check:mbt-driver-closure
MBT_TRACES=1 MBT_STEPS=6 pnpm --filter @dnd/battle-runtime exec vitest run src/sleep-repeat-save.mbt.test.ts
```

### Task 3 - BRQNT-DS03-SPIRITUAL-WEAPON-MBT-SPLIT - Extract Spiritual Weapon MBT into its focused TS driver

Status: `done`

Move the Spiritual Weapon MBT driver code out of
`retired grouped battle-runtime MBT harness` into:

```text
packages/battle-runtime/src/spiritual-weapon.mbt.test.ts
```

Acceptance:

- Move only the Spiritual Weapon driver/projection/state-check/fixtures and
  `spell.invocation-spiritual-weapon-attack-proxy` marker.
- Every action in `battle-runtime-spiritual-weapon.mbt.qnt` has a matching TS
  command.
- The focused driver calls production entrypoints through `./index.ts`.
- `retired grouped battle-runtime MBT harness` no longer references
  `battle-runtime-spiritual-weapon.mbt.qnt`,
  `createSpiritualWeaponDriver`, `SpiritualWeaponMbtProjection`, or
  `spell.invocation-spiritual-weapon-attack-proxy`.

Verification:

```sh
git diff --check
pnpm check:mbt-driver-closure
MBT_TRACES=1 MBT_STEPS=6 pnpm --filter @dnd/battle-runtime exec vitest run src/spiritual-weapon.mbt.test.ts
```

### Task 4 - BRQNT-DS04-STARRY-WISP-OBJECT-MBT-SPLIT - Extract Starry Wisp object MBT into its focused TS driver

Status: `done`

Move the Starry Wisp object-target MBT driver code out of
`retired grouped battle-runtime MBT harness` into:

```text
packages/battle-runtime/src/starry-wisp-object.mbt.test.ts
```

Acceptance:

- Move only the Starry Wisp object driver/projection/state-check/fixtures.
- Every action in `battle-runtime-starry-wisp-object.mbt.qnt` has a matching TS
  command.
- The focused driver calls production entrypoints through `./index.ts`.
- Any shared light-emitter projection helper is either local to this file or
  moved to existing test support only if another focused driver still uses it.
- `retired grouped battle-runtime MBT harness` no longer references
  `battle-runtime-starry-wisp-object.mbt.qnt`,
  `createStarryWispObjectDriver`, or `StarryWispObjectMbtProjection`.

Verification:

```sh
git diff --check
pnpm check:mbt-driver-closure
MBT_TRACES=1 MBT_STEPS=6 pnpm --filter @dnd/battle-runtime exec vitest run src/starry-wisp-object.mbt.test.ts
```

### Task 5 - BRQNT-DS05-ELDRITCH-BLAST-MBT-SPLIT - Extract Eldritch Blast MBT into its focused TS driver

Status: `done`

Move the Eldritch Blast MBT driver code out of
`retired grouped battle-runtime MBT harness` into:

```text
packages/battle-runtime/src/eldritch-blast.mbt.test.ts
```

Acceptance:

- Move only the Eldritch Blast driver/projection/state-check/fixtures and any
  selected structured-input loading it owns.
- Every action in `battle-runtime-eldritch-blast.mbt.qnt` has a matching TS
  command.
- The focused driver calls production entrypoints through `./index.ts`.
- `retired grouped battle-runtime MBT harness` no longer references
  `battle-runtime-eldritch-blast.mbt.qnt`, `createEldritchBlastDriver`, or
  `EldritchBlastMbtProjection`.

Verification:

```sh
git diff --check
pnpm check:mbt-driver-closure
MBT_TRACES=1 MBT_STEPS=6 pnpm --filter @dnd/battle-runtime exec vitest run src/eldritch-blast.mbt.test.ts
```

### Task 6 - BRQNT-DS06-BATTLE-RUNTIME-QNT-SHELL-ALIAS-CLOSURE - Remove stale battle-runtime.qnt shell aliases after focused module migration

Status: `done`

Remove the stale compatibility helper block from:

```text
packages/battle-runtime/battle-runtime.qnt
```

Inputs:

- `packages/battle-runtime/battle-runtime.qnt`
- focused QNT modules already imported by that shell, including combat holes,
  legendary actions, reaction resolution, armor, condition spell resolution,
  prone movement, weapon-hit turn effects, Thaumaturgy, roll-modifier choice,
  and fighter ongoing features
- QNT proof/test modules that already import the focused modules directly

Remove only shell aliases that delegate to focused modules:

- combat holes: `attackTargetAc`, `openHoles`, `attackReplayHoles`
- legendary action aliases:
  `goblinLegendaryActionWindowOpen`, `goblinCanUseLegendaryAction`,
  `useGoblinLegendaryAction`
- reaction aliases:
  `resolveHellishRebukeAfterDamageReaction`, `declineReaction`,
  `declineReactionAndResume`, `stateAfterResumingSpellCastReaction`,
  `resolveReaction`, `openAttackDamageConcentration`,
  `resolveAttackDamageConcentration`, `resumeReactionContinuation`
- armor/readied/condition aliases:
  `applyMageArmor`, `resolveArmorOfShadowsMageArmor`, `targetDonsArmor`,
  `readySpell`, `releaseReadiedSpell`, `invisibilityMaxTargets`,
  `resolveInvisibilitySpell`, `resolveSanctuarySpell`,
  `standFighterFromProne`
- timed/rider aliases:
  `endTurnWithEnsnaringStrikeDamage`,
  `endTurnWithSearingSmiteDamageAndSave`,
  `resolveThaumaturgyBoomingVoice`
- roll-modifier aliases:
  `rollModifierMaximumTargets`, `rollModifierActiveEffect`,
  `rollModifierPassivePerceptionDelta`, `rollModifierRequiresFailedSave`,
  `rollModifierSpendsLevelOneSlot`, `rollModifierSelectedTargetsValid`,
  `rollModifierTargetedState`,
  `rollModifierTargetedStateWithTargetAbilities`,
  `resolveRollModifierSpellWithTargetAbilities`,
  `resolveRollModifierSpell`
- fighter feature aliases: `grantActionSurge`, `resolveSecondWind`

Acceptance:

- `battle-runtime.qnt` no longer contains the "Full-shell fixture" helper
  block or any `pure def` compatibility wrapper after the import section.
- Before deletion, an `rg` caller inventory confirms these wrapper names are
  shell-owned leftovers, not still-required public names in focused proof files.
  Same-name rule-core functions such as `resolveSecondWind` in
  `unit-feature-pool-cost-core.qnt` are not shell leftovers.
- The task does not rename focused functions or change rule behavior.
- Focused proof/test modules continue to call the focused QNT names directly,
  for example `grantFighterActionSurge`, `resolveFighterSecondWind`,
  `combatOpenHoles`, `resolveReactionOffer`, and
  `resolveRollModifierChoiceSpell`.
- Closure search passes:

```sh
rg "^\\s*pure def " packages/battle-runtime/battle-runtime.qnt
rg "\\b(grantActionSurge|resolveSecondWind|openHoles|attackReplayHoles|resolveReaction|readySpell|releaseReadiedSpell|resolveRollModifierSpell)\\b" packages/battle-runtime/battle-runtime.qnt
```

Verification:

```sh
git diff --check
pnpm check:mbt-driver-closure
pnpm --filter @dnd/battle-runtime test:qnt-proofs
```
