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
      "number": 91,
      "id": "QCORE7",
      "status": "done",
      "title": "Prove Movement, Spatial Facts, and Grapple"
    },
    {
      "number": 92,
      "id": "QCORE8",
      "status": "done",
      "title": "Prove Reactions, Continuations, and Concentration"
    },
    {
      "number": 93,
      "id": "QCORE9",
      "status": "done",
      "title": "Prove Unit Feature Procedure Profiles"
    },
    {
      "number": 94,
      "id": "QCORE10",
      "status": "done",
      "title": "Prove Spell Procedure Profiles"
    },
    {
      "number": 95,
      "id": "QCORE11",
      "status": "done",
      "title": "Prove Stat-Block Controls"
    },
    {
      "number": 96,
      "id": "QMBT1",
      "status": "done",
      "title": "Standard Rule-Core MBT Bridge Contract"
    },
    {
      "number": 97,
      "id": "QMBT2",
      "status": "done",
      "title": "Movement and Grapple Runtime Parity"
    },
    {
      "number": 98,
      "id": "QMBT3",
      "status": "ready-for-implementation-after-light-research",
      "title": "Reaction and Continuation Runtime Parity"
    },
    {
      "number": 99,
      "id": "QMBT4",
      "status": "ready-for-implementation-after-light-research",
      "title": "Feature Procedure Runtime Parity"
    },
    {
      "number": 100,
      "id": "QMBT5",
      "status": "ready-for-implementation-after-light-research",
      "title": "Spell Procedure Runtime Parity"
    },
    {
      "number": 101,
      "id": "QMBT6",
      "status": "ready-for-implementation-after-light-research",
      "title": "Stat-Block Control Runtime Parity"
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
| 91    | QCORE7 - Movement, Spatial Facts, and Grapple | done | QCORE6 | QCORE8 | [QCORE3-QCORE11 pre-research](/workspace/typescript/dnd/plans/QCORE3_QCORE11_PRE_RESEARCH.md) | Completed movement budget, caller spatial facts, full Stand from Prone, and Grapple bounded state proof. |
| 92    | QCORE8 - Reactions, Continuations, and Concentration | done | QCORE7 | QCORE9 | [QCORE3-QCORE11 pre-research](/workspace/typescript/dnd/plans/QCORE3_QCORE11_PRE_RESEARCH.md) | Completed bounded spell-free continuation/reaction protocol, Opportunity Attack and damage-interruption shallow integrations, Reaction quota spend/reset, Readied Movement Response, and Concentration. |
| 93    | QCORE9 - Unit Feature Procedure Profiles | done | QCORE8 | QCORE10 | [QCORE3-QCORE11 pre-research](/workspace/typescript/dnd/plans/QCORE3_QCORE11_PRE_RESEARCH.md) | Completed projection-shaped feature procedure profiles and owned proof machine without Unit ids or authored Surface records. |
| 94    | QCORE10 - Spell Procedure Profiles | done | QCORE9 | QCORE11 | [QCORE3-QCORE11 pre-research](/workspace/typescript/dnd/plans/QCORE3_QCORE11_PRE_RESEARCH.md) | Completed Spell Invocation facts, production Spell Effects, and Readied Spell Response integration. |
| 95    | QCORE11 - Stat-Block Controls | done | QCORE10 | QMBT1 | [QCORE3-QCORE11 pre-research](/workspace/typescript/dnd/plans/QCORE3_QCORE11_PRE_RESEARCH.md) | Completed Stat Block attack controls, Multiattack named dispatch, limited-use, Recharge, rest recharge, and Legendary Action procedure facts. |
| 96    | QMBT1 - Standard Rule-Core MBT Bridge Contract | done | QCORE7-QCORE11 | QMBT2-QMBT6 | [QMBT1-QMBT6 pre-research](/workspace/typescript/dnd/plans/QMBT1_QMBT5_PRE_RESEARCH.md) | Completed reusable focused-QMBT contract, projection discipline, file placement, timing command, and first movement runnable pattern without broad battle state explosion. |
| 97    | QMBT2 - Movement and Grapple Runtime Parity | done | QMBT1, QCORE7 | none | [QMBT1-QMBT6 pre-research](/workspace/typescript/dnd/plans/QMBT1_QMBT5_PRE_RESEARCH.md) | Completed focused runtime MBT parity for QCORE7 movement budget, Dash, Disengage, Stand, Grapple/Escape/Release, and OA-decline resume. |
| 98    | QMBT3 - Reaction and Continuation Runtime Parity | ready-for-implementation-after-light-research | QMBT1, QCORE8 | none | [QMBT1-QMBT6 pre-research](/workspace/typescript/dnd/plans/QMBT1_QMBT5_PRE_RESEARCH.md) | Add focused runtime MBT parity for QCORE8 reaction offer/decline/spend, continuation resume, readied movement, and concentration break/hold. |
| 99    | QMBT4 - Feature Procedure Runtime Parity | ready-for-implementation-after-light-research | QMBT1, QCORE9 | none | [QMBT1-QMBT6 pre-research](/workspace/typescript/dnd/plans/QMBT1_QMBT5_PRE_RESEARCH.md) | Add focused runtime MBT parity for QCORE9 feature procedure profiles through production feature reducers and projections. |
| 100   | QMBT5 - Spell Procedure Runtime Parity | ready-for-implementation-after-light-research | QMBT1, QCORE10 | none | [QMBT1-QMBT6 pre-research](/workspace/typescript/dnd/plans/QMBT1_QMBT5_PRE_RESEARCH.md) | Add focused runtime MBT parity for QCORE10 spell procedure profiles through production spell reducers and projections. |
| 101   | QMBT6 - Stat-Block Control Runtime Parity | ready-for-implementation-after-light-research | QMBT1, QCORE11 | none | [QMBT1-QMBT6 pre-research](/workspace/typescript/dnd/plans/QMBT1_QMBT5_PRE_RESEARCH.md) | Add focused runtime MBT parity for QCORE11 stat-block control profiles, starting with Multiattack interleaving; keep Legendary Actions as a separate later tracer. |

## Task Details

### Task 91 - QCORE7 - Movement, Spatial Facts, and Grapple

Status: `done`

Depends on: QCORE6
Blocks: QCORE8

Pre-research: [QCORE3_QCORE11_PRE_RESEARCH.md](/workspace/typescript/dnd/plans/QCORE3_QCORE11_PRE_RESEARCH.md)

Scope: turn Movement budget, caller-supplied Movement cost, full Stand from
Prone, table/caller spatial facts, Opportunity Attack trigger facts, and bounded
Grapple/Escape/Release state.

### Task 92 - QCORE8 - Reactions, Continuations, and Concentration

Status: `done`

Depends on: QCORE7
Blocks: QCORE9

Pre-research: [QCORE3_QCORE11_PRE_RESEARCH.md](/workspace/typescript/dnd/plans/QCORE3_QCORE11_PRE_RESEARCH.md)

Completed scope: bounded spell-free reaction/continuation protocol,
Opportunity Attack and damage-interruption shallow integrations, Reaction Quota
spend/reset, Readied Movement Response, and Concentration. Nested active-window
depth is bounded by `ASSUMPTIONS.md` A45; Readied Spell Response release remains
deferred to QCORE10.

### Task 93 - QCORE9 - Unit Feature Procedure Profiles

Status: `done`

Depends on: QCORE8
Blocks: QCORE10

Pre-research: [QCORE3_QCORE11_PRE_RESEARCH.md](/workspace/typescript/dnd/plans/QCORE3_QCORE11_PRE_RESEARCH.md)

Completed scope: feature procedure facts for Action Surge, Second Wind, Cunning
Action, Champion Improved Critical range 19, Rage, Reckless Attack, Sneak
Attack, Evasion-style save damage replacement, Cutting Words, and Uncanny
Dodge. QNT models facts, not Unit ids or authored Surface records.

### Task 94 - QCORE10 - Spell Procedure Profiles

Status: `done`

Depends on: QCORE9
Blocks: QCORE11

Pre-research: [QCORE3_QCORE11_PRE_RESEARCH.md](/workspace/typescript/dnd/plans/QCORE3_QCORE11_PRE_RESEARCH.md)

Completed scope: Spell Invocation procedure facts and Spell Effects for Magic
Missile, Ray of Frost, Acid Splash, Healing Word, Mage Armor, Spell Slot spend,
Cantrip non-spend, and Readied Spell Response integration with QCORE8.

### Task 95 - QCORE11 - Stat-Block Controls

Status: `done`

Depends on: QCORE10
Blocks: QMBT1

Pre-research: [QCORE3_QCORE11_PRE_RESEARCH.md](/workspace/typescript/dnd/plans/QCORE3_QCORE11_PRE_RESEARCH.md)

Completed scope: Stat Block attack options, Multiattack named dispatch
procedure, Stat Block Bonus Action options, Reaction and Legendary Action
windows, X/Day, Recharge, Recharge after rest, and start-turn recharge roll
after Stat Block projection. The proof cites local SRD Stat Block text plus
`ASSUMPTIONS.md` A18/A21-A24/A44 for Multiattack mapping, Recharge timing, and
Legendary Action resource/cooldown boundaries.

### Task 96 - QMBT1 - Standard Rule-Core MBT Bridge Contract

Status: `done`

Depends on: QCORE7-QCORE11
Blocks: QMBT2-QMBT6

Pre-research: [QMBT1_QMBT5_PRE_RESEARCH.md](/workspace/typescript/dnd/plans/QMBT1_QMBT5_PRE_RESEARCH.md)

Scope: define and implement the reusable focused-QMBT bridge contract for
rule-core parity: file placement, projection shape, fixture bounds, action
naming, production reducer/procedure entrypoints, timing commands, and the
first small runnable pattern. The contract must avoid full battle state-space
widening and must not duplicate reducer logic in test code.

Verification: RAW/ubiquitous check for any modeled procedure touched; package
typecheck/proof commands relevant to the chosen first bridge; focused MBT with
the mandatory timing wrapper; no exploratory promoted battle MBT; minimum two
`/simplify` rounds after implementation.

### Task 97 - QMBT2 - Movement and Grapple Runtime Parity

Status: `done`

Depends on: QMBT1, QCORE7
Blocks: none

Pre-research: [QMBT1_QMBT5_PRE_RESEARCH.md](/workspace/typescript/dnd/plans/QMBT1_QMBT5_PRE_RESEARCH.md)

Completed scope: focused promoted runtime MBT parity for QCORE7 movement and
grapple: Move, Dash, Disengage, Stand from Prone, Grapple, Escape Grapple,
Release Grapple, and Opportunity Attack decline/resume. The focused lane
projects movement budget, dash bonus, prone, disengaged, grapple link, escape
DC, action availability, holes, pending OA, result, and invalid reason.

### Task 98 - QMBT3 - Reaction and Continuation Runtime Parity

Status: `ready-for-implementation-after-light-research`

Depends on: QMBT1, QCORE8
Blocks: none

Pre-research: [QMBT1_QMBT5_PRE_RESEARCH.md](/workspace/typescript/dnd/plans/QMBT1_QMBT5_PRE_RESEARCH.md)

Scope: add focused promoted runtime MBT parity for QCORE8 reaction protocol:
reaction offer, decline, matching reaction spend, continuation resume, Readied
Movement release, and Concentration saving throw break/hold. Keep full Readied
Spell release and full Opportunity Attack damage resolution out unless only
projecting held/dissipated state.

Verification: RAW/ubiquitous check for Reactions, Ready, Concentration, and
Opportunity Attack passages; focused QMBT3 run only after implementation;
existing promoted battle-runtime MBT once if runtime behavior changed; minimum
two `/simplify` rounds.

### Task 99 - QMBT4 - Feature Procedure Runtime Parity

Status: `ready-for-implementation-after-light-research`

Depends on: QMBT1, QCORE9
Blocks: none

Pre-research: [QMBT1_QMBT5_PRE_RESEARCH.md](/workspace/typescript/dnd/plans/QMBT1_QMBT5_PRE_RESEARCH.md)

Scope: add focused promoted runtime MBT parity for QCORE9 feature procedure
profiles: Action Surge, Second Wind, Cunning Action, Improved Critical,
Rage/Reckless, Sneak Attack, Evasion, Cutting Words, and Uncanny Dodge. Project
per-feature facts rather than full runtime resource objects.

Verification: RAW/ubiquitous check for the relevant Fighter, Rogue, Barbarian,
and Bard feature passages plus procedure terminology; focused QMBT4 run only
after implementation; existing promoted battle-runtime MBT once if runtime
behavior changed; minimum two `/simplify` rounds.

### Task 100 - QMBT5 - Spell Procedure Runtime Parity

Status: `ready-for-implementation-after-light-research`

Depends on: QMBT1, QCORE10
Blocks: none

Pre-research: [QMBT1_QMBT5_PRE_RESEARCH.md](/workspace/typescript/dnd/plans/QMBT1_QMBT5_PRE_RESEARCH.md)

Scope: add focused promoted runtime MBT parity for QCORE10 spell procedure
profiles: Magic Missile, Ray of Frost, Acid Splash, Healing Word, Mage Armor,
Spell Slot spend, Cantrip non-spend, and Readied Spell Response. Project HP,
action/bonus availability, slot spend, level-1 slots, active effect kind,
readied held/released state, concentration flag, holes, result, and invalid
reason.

Verification: RAW/ubiquitous check for spellcasting, Ready, Concentration, and
each modeled spell passage; focused QMBT5 run only after implementation;
existing promoted battle-runtime MBT once if runtime behavior changed; minimum
two `/simplify` rounds.

### Task 101 - QMBT6 - Stat-Block Control Runtime Parity

Status: `ready-for-implementation-after-light-research`

Depends on: QMBT1, QCORE11
Blocks: none

Pre-research: [QMBT1_QMBT5_PRE_RESEARCH.md](/workspace/typescript/dnd/plans/QMBT1_QMBT5_PRE_RESEARCH.md)

Scope: add focused promoted runtime MBT parity for QCORE11 stat-block control
profiles through typed fixtures, not authored monster parsing. Start with
Multiattack named dispatch: first listed attack spends the Attack action,
remaining named dispatches stay pending, Movement may interleave, non-Movement
turn subjects such as Bonus Action or ordinary Action are rejected while the
dispatch continuation is open, and End Turn closes unspent dispatches. Keep
Legendary Actions as a separate later tracer with its own window/use/refresh
projection.

Verification: RAW/ubiquitous check for Stat Block, Multiattack, Monster
Actions, Bonus Action, Reaction, Legendary Actions, and Limited Usage passages;
focused QMBT6 run only after implementation; existing promoted battle-runtime
MBT once if runtime behavior changed; minimum two `/simplify` rounds.
