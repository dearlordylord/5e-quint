# Ralph Lane: L3 Morning Wild Shape And Object Residuals

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L3MWILD-01-PERCEPTION-COMMUNICATION-PROJECTION",
      "status": "done",
      "title": "Implement Wild Shape perception and communication projection"
    },
    {
      "number": 2,
      "id": "L3MWILD-02-EQUIPMENT-DISPOSITION-OWNER",
      "status": "done",
      "title": "Implement Wild Shape equipment disposition owner"
    },
    {
      "number": 3,
      "id": "L3MWILD-03-WORN-EQUIPMENT-EFFECTIVE-LOADOUT",
      "status": "done",
      "title": "Promote Wild Shape worn-equipment effective-loadout projection"
    },
    {
      "number": 4,
      "id": "L3MWILD-04-FALLEN-EQUIPMENT-OBJECT-BOUNDARY",
      "status": "done",
      "title": "Promote Wild Shape fallen-equipment object boundary"
    },
    {
      "number": 5,
      "id": "L3MWILD-05-MERGED-EQUIPMENT-NO-EFFECT-PARITY",
      "status": "ready-for-research",
      "title": "Audit merged-equipment no-effect parity after disposition owner"
    },
    {
      "number": 6,
      "id": "L3MWILD-06-FORM-LIMB-OBJECT-CONSUMER-CLOSURE",
      "status": "ready-for-implementation-after-light-research",
      "title": "Close form-limb object-consumer boundary"
    },
    {
      "number": 7,
      "id": "L3MWILD-07-ACTIVE-FORM-PERSISTENCE-BLOCKER",
      "status": "ready-for-research",
      "title": "Record active-form persistence owner-decision blocker"
    },
    {
      "number": 8,
      "id": "L3MWILD-08-ACID-ARROW-OWNER-DECISION-BLOCKER",
      "status": "ready-for-research",
      "title": "Record Acid Arrow RAW owner-decision blocker"
    },
    {
      "number": 9,
      "id": "L3MWILD-09-RESIDUAL-LEDGER-CONSOLIDATION",
      "status": "blocked",
      "title": "Consolidate residual Wild Shape and Acid Arrow ledgers"
    },
    {
      "number": 10,
      "id": "L3MWILD-10-WILD-SHAPE-SELECTED-IDENTITY-AUDIT",
      "status": "ready-for-implementation-after-light-research",
      "title": "Audit Wild Shape selected-identity replay after split owners"
    },
    {
      "number": 11,
      "id": "L3MWILD-11-WILD-COMPANION-BOUNDARY-AUDIT",
      "status": "ready-for-research",
      "title": "Audit Wild Companion boundary after Find Familiar and Wild Shape splits"
    },
    {
      "number": 12,
      "id": "L3MWILD-12-MORNING-WILD-SHAPE-CONSOLIDATION",
      "status": "blocked",
      "title": "Final Wild Shape morning lane consolidation"
    }
  ]
}
-->

## Objective

Continue the residual Level 1-3 Wild Shape and object-boundary work after the
overnight lane closed six tasks and then stopped on stale blocked dependency
labels. This lane is intentionally larger than the previous residual lane:
that lane stopped at 2026-06-05T06:30:29Z, about 5h13m before the morning
status check at 2026-06-05T11:43:38Z.

## Declared Base And Task-Base Check

Declared Base SHA:

```text
83665a61ee9e47e11c88b3f14da9d26472320fe1
```

Before each task, log:

```sh
git rev-parse HEAD
git merge-base --is-ancestor 83665a61ee9e47e11c88b3f14da9d26472320fe1 HEAD
```

If the ancestor check fails, stop and report the branch-base mismatch. Do not
repair branch state by rebasing against `master`.

## DAG / Queue Order

| Order | Task                                           | Status                                        | Depends On                                                                                                                                                                                                                     | Notes                                                                                                                                 |
| ----: | ---------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
|     1 | L3MWILD-01-PERCEPTION-COMMUNICATION-PROJECTION | ready-for-implementation-after-light-research | none                                                                                                                                                                                                                           | Implement the projection described by `plans/WILD_SHAPE_SENSE_LANGUAGE_PROJECTION_PLAN.md`.                                           |
|     2 | L3MWILD-02-EQUIPMENT-DISPOSITION-OWNER         | done                                          | none                                                                                                                                                                                                                           | Implemented merge-only disposition owner, selected-loadout object refs, active-effect storage, and all-merged no-effect preservation. |
|     3 | L3MWILD-03-WORN-EQUIPMENT-EFFECTIVE-LOADOUT    | done                                          | L3MWILD-02-EQUIPMENT-DISPOSITION-OWNER                                                                                                                                                                                         | Promoted practical worn armor/Shield effective-loadout projection.                                                                    |
|     4 | L3MWILD-04-FALLEN-EQUIPMENT-OBJECT-BOUNDARY    | done                                          | L3MWILD-02-EQUIPMENT-DISPOSITION-OWNER                                                                                                                                                                                         | Fallen equipment now emits explicit dropped-object outcomes without adding table placement state.                                     |
|     5 | L3MWILD-05-MERGED-EQUIPMENT-NO-EFFECT-PARITY   | ready-for-research                            | L3MWILD-02-EQUIPMENT-DISPOSITION-OWNER                                                                                                                                                                                         | Audit remaining merged-equipment parity/coverage after Task 2's merge-only active storage and no-effect behavior.                     |
|     6 | L3MWILD-06-FORM-LIMB-OBJECT-CONSUMER-CLOSURE   | ready-for-implementation-after-light-research | L3MWILD-02-EQUIPMENT-DISPOSITION-OWNER                                                                                                                                                                                         | Close or promote object/Utilize consumers that need form-limb witnesses.                                                              |
|     7 | L3MWILD-07-ACTIVE-FORM-PERSISTENCE-BLOCKER     | ready-for-research                            | none                                                                                                                                                                                                                           | Replace stale dependency text with an explicit owner-decision blocker.                                                                |
|     8 | L3MWILD-08-ACID-ARROW-OWNER-DECISION-BLOCKER   | ready-for-research                            | none                                                                                                                                                                                                                           | Keep Acid Arrow blocked until owner approves RAW correction or `ASSUMPTIONS.md` entry.                                                |
|     9 | L3MWILD-09-RESIDUAL-LEDGER-CONSOLIDATION       | blocked                                       | L3MWILD-01-PERCEPTION-COMMUNICATION-PROJECTION, L3MWILD-02-EQUIPMENT-DISPOSITION-OWNER, L3MWILD-07-ACTIVE-FORM-PERSISTENCE-BLOCKER, L3MWILD-08-ACID-ARROW-OWNER-DECISION-BLOCKER                                               | Regenerate reports after blockers/owners are real rows.                                                                               |
|    10 | L3MWILD-10-WILD-SHAPE-SELECTED-IDENTITY-AUDIT  | ready-for-implementation-after-light-research | none                                                                                                                                                                                                                           | Ensure no selected-identity replay is orphaned after the split.                                                                       |
|    11 | L3MWILD-11-WILD-COMPANION-BOUNDARY-AUDIT       | ready-for-research                            | none                                                                                                                                                                                                                           | Audit whether Wild Companion still has only explicit companion-control closure.                                                       |
|    12 | L3MWILD-12-MORNING-WILD-SHAPE-CONSOLIDATION    | blocked                                       | L3MWILD-03-WORN-EQUIPMENT-EFFECTIVE-LOADOUT, L3MWILD-04-FALLEN-EQUIPMENT-OBJECT-BOUNDARY, L3MWILD-05-MERGED-EQUIPMENT-NO-EFFECT-PARITY, L3MWILD-06-FORM-LIMB-OBJECT-CONSUMER-CLOSURE, L3MWILD-09-RESIDUAL-LEDGER-CONSOLIDATION | Final lane report and cleanup.                                                                                                        |

## Task Details

### Task 1 - L3MWILD-01-PERCEPTION-COMMUNICATION-PROJECTION

Inputs:

- `plans/WILD_SHAPE_SENSE_LANGUAGE_PROJECTION_PLAN.md`
- `.references/srd-5.2.1/Classes/Druid.md`
- existing Wild Shape battle-runtime support, active-effect state, Stat Block
  facts, and Character Build language facts.

Outputs:

- Shared projection code, focused runtime tests, QNT/MBT witness only if battle
  reducer behavior is promoted.
- Coverage ledgers updated only for executable behavior actually wired to the
  reducer.

### Task 2 - L3MWILD-02-EQUIPMENT-DISPOSITION-OWNER

Inputs:

- `plans/WILD_SHAPE_OBJECT_ANATOMY_EQUIPMENT_PLAN.md`
- existing Character Battle equipment/loadout handoff facts.

Outputs:

- Typed disposition hole/fill owner, active-effect storage, all-merged parity,
  focused tests, and coverage evidence.

Landed scope:

- Production resolution accepts merge-only completed dispositions and stores
  selected-loadout object refs on the active Wild Shape effect.
- `falls` choices remain rejected until Task 4 owns their executable
  consequences.
- Practical worn armor/Shield is promoted by Task 3; worn weapons, held
  objects, and form-limb object handling remain Task 6.

### Task 3 - L3MWILD-03-WORN-EQUIPMENT-EFFECTIVE-LOADOUT

Promote effective-loadout projection for worn equipment after the disposition
owner exists.

Landed scope:

- Production resolution accepts practical `worn` choices for selected-loadout
  armor and Shields and projects their Armor Class, armor/shield predicates, and
  shield hand use while shaped.
- Worn weapons and held objects remain rejected until Task 6 owns the
  form-limb object-consumer boundary; fallen equipment remains Task 4.

### Task 4 - L3MWILD-04-FALLEN-EQUIPMENT-OBJECT-BOUNDARY

Promote fallen-equipment outcomes only at the explicit object/table boundary.

Landed scope:

- Production Wild Shape resolution accepts `falls` equipment choices and
  not-practical-to-wear fallbacks, emits transient `droppedObjects` outcomes
  sourced to Wild Shape, and keeps fallen equipment out of active worn/merged
  effect disposition.
- Downstream table placement/use, form-limb object handling, worn weapons,
  held objects, and non-resizing/non-reshaping behavior remain Task 6/follow-up
  object work.

### Task 5 - L3MWILD-05-MERGED-EQUIPMENT-NO-EFFECT-PARITY

Audit merged-equipment no-effect parity and generated coverage after Task 2's
merge-only owner. Close this task by confirming whether any QNT, MBT, coverage,
or report residue still treats merged equipment as an unsupported follow-up; fix
only those remaining parity/ledger gaps and avoid duplicating inventory state.

### Task 6 - L3MWILD-06-FORM-LIMB-OBJECT-CONSUMER-CLOSURE

Close or promote object/Utilize consumers that require the form-limb witness.

### Task 7 - L3MWILD-07-ACTIVE-FORM-PERSISTENCE-BLOCKER

Record the cross-session active-form persistence blocker as an explicit
owner-decision row, not a stale dependency label.

### Task 8 - L3MWILD-08-ACID-ARROW-OWNER-DECISION-BLOCKER

These are not implementation tasks. Their output is a non-stale blocker row
that Ralph can understand. Do not invent Acid Arrow damage semantics.

### Task 9 - L3MWILD-09-RESIDUAL-LEDGER-CONSOLIDATION

Regenerate and verify residual ledgers after the ready tasks and explicit
blockers land.

### Task 10 - L3MWILD-10-WILD-SHAPE-SELECTED-IDENTITY-AUDIT

Audit selected-identity replay after the Wild Shape split owners.

### Task 11 - L3MWILD-11-WILD-COMPANION-BOUNDARY-AUDIT

Audit Wild Companion after Find Familiar and Wild Shape splits.

### Task 12 - L3MWILD-12-MORNING-WILD-SHAPE-CONSOLIDATION

Final lane consolidation after dependent implementation tasks close.

## Verification

- RAW/ubiquitous-language check: read the relevant SRD passages in
  `.references/srd-5.2.1/Classes/Druid.md` and spell text before modeling.
- Reviewer-loop convergence: run RAW, ubiquitous-language/domain,
  architecture/connascence, and code-review passes until no reasonable findings
  remain.
- Run `pnpm unit-profile-coverage:check -- --write`, then
  `pnpm unit-profile-coverage:check`.
- Run `pnpm rules-kernel-coverage:check -- --write`, then
  `pnpm rules-kernel-coverage:check` if QNT/profile obligations change.
- Run focused runtime tests and `pnpm --filter @dnd/battle-runtime typecheck`.
- Run MBT only for completed battle-runtime behavior changes, under
  `.ralph/mbt-global.lock`, one MBT at a time.
