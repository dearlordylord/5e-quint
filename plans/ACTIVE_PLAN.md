# Active Plan

Date: 2026-05-06

This is the single active planning queue.
Completed PBA15A0A-PBA29 work was removed from this queue after closeout; older
closeout history remains in git history.
Completed QCORE0-QCORE6 work was removed from this active queue after closeout;
their research and proof artifacts remain linked from the rule-core docs and
task-specific research files.

Current authority summary:

- `@dnd/battle-runtime` plus `packages/battle-runtime/battle-runtime.qnt` is the
  promoted battle authority for new Unit/StatBlock-backed behavior.
- Root `battle.qnt` and old v0 battle code are legacy proof/restore source
  material only.
- The most recent proof work is `QCORE6`: Action and turn procedure facts over
  the shared action quota.
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
      "number": 91,
      "id": "QCORE7",
      "status": "ready-for-implementation-after-light-research",
      "title": "Prove Movement, Spatial Facts, and Grapple"
    },
    {
      "number": 92,
      "id": "QCORE8",
      "status": "blocked",
      "title": "Prove Reactions, Continuations, and Concentration"
    },
    {
      "number": 93,
      "id": "QCORE9",
      "status": "blocked",
      "title": "Prove Unit Feature Procedure Profiles"
    },
    {
      "number": 94,
      "id": "QCORE10",
      "status": "blocked",
      "title": "Prove Spell Procedure Profiles"
    },
    {
      "number": 95,
      "id": "QCORE11",
      "status": "blocked",
      "title": "Prove Stat-Block Controls"
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
| 91    | QCORE7 - Movement, Spatial Facts, and Grapple | ready-for-implementation-after-light-research | QCORE6 | QCORE8 | [QCORE3-QCORE11 pre-research](/workspace/typescript/dnd/plans/QCORE3_QCORE11_PRE_RESEARCH.md) | Prove Movement budget, caller spatial facts, full Stand from Prone, and Grapple bounded state. |
| 92    | QCORE8 - Reactions, Continuations, and Concentration | blocked | QCORE7 | QCORE9 | [QCORE3-QCORE11 pre-research](/workspace/typescript/dnd/plans/QCORE3_QCORE11_PRE_RESEARCH.md) | Prove bounded spell-free continuation/reaction protocol plus concentration; defer Readied Spell Response integration to QCORE10. |
| 93    | QCORE9 - Unit Feature Procedure Profiles | blocked | QCORE8 | QCORE10 | [QCORE3-QCORE11 pre-research](/workspace/typescript/dnd/plans/QCORE3_QCORE11_PRE_RESEARCH.md) | Prove feature procedure profiles after reaction/action/damage protocols exist; QNT models procedure facts, not Unit ids. |
| 94    | QCORE10 - Spell Procedure Profiles | blocked | QCORE9 | QCORE11 | [QCORE3-QCORE11 pre-research](/workspace/typescript/dnd/plans/QCORE3_QCORE11_PRE_RESEARCH.md) | Prove Spell Invocation procedure facts and Spell Effects; add Readied Spell Response integration with QCORE8. |
| 95    | QCORE11 - Stat-Block Controls | blocked | QCORE10 | none | [QCORE3-QCORE11 pre-research](/workspace/typescript/dnd/plans/QCORE3_QCORE11_PRE_RESEARCH.md) | Prove stat-block attack, Multiattack, limited-use, Recharge, and Legendary Action procedure facts after prior protocols exist. |

## Task Details

### Task 91 - QCORE7 - Movement, Spatial Facts, and Grapple

Status: `ready-for-implementation-after-light-research`

Depends on: QCORE6
Blocks: QCORE8

Pre-research: [QCORE3_QCORE11_PRE_RESEARCH.md](/workspace/typescript/dnd/plans/QCORE3_QCORE11_PRE_RESEARCH.md)

Scope: turn Movement budget, caller-supplied Movement cost, full Stand from
Prone, table/caller spatial facts, Opportunity Attack trigger facts, and bounded
Grapple/Escape/Release state.

### Task 92 - QCORE8 - Reactions, Continuations, and Concentration

Status: `blocked`

Depends on: QCORE7
Blocks: QCORE9

Pre-research: [QCORE3_QCORE11_PRE_RESEARCH.md](/workspace/typescript/dnd/plans/QCORE3_QCORE11_PRE_RESEARCH.md)

Scope: bounded spell-free reaction/continuation protocol, Opportunity Attack
and damage-interruption shallow integrations, Reaction Quota spend/reset, and
Concentration. Any nested/replay ordering or queue/stack policy needs a named
`ASSUMPTIONS.md` entry before implementation.

### Task 93 - QCORE9 - Unit Feature Procedure Profiles

Status: `blocked`

Depends on: QCORE8
Blocks: QCORE10

Pre-research: [QCORE3_QCORE11_PRE_RESEARCH.md](/workspace/typescript/dnd/plans/QCORE3_QCORE11_PRE_RESEARCH.md)

Scope: feature procedure facts for Action Surge, Second Wind, Cunning Action,
critical range 19, Rage, Reckless Attack, Sneak Attack, Evasion-style save
damage replacement, Cutting Words, and Uncanny Dodge. QNT models facts, not Unit
ids or authored Surface records.

### Task 94 - QCORE10 - Spell Procedure Profiles

Status: `blocked`

Depends on: QCORE9
Blocks: QCORE11

Pre-research: [QCORE3_QCORE11_PRE_RESEARCH.md](/workspace/typescript/dnd/plans/QCORE3_QCORE11_PRE_RESEARCH.md)

Scope: Spell Invocation procedure facts and Spell Effects for the production
spell procedures, including Magic Missile, Ray of Frost, Acid Splash, Healing
Word, Mage Armor, Spell Slot spend, Cantrip non-spend, and Readied Spell
Response integration with QCORE8.

### Task 95 - QCORE11 - Stat-Block Controls

Status: `blocked`

Depends on: QCORE10
Blocks: none

Pre-research: [QCORE3_QCORE11_PRE_RESEARCH.md](/workspace/typescript/dnd/plans/QCORE3_QCORE11_PRE_RESEARCH.md)

Scope: Stat Block attack options, Multiattack named dispatch procedure,
Stat Block Bonus Action options, Reaction and Legendary Action windows, X/Day,
Recharge, Recharge after rest, and start-turn recharge roll after StatBlock
projection. Cite `ASSUMPTIONS.md` A18 for Multiattack mapping and interleaving.
