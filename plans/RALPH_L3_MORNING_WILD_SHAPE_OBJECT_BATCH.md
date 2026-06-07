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
      "status": "done",
      "title": "Audit merged-equipment no-effect parity after disposition owner"
    },
    {
      "number": 6,
      "id": "L3MWILD-06-FORM-LIMB-OBJECT-CONSUMER-CLOSURE",
      "status": "done",
      "title": "Close form-limb object-consumer boundary"
    },
    {
      "number": 7,
      "id": "L3MWILD-07-ACTIVE-FORM-PERSISTENCE-BLOCKER",
      "status": "done",
      "title": "Record active-form persistence owner-decision blocker"
    },
    {
      "number": 8,
      "id": "L3MWILD-08-ACID-ARROW-OWNER-DECISION-BLOCKER",
      "status": "done",
      "title": "Superseded: Acid Arrow RAW blocker is closed"
    },
    {
      "number": 9,
      "id": "L3MWILD-09-RESIDUAL-LEDGER-CONSOLIDATION",
      "status": "done",
      "title": "Consolidate residual Wild Shape ledgers after Acid Arrow closure"
    },
    {
      "number": 10,
      "id": "L3MWILD-10-WILD-SHAPE-SELECTED-IDENTITY-AUDIT",
      "status": "done",
      "title": "Audit Wild Shape selected-identity replay after split owners"
    },
    {
      "number": 11,
      "id": "L3MWILD-11-WILD-COMPANION-BOUNDARY-AUDIT",
      "status": "done",
      "title": "Audit Wild Companion boundary after Find Familiar and Wild Shape splits"
    },
    {
      "number": 12,
      "id": "L3MWILD-12-OBJECT-UTILIZE-CONSUMER-EXECUTION",
      "status": "done",
      "title": "Promote concrete Wild Shape object and Utilize consumers"
    },
    {
      "number": 13,
      "id": "L3MWILD-13-GENERIC-OBJECT-UTILIZE-REMAINDER",
      "status": "done",
      "title": "Research remaining Wild Shape generic object and Utilize consumers"
    },
    {
      "number": 14,
      "id": "L3MWILD-14-MORNING-WILD-SHAPE-CONSOLIDATION",
      "status": "ready-for-implementation",
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
|     5 | L3MWILD-05-MERGED-EQUIPMENT-NO-EFFECT-PARITY   | done                                          | L3MWILD-02-EQUIPMENT-DISPOSITION-OWNER                                                                                                                                                                                         | Merged-equipment no-effect parity is covered in the Wild Shape lifecycle MBT witness; generated coverage text no longer treats it as unsupported residue. |
|     6 | L3MWILD-06-FORM-LIMB-OBJECT-CONSUMER-CLOSURE   | done                                          | L3MWILD-02-EQUIPMENT-DISPOSITION-OWNER                                                                                                                                                                                         | Promoted explicit form-limb object-handling witness storage on the active Wild Shape effect.                                          |
|     7 | L3MWILD-07-ACTIVE-FORM-PERSISTENCE-BLOCKER     | done                                          | none                                                                                                                                                                                                                           | Replaced stale dependency text with an explicit owner-decision blocker.                                                               |
|     8 | L3MWILD-08-ACID-ARROW-OWNER-DECISION-BLOCKER   | done                                          | none                                                                                                                                                                                                                           | Superseded by completed Acid Arrow RAW corpus reconciliation and delayed runtime support; no `ASSUMPTIONS.md` override is pending.    |
|     9 | L3MWILD-09-RESIDUAL-LEDGER-CONSOLIDATION       | done                                          | L3MWILD-01-PERCEPTION-COMMUNICATION-PROJECTION, L3MWILD-02-EQUIPMENT-DISPOSITION-OWNER, L3MWILD-07-ACTIVE-FORM-PERSISTENCE-BLOCKER, L3MWILD-08-ACID-ARROW-OWNER-DECISION-BLOCKER                                               | Regenerated and verified residual ledgers; generated artifacts were already current.                                                  |
|    10 | L3MWILD-10-WILD-SHAPE-SELECTED-IDENTITY-AUDIT  | done                                          | none                                                                                                                                                                                                                           | Wild Shape selected-identity replay is covered by the focused form-lifecycle MBT witness.                                             |
|    11 | L3MWILD-11-WILD-COMPANION-BOUNDARY-AUDIT       | done                                          | none                                                                                                                                                                                                                           | Wild Companion now closes only the explicit SRDINV86 companion-control residue and delegates familiar lifecycle to the promoted Find Familiar Unit. |
|    12 | L3MWILD-12-OBJECT-UTILIZE-CONSUMER-EXECUTION   | done                                          | L3MWILD-06-FORM-LIMB-OBJECT-CONSUMER-CLOSURE                                                                                                                                                                                   | Promoted practical worn selected-loadout weapon attacks plus held-weapon spell/feature consumers from the stored form-limb witness. |
|    13 | L3MWILD-13-GENERIC-OBJECT-UTILIZE-REMAINDER    | done                                          | L3MWILD-12-OBJECT-UTILIZE-CONSUMER-EXECUTION                                                                                                                                                                                   | Closed remaining generic non-weapon object/Utilize, dropped-object table-use, and non-resizing/non-reshaping object lifecycle work to a future generic object/Utilize/table-placement owner. |
|    14 | L3MWILD-14-MORNING-WILD-SHAPE-CONSOLIDATION    | ready-for-implementation                      | L3MWILD-03-WORN-EQUIPMENT-EFFECTIVE-LOADOUT, L3MWILD-04-FALLEN-EQUIPMENT-OBJECT-BOUNDARY, L3MWILD-05-MERGED-EQUIPMENT-NO-EFFECT-PARITY, L3MWILD-06-FORM-LIMB-OBJECT-CONSUMER-CLOSURE, L3MWILD-09-RESIDUAL-LEDGER-CONSOLIDATION, L3MWILD-12-OBJECT-UTILIZE-CONSUMER-EXECUTION, L3MWILD-13-GENERIC-OBJECT-UTILIZE-REMAINDER | Final lane report and cleanup after all listed dependencies closed.                                                                    |

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
- Practical worn armor/Shield is promoted by Task 3; practical worn weapons
  and held-weapon consumers are promoted by Task 12; generic non-weapon held
  objects and generic object handling remain Task 13.

### Task 3 - L3MWILD-03-WORN-EQUIPMENT-EFFECTIVE-LOADOUT

Promote effective-loadout projection for worn equipment after the disposition
owner exists.

Landed scope:

- Production resolution accepts practical `worn` choices for selected-loadout
  armor and Shields and projects their Armor Class, armor/shield predicates, and
  shield hand use while shaped.
- Practical worn weapons and held-weapon consumers are promoted by Task 12;
  generic non-weapon held objects remain Task 13; fallen equipment remains
  Task 4.

### Task 4 - L3MWILD-04-FALLEN-EQUIPMENT-OBJECT-BOUNDARY

Promote fallen-equipment outcomes only at the explicit object/table boundary.

Landed scope:

- Production Wild Shape resolution accepts `falls` equipment choices and
  not-practical-to-wear fallbacks, emits transient `droppedObjects` outcomes
  sourced to Wild Shape, and keeps fallen equipment out of active worn/merged
  effect disposition.
- Practical worn weapons and held-weapon consumers are promoted by Task 12.
  Downstream table placement/use, generic non-weapon held objects, and
  non-resizing/non-reshaping object lifecycle remain Task 13 object work.

### Task 5 - L3MWILD-05-MERGED-EQUIPMENT-NO-EFFECT-PARITY

Audit merged-equipment no-effect parity and generated coverage after Task 2's
merge-only owner. Close this task by confirming whether any QNT, MBT, coverage,
or report residue still treats merged equipment as an unsupported follow-up; fix
only those remaining parity/ledger gaps and avoid duplicating inventory state.

Landed scope:

- The focused Wild Shape lifecycle MBT witness now exercises selected-loadout
  equipment resolved as all `merges`, verifies that merged equipment is stored
  on the active Wild Shape effect, and verifies that Beast statistics rather
  than merged equipment project while the form is active.
- Rules-kernel coverage artifacts now describe merged equipment as covered
  no-effect parity while keeping durable fallen-object consumers, worn weapons,
  held objects, non-resizing/non-reshaping behavior, and form-limb object
  handling assigned to L3MWILD-06.

### Task 6 - L3MWILD-06-FORM-LIMB-OBJECT-CONSUMER-CLOSURE

Close or promote object/Utilize consumers that require the form-limb witness.

Landed scope:

- Wild Shape equipment-disposition fills carry an explicit caller/GM
  form-limb object-handling witness even when there are no selected-loadout
  equipment candidates.
- The reducer stores that witness on the active Wild Shape effect for later
  object/Utilize consumers. It does not derive object-handling anatomy from the
  Beast form's authored identity.
- Practical worn weapon execution and held-weapon spell/feature consumers are
  promoted by Task 12. Generic non-weapon held objects,
  non-resizing/non-reshaping object lifecycle, downstream table placement/use
  of dropped objects, and generic object/Utilize consumers remain Task 13.

### Task 7 - L3MWILD-07-ACTIVE-FORM-PERSISTENCE-BLOCKER

Record the cross-session active-form persistence blocker as an explicit
owner-decision row, not a stale dependency label.

### Task 8 - L3MWILD-08-ACID-ARROW-OWNER-DECISION-BLOCKER

Historical note: this task originally recorded Acid Arrow as an owner-decision
blocker. That blocker is now superseded by the completed local SRD corpus
reconciliation and delayed runtime support. Do not use this task as live Acid
Arrow work.

### Task 9 - L3MWILD-09-RESIDUAL-LEDGER-CONSOLIDATION

Regenerate and verify residual ledgers after the ready tasks and explicit
blockers land.

Landed scope:

- Unit-profile and rules-kernel residual ledgers were regenerated and verified
  current after Tasks 7 and 8 recorded explicit blocker rows; no generated
  artifact changes were needed.

### Task 10 - L3MWILD-10-WILD-SHAPE-SELECTED-IDENTITY-AUDIT

Audit selected-identity replay after the Wild Shape split owners.

Landed scope:

- `druid_wild_shape` now has selected-identity MBT evidence in the focused Wild
  Shape form-lifecycle witness, covering assume form, reuse, dismissal,
  Incapacitated reversion, and death reversion replay.
- Unit-profile coverage evidence and the generated matrix now count the Wild
  Shape selected-identity witness.

### Task 11 - L3MWILD-11-WILD-COMPANION-BOUNDARY-AUDIT

Audit Wild Companion after Find Familiar and Wild Shape splits.

Landed scope:

- `druid_wild_companion` now delegates familiar lifecycle behavior to the
  promoted `find_familiar` Unit and no longer lists Druid Wild Shape follow-up
  owners as Wild Companion residue.
- Remaining Wild Companion deferred mechanics are limited to unsupported
  familiar form attacks and companion command/action selection beyond table
  choices under the explicit `SRDINV86` companion-control boundary.

### Task 12 - L3MWILD-12-OBJECT-UTILIZE-CONSUMER-EXECUTION

Promote concrete Wild Shape object and Utilize consumers that now have a stored
form-limb object-handling witness.

Inputs:

- Active Wild Shape effect `formLimbs` witness from Task 6.
- Existing selected-loadout, active-form, dropped-object, table-position, and
  object/Utilize action facts.
- `.references/srd-5.2.1/Classes/Druid.md` Wild Shape Objects text and
  `.references/srd-5.2.1/Playing-the-Game.md` object interaction / Utilize
  text.

Outputs:

- Typed workflows and focused tests for concrete object consumers that use the
  stored form-limb witness rather than form id/name/provenance.
- Worn weapon and held-object execution, non-resizing/non-reshaping object
  behavior, and downstream table placement/use of Wild Shape dropped objects
  where those consumers are promoted.
- No parallel Wild Shape inventory, equipment, or table-placement state.

Landed scope:

- Practical worn selected-loadout weapon attacks are available while shaped
  only when the active Wild Shape effect stores a form-limb witness that can
  handle objects and the exact selected-loadout weapon was resolved as worn.
- Held-weapon spell and feature consumers use the same witness and exact
  selected-loadout object gate rather than deriving anatomy from form identity.
- Generic non-weapon held objects, broad object interaction/Utilize procedures,
  downstream table placement/use of dropped Wild Shape objects, and
  non-resizing/non-reshaping object lifecycle beyond preserving selected
  loadout object refs remain outside this landed scope.

### Task 13 - L3MWILD-13-GENERIC-OBJECT-UTILIZE-REMAINDER

Narrow and implement or explicitly close the remaining Wild Shape Objects work
that Task 12 did not promote.

Inputs:

- Task 12's centralized worn-object gate and active-effect `formLimbs` witness.
- Existing `droppedObjects`, table-position, object-target, object-contact, and
  Command Drop held-object boundary facts.
- `plans/WILD_SHAPE_OBJECT_ANATOMY_EQUIPMENT_PLAN.md`.
- `.references/srd-5.2.1/Classes/Druid.md` Wild Shape Objects text and
  `.references/srd-5.2.1/Playing-the-Game.md` object interaction / Utilize
  text.

Outputs:

- A research-backed implementation split that either promotes concrete generic
  non-weapon object/Utilize consumers or records why they have no current
  battle-runtime owner independent of table/object procedure state.
- If promoted, typed workflows and focused tests for generic non-weapon held
  objects, downstream use of Wild Shape dropped objects, and
  non-resizing/non-reshaping object lifecycle, deriving from existing loadout,
  active-form, form-limb witness, dropped-object, and table-position facts.
- No parallel Wild Shape inventory, equipment, or table-placement state.

Landed scope:

- Reviewed the local Wild Shape Objects and object interaction / Utilize RAW
  plus ubiquitous-language terms for the remaining object branches.
- No additional Wild Shape-specific generic non-weapon object or generic
  Utilize consumer was promoted. The current battle runtime has selected-loadout
  object refs, `droppedObjects` boundary outcomes, Command Drop caller/table
  facts, and the active `formLimbs` witness, but no canonical generic
  carried-object inventory or table-placement lifecycle for loose objects.
- Remaining generic non-weapon held objects, downstream use of Wild Shape
  `droppedObjects`, generic object interaction / Utilize procedures, and
  durable non-resizing/non-reshaping loose-object lifecycle are closed outside
  the promoted Wild Shape battle-runtime profile to a future generic
  object/Utilize/table-placement owner. Future consumers must use existing
  selected-loadout refs, dropped-object boundary outcomes, and the stored
  form-limb witness without adding Wild Shape-local inventory or authored form
  identity dispatch.

### Task 14 - L3MWILD-14-MORNING-WILD-SHAPE-CONSOLIDATION

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
