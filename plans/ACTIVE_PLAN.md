# Active Plan

Date: 2026-05-07

This is the single active planning queue.
Completed PBA15A0A-PBA29 work was removed from this queue after closeout; older
closeout history remains in git history.
Completed historical work was removed from this active queue after closeout;
older closeout history remains in git history, task-specific research files,
and linked package documentation.

Current authority summary:

- `@dnd/battle-runtime` plus `packages/battle-runtime/battle-runtime.qnt` is the
  promoted battle authority for new Unit/StatBlock-backed behavior.
- Archived restore-source packages are not active implementation targets.
- The most recent proof work is `QCORE11`: Stat Block attack controls,
  Multiattack named dispatch, Bonus Action and Reaction windows, Legendary
  Action windows, X/Day, Recharge, rest recharge, and start-turn recharge rolls.
- Broad widening should proceed through typed projection parsers and
  package-owned runtime procedures rather than authored-id dispatch,
  support-gate terminology, or projected-executable vocabulary.

Primary context links:

- [CORRECTION_APPLICATION_MIGRATION_PLAN.md](/workspace/typescript/dnd/plans/CORRECTION_APPLICATION_MIGRATION_PLAN.md)
- [ARCHITECTURE.md](/workspace/typescript/dnd/ARCHITECTURE.md)
- [MOVEMENT_GEOMETRY_OWNERSHIP.md](/workspace/typescript/dnd/plans/MOVEMENT_GEOMETRY_OWNERSHIP.md)
- [MCPA3_SPATIAL_ACTION_CONTRACTS.md](/workspace/typescript/dnd/plans/MCPA3_SPATIAL_ACTION_CONTRACTS.md)
- [packages/battle-runtime/README.md](/workspace/typescript/dnd/packages/battle-runtime/README.md)
- [packages/battle-runtime/ARCHITECTURE_GRAPH.md](/workspace/typescript/dnd/packages/battle-runtime/ARCHITECTURE_GRAPH.md)
- [packages/character-creation-runtime/README.md](/workspace/typescript/dnd/packages/character-creation-runtime/README.md)
- [packages/character-creation-runtime/VOCABULARY.md](/workspace/typescript/dnd/packages/character-creation-runtime/VOCABULARY.md)
- [QCORE0_COMPOSITION_RESEARCH.md](/workspace/typescript/dnd/plans/QCORE0_COMPOSITION_RESEARCH.md)
- [QCORE2_100_PERCENT_RAW_COVERAGE_RESEARCH.md](/workspace/typescript/dnd/plans/QCORE2_100_PERCENT_RAW_COVERAGE_RESEARCH.md)
- [QCORE3_QCORE11_PRE_RESEARCH.md](/workspace/typescript/dnd/plans/QCORE3_QCORE11_PRE_RESEARCH.md)
- [QMBT1_QMBT5_PRE_RESEARCH.md](/workspace/typescript/dnd/plans/QMBT1_QMBT5_PRE_RESEARCH.md)
- [rule-core README](/workspace/typescript/dnd/packages/shared-algebras/proofs/rule-core/README.md)

## Status Vocabulary

- `ready-for-research`: research/source reading is the next step.
- `ready-for-implementation-after-light-research`: implementation may begin
  after the listed RAW/blast-radius check.
- `blocked`: a dependency or owner decision must land first.
- `deferred`: owner explicitly parked the work.
- `done`: work completed and verification recorded.

## Ralph Task Index

The Ralph harness reads this machine-readable index for task order and status.
Keep it synchronized with the DAG table and task details.

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 164,
      "id": "QMBT69",
      "status": "deferred",
      "title": "Recursive Unit Profile Planning Review"
    },
    {
      "number": 217,
      "id": "SRDINV31C",
      "status": "ready-for-research",
      "title": "Promote Divine Smite After-Hit Runtime"
    },
    {
      "number": 218,
      "id": "SRDINV31D",
      "status": "ready-for-research",
      "title": "Promote Ensnaring Strike Runtime"
    },
    {
      "number": 219,
      "id": "SRDINV31E",
      "status": "ready-for-research",
      "title": "Promote Searing Smite Runtime"
    },
    {
      "number": 220,
      "id": "SRDINV31F",
      "status": "ready-for-research",
      "title": "Promote True Strike Weapon Spell Runtime"
    },
    {
      "number": 223,
      "id": "SRDINV33",
      "status": "blocked",
      "title": "Recursive SRD Inventory Planning Review"
    },
    {
      "number": 224,
      "id": "SRDINV34",
      "status": "blocked",
      "title": "Promote Starry Wisp Object Target Runtime"
    }
  ]
}
-->

## Handoff Rules

- Start with the lowest-numbered task whose status is
  `ready-for-implementation-after-light-research` or `ready-for-research`.
- Keep this file small. Put research, closeout detail, and long evidence in
  task-specific plan files or archive files, then link them here.
- When changing a task's status, dependency, order, ID, or title, update the
  Ralph Task Index, DAG table, and task details in the same edit.
- Any implementation task must read the relevant local SRD text under
  `.references/srd-5.2.1/` and check `UBIQUITOUS_LANGUAGE.md` before rules
  edits.
- Battle-runtime behavior changes must update
  `packages/battle-runtime/README.md` and
  `packages/battle-runtime/ARCHITECTURE_GRAPH.md` when architecture or public
  behavior changes.
- Spatial facts always come from the table/caller/session. Do not plan grid
  state, LOS/pathfinding/cover derivation, or adjacency caches in Core,
  promoted runtimes, or MCP; plan explicit table-supplied facts instead.
- Character-creation behavior changes must update
  `packages/character-creation-runtime/README.md` and
  `packages/character-creation-runtime/VOCABULARY.md` when architecture or
  vocabulary changes.
- Shared algebra changes must update `packages/shared-algebras/README.md` or
  relevant package-local proof docs.
- Do not run battle MBT for research-only tasks. Use the smallest MBT tier that
  actually validates a completed behavior change.
- Implementation closeout must include `/simplify` convergence: minimum two
  rounds unless the changeset is trivial.

## DAG / Queue Order

| Order | Task                                                      | Status             | Depends on | Blocks | Research / plan | Next action |
| ----- | --------------------------------------------------------- | ------------------ | ---------- | ------ | --------------- | ----------- |
| 164   | QMBT69 - Recursive Unit Profile Planning Review | deferred | QMBT68 | none | [QMBT66 review](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT66_RECURSIVE_PLANNING_REVIEW.md), [Unit profile coverage report](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md), [ACTIVE_PLAN](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md) | Still parked by the SRD inventory frontier instruction; QMBT68 is complete, but the older QMBT queue remains deferred until that frontier resumes it. |
| 217   | SRDINV31C - Promote Divine Smite After-Hit Runtime | ready-for-research | SRDINV28A-SRDINV28E | SRDINV33 | [Divine Smite](/workspace/typescript/dnd/packages/surface/content/divine_smite.dhall), [SRD Spells](/workspace/typescript/dnd/.references/srd-5.2.1/Spells) | Promote immediate after-hit Bonus Action smite damage without replaying the base attack. |
| 218   | SRDINV31D - Promote Ensnaring Strike Runtime | ready-for-research | SRDINV28A-SRDINV28E | SRDINV33 | [Ensnaring Strike](/workspace/typescript/dnd/packages/surface/content/ensnaring_strike.dhall), [SRD Spells](/workspace/typescript/dnd/.references/srd-5.2.1/Spells) | Promote after-hit save-gated Restrained, start-turn damage, and escape lifecycle. |
| 219   | SRDINV31E - Promote Searing Smite Runtime | ready-for-research | SRDINV28A-SRDINV28E | SRDINV33 | [Searing Smite](/workspace/typescript/dnd/packages/surface/content/searing_smite.dhall), [SRD Spells](/workspace/typescript/dnd/.references/srd-5.2.1/Spells) | Promote after-hit Fire damage plus recurring start-turn damage and save-to-end. |
| 220   | SRDINV31F - Promote True Strike Weapon Spell Runtime | ready-for-research | SRDINV28A-SRDINV28E | SRDINV33 | [True Strike](/workspace/typescript/dnd/packages/surface/content/true_strike.dhall), [SRD Spells](/workspace/typescript/dnd/.references/srd-5.2.1/Spells) | Promote spell-hosted weapon attack with spellcasting ability and damage type choice. |
| 223   | SRDINV33 - Recursive SRD Inventory Planning Review | blocked | SRDINV28A-SRDINV28E, SRDINV29A-SRDINV29E, SRDINV29F3, SRDINV30A-SRDINV32B | SRDINV34 | [SRDINV27 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV27_RECURSIVE_PLANNING_REVIEW.md), [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [SRD inventory Ralph batch plan](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md), [ACTIVE_PLAN](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md) | Review the split spell-runtime closure, refresh spell Unit metrics, and append Ralph-sized follow-up tasks only after checking execution-invariant granularity. |
| 224   | SRDINV34 - Promote Starry Wisp Object Target Runtime | blocked | SRDINV33 | none | [SRDINV28E decision](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV28E_STARRY_WISP_OBJECT_TARGET_DECISION.md), [battle-runtime target facts](/workspace/typescript/dnd/packages/battle-runtime/src/battle-reducer/spells-targeting.ts), [Starry Wisp](/workspace/typescript/dnd/packages/surface/content/starry_wisp.dhall), [Chill Touch](/workspace/typescript/dnd/packages/surface/content/chill_touch.dhall), [SRD Starry Wisp](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md), [SRD Chill Touch](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote the Starry Wisp creature-or-object target boundary only after SRDINV33 orders it against the remaining spell-runtime frontier. |

## Task Details
### Task 164 - QMBT69 - Recursive Unit Profile Planning Review

Status: `deferred`

Depends on: QMBT68

Blocks: none

Research / plan:
[QMBT66_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT66_RECURSIVE_PLANNING_REVIEW.md),
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md),
[ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md)

Scope: deferred while the SRD inventory frontier runs. QMBT68 is complete; when
resumed, review QMBT67-QMBT68 findings, update the PRD and plan docs, and append
the next coherent widening or cleanup batch unless the Unit profile matrix lane
is explicitly complete. AC/base-formula work is a strong candidate because
Barbarian and Monk Unarmored Defense have repeatedly been deferred for
one-formula-at-a-time semantics, but QMBT69 must re-check the refreshed matrix
and QMBT67-QMBT68 discoveries before selecting the next batch.

Out of scope: implementation work not captured by the new task batch.

Verification: RAW/source review for QMBT67-QMBT68 findings and any appended
rule slices; active-plan consistency check across Ralph index, DAG table, and
task details; `pnpm unit-profile-coverage:check` if matrix docs or generated
artifacts change; `/simplify` convergence, minimum two rounds unless the final
changeset is trivial.

### Task 217 - SRDINV31C - Promote Divine Smite After-Hit Runtime

Status: `ready-for-research`

Depends on: SRDINV28A-SRDINV28E

Blocks: SRDINV33

Scope: promote Divine Smite as an already-hit melee weapon/unarmed trigger,
Bonus Action and slot spend, Radiant damage scaling, and Fiend/Undead bonus.
Do not replay or duplicate the base attack.

### Task 218 - SRDINV31D - Promote Ensnaring Strike Runtime

Status: `ready-for-research`

Depends on: SRDINV28A-SRDINV28E

Blocks: SRDINV33

Scope: promote Ensnaring Strike's weapon-hit trigger, Strength save, Restrained
condition, Concentration cleanup, start-turn Piercing damage, slot scaling, and
escape action.

### Task 219 - SRDINV31E - Promote Searing Smite Runtime

Status: `ready-for-research`

Depends on: SRDINV28A-SRDINV28E

Blocks: SRDINV33

Scope: promote Searing Smite's immediate after-hit Fire damage, timed duration,
start-turn damage, Constitution save, save-to-end behavior, and slot scaling.

### Task 220 - SRDINV31F - Promote True Strike Weapon Spell Runtime

Status: `ready-for-research`

Depends on: SRDINV28A-SRDINV28E

Blocks: SRDINV33

Scope: promote True Strike as a spell-hosted weapon attack with material
component weapon eligibility, spellcasting ability override, Radiant-or-normal
damage choice, and cantrip scaling.

### Task 223 - SRDINV33 - Recursive SRD Inventory Planning Review

Status: `blocked`

Depends on: SRDINV28A-SRDINV28E, SRDINV29A-SRDINV29E, SRDINV29F3, SRDINV30A-SRDINV32B

Blocks: SRDINV34

Research / plan:
[SRDINV27_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV27_RECURSIVE_PLANNING_REVIEW.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[SRDINV_RALPH_BATCH_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md),
[ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md)

Scope: review SRDINV28A-SRDINV28E, SRDINV29A-SRDINV29E, SRDINV29F3, and
SRDINV30A-SRDINV32B spell-runtime
closure, refresh generated inventory metrics, and append the next concrete
spell frontier. Likely frontiers are installed unsupported spell owner evidence,
missing Detect spell authoring, and remaining Spell Surface blockers.

Granularity rule: before appending tasks, split every candidate by execution
invariant. A task is too broad if it contains multiple independent target/fill
protocols, stateful loops, recurring triggers, object-target support, area
geometry, reaction timing, or unrelated effect lifecycles. Chromatic Orb-style
repeated holes and Grease-style recurring hazards must be standalone research
or implementation slices, not bundled into generic spell-runtime tasks.

Support-claim rule: matrix/unit claims must only be promoted when the SRD
mechanic is executable. Metadata-only state, stored facts with no later
procedure, or partial reducer support must stay checker-visible as unsupported
or partial. Recursive reviews must inspect rejected implementation findings and
turn them into concrete retry guidance before unblocking follow-up work.

Coverage done-state gate: any task that changes `UNIT-IDENTITY-EVIDENCE`,
`unit-claims.jsonl`, `unit-evidence.jsonl`, `profiles.jsonl`, profile owner
markers, or Surface catalog admission must run
`pnpm unit-profile-coverage:check --write`, include generated
`plans/unit-profile-coverage/` artifacts, and keep this active plan consistent
with `SRD_UNIT_INVENTORY.md` before the task is marked `done`.

Out of scope: implementation work not captured by the newly appended batch,
PHB/XPHB pressure, broad runtime rewrites, and treating catalog admission alone
as behavior support.

Verification: active-plan consistency across Ralph index, DAG table, and task
details; regenerated inventory; `pnpm unit-profile-coverage:check`; confirm
the appended result is Ralph-sized concrete work rather than a passive backlog
list or omnibus runtime task; `/simplify` convergence, minimum two rounds unless
the final changeset is trivial.

### Task 224 - SRDINV34 - Promote Starry Wisp Object Target Runtime

Status: `blocked`

Depends on: SRDINV33

Blocks: none

Research / plan:
[SRDINV28E_STARRY_WISP_OBJECT_TARGET_DECISION.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV28E_STARRY_WISP_OBJECT_TARGET_DECISION.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[battle-reducer.ts](/workspace/typescript/dnd/packages/battle-runtime/src/battle-reducer.ts),
[Starry Wisp](/workspace/typescript/dnd/packages/surface/content/starry_wisp.dhall),
[Chill Touch](/workspace/typescript/dnd/packages/surface/content/chill_touch.dhall),
[SRD Starry Wisp](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md),
[SRD Chill Touch](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote the Starry Wisp creature-or-object spell target boundary after
SRDINV33 orders it against the remaining spell-runtime frontier. Cover typed
object target identity, caller-supplied range/spatial targetability facts,
ranged spell attack hit/miss adjudication against object targets, object damage
disposition, and a precise supported-subset decision for Dim Light emission and
Invisible-benefit denial. Decide whether the same target branch covers Chill
Touch's generic "target within reach" wording; if it does not, keep Chill Touch
as a combatant-target subset with checker-visible deferred evidence.

Out of scope: broad object simulation, inventory-wide object support, Fire
Bolt object ignition, Produce Flame held-light state, and general illumination
simulation beyond the exact Starry Wisp supported-subset decision.

Verification: RAW/source review for Starry Wisp and Chill Touch target wording;
focused tests for object target discovery/fill validation, range fact
rejection, attack hit/miss, object damage disposition, and any supported rider
subset; `pnpm unit-profile-coverage:check`; `pnpm quality`; MBT only if
promoted battle-runtime behavior changes.

