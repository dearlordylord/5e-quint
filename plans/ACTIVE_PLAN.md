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
      "status": "done",
      "title": "Reaction and Continuation Runtime Parity"
    },
    {
      "number": 99,
      "id": "QMBT4",
      "status": "done",
      "title": "Feature Procedure Runtime Parity"
    },
    {
      "number": 100,
      "id": "QMBT5",
      "status": "done",
      "title": "Spell Procedure Runtime Parity"
    },
    {
      "number": 101,
      "id": "QMBT6",
      "status": "done",
      "title": "Stat-Block Control Runtime Parity"
    },
    {
      "number": 102,
      "id": "QMBT7",
      "status": "done",
      "title": "Specific Unit Parity MBT and Matrix Integration"
    },
    {
      "number": 103,
      "id": "QMBT8",
      "status": "done",
      "title": "Expand Unit Feature Admission Evidence"
    },
    {
      "number": 104,
      "id": "QMBT9",
      "status": "done",
      "title": "Select Specific Unit Identity MBT Expansion"
    },
    {
      "number": 105,
      "id": "QMBT10",
      "status": "ready-for-research",
      "title": "Tighten Unit Identity Evidence Semantics"
    },
    {
      "number": 106,
      "id": "QMBT11",
      "status": "ready-for-research",
      "title": "Finish Unit Profile Checker Modularization"
    },
    {
      "number": 107,
      "id": "QMBT12",
      "status": "blocked",
      "title": "Reconcile QMBT8-QMBT9 Closeout"
    },
    {
      "number": 108,
      "id": "QMBT13",
      "status": "blocked",
      "title": "Classify Authored Catalog Admission Gaps"
    },
    {
      "number": 109,
      "id": "QMBT14",
      "status": "blocked",
      "title": "Trace Spell Unit Admission Evidence"
    },
    {
      "number": 110,
      "id": "QMBT15",
      "status": "blocked",
      "title": "Expand Spell Unit Admission Evidence"
    },
    {
      "number": 111,
      "id": "QMBT16",
      "status": "blocked",
      "title": "Decide Selected Spell Identity MBT"
    },
    {
      "number": 112,
      "id": "QMBT17",
      "status": "blocked",
      "title": "Define Classic Non-SRD Mechanics Intake Policy"
    },
    {
      "number": 113,
      "id": "QMBT18",
      "status": "blocked",
      "title": "Drive Unsupported Feature Profile Red-Green Slice"
    },
    {
      "number": 114,
      "id": "QMBT19",
      "status": "blocked",
      "title": "Review Unit Profile Matrix Metrics Semantics"
    },
    {
      "number": 115,
      "id": "QMBT20",
      "status": "blocked",
      "title": "Recursive Unit Profile Planning Review"
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
| 98    | QMBT3 - Reaction and Continuation Runtime Parity | done | QMBT1, QCORE8 | none | [QMBT1-QMBT6 pre-research](/workspace/typescript/dnd/plans/QMBT1_QMBT5_PRE_RESEARCH.md) | Completed focused runtime MBT parity for QCORE8 reaction offer/decline/spend, continuation resume, Readied Movement release, and Concentration break/hold. |
| 99    | QMBT4 - Feature Procedure Runtime Parity | done | QMBT1, QCORE9 | none | [QMBT1-QMBT6 pre-research](/workspace/typescript/dnd/plans/QMBT1_QMBT5_PRE_RESEARCH.md) | Completed focused runtime MBT parity for QCORE9 feature procedure profiles through production feature reducers and projections. |
| 100   | QMBT5 - Spell Procedure Runtime Parity | done | QMBT1, QCORE10 | none | [QMBT1-QMBT6 pre-research](/workspace/typescript/dnd/plans/QMBT1_QMBT5_PRE_RESEARCH.md) | Completed focused runtime MBT parity for QCORE10 spell procedure profiles through production spell reducers and projections. |
| 101   | QMBT6 - Stat-Block Control Runtime Parity | done | QMBT1, QCORE11 | none | [QMBT1-QMBT6 pre-research](/workspace/typescript/dnd/plans/QMBT1_QMBT5_PRE_RESEARCH.md) | Completed focused runtime MBT parity for QCORE11 Stat Block Multiattack dispatch through production reducers. Legendary Actions remain a separate later tracer. |
| 102   | QMBT7 - Specific Unit Parity MBT and Matrix Integration | done | QMBT4-QMBT6, Unit profile matrix | QMBT8-QMBT9 | [QMBT7 specific Unit parity plan](/workspace/typescript/dnd/plans/QMBT7_SPECIFIC_UNIT_PARITY_MBT_PLAN.md) | Completed methodology contract, deterministic admission/projection tracer for three Unit feature identities, selected identity MBT citation for `fighter_second_wind`, and expansion boundaries. |
| 103   | QMBT8 - Expand Unit Feature Admission Evidence | done | QMBT7 | QMBT9 | [QMBT7 specific Unit parity plan](/workspace/typescript/dnd/plans/QMBT7_SPECIFIC_UNIT_PARITY_MBT_PLAN.md) | Completed unit-profile checker/report modularization and deterministic admission/projection evidence expansion for remaining supported Unit feature identities. |
| 104   | QMBT9 - Select Specific Unit Identity MBT Expansion | done | QMBT7-QMBT8 | none | [QMBT7 specific Unit parity plan](/workspace/typescript/dnd/plans/QMBT7_SPECIFIC_UNIT_PARITY_MBT_PLAN.md) | Completed selected identity MBT evidence for eight additional supported SRD Unit feature identities with production reducer state changes; selected identity MBT coverage is now 9/16. |
| 105   | QMBT10 - Tighten Unit Identity Evidence Semantics | ready-for-research | QMBT7-QMBT9 | QMBT12, QMBT16, QMBT19 | [Unit profile parity PRD](/workspace/typescript/dnd/prd/01_UNIT_PROFILE_PARITY_MBT.md), [QMBT7 plan](/workspace/typescript/dnd/plans/QMBT7_SPECIFIC_UNIT_PARITY_MBT_PLAN.md) | Research and fix whether `selected-identity-mbt` evidence proves executable Unit-specific replay or only owner-file membership; downgrade or strengthen evidence before expanding MBT metrics. |
| 106   | QMBT11 - Finish Unit Profile Checker Modularization | ready-for-research | QMBT8 | QMBT12-QMBT15, QMBT19 | [Unit profile parity PRD](/workspace/typescript/dnd/prd/01_UNIT_PROFILE_PARITY_MBT.md) | Research and finish splitting authored discovery, installed inventory discovery, claim/evidence validation, matrix construction, report rendering, and CLI orchestration so all-Unit growth does not concentrate in one script. |
| 107   | QMBT12 - Reconcile QMBT8-QMBT9 Closeout | blocked | QMBT10-QMBT11 | QMBT13-QMBT20 | [QMBT7 plan](/workspace/typescript/dnd/plans/QMBT7_SPECIFIC_UNIT_PARITY_MBT_PLAN.md) | After QMBT10-QMBT11, review QMBT8-QMBT9 findings, repair closeout notes/statuses/metrics, and decide whether any evidence must be reclassified. |
| 108   | QMBT13 - Classify Authored Catalog Admission Gaps | blocked | QMBT11-QMBT12 | QMBT14-QMBT18 | [Unit profile coverage report](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md) | Turn `not-in-unit-catalog` into actionable categories: intentional backlog, SRD candidate, Classic/private pressure, non-runtime authored data, duplicate/content issue, or other explicit disposition. |
| 109   | QMBT14 - Trace Spell Unit Admission Evidence | blocked | QMBT11-QMBT13 | QMBT15-QMBT16 | [QMBT7 plan](/workspace/typescript/dnd/plans/QMBT7_SPECIFIC_UNIT_PARITY_MBT_PLAN.md) | Add a small deterministic spell Unit admission/projection tracer before broad spell expansion. |
| 110   | QMBT15 - Expand Spell Unit Admission Evidence | blocked | QMBT14 | QMBT16 | [QMBT7 plan](/workspace/typescript/dnd/plans/QMBT7_SPECIFIC_UNIT_PARITY_MBT_PLAN.md) | Expand deterministic spell Unit evidence if QMBT14 proves the methodology and denominators are clear. |
| 111   | QMBT16 - Decide Selected Spell Identity MBT | blocked | QMBT10, QMBT14-QMBT15 | QMBT19-QMBT20 | [Unit profile parity PRD](/workspace/typescript/dnd/prd/01_UNIT_PROFILE_PARITY_MBT.md) | Decide whether any spell identities need selected MBT beyond QMBT5 Procedure Parity, and add only high-risk selected identities. |
| 112   | QMBT17 - Define Classic Non-SRD Mechanics Intake Policy | blocked | QMBT12-QMBT13 | QMBT18-QMBT20 | [Unit profile coverage matrix plan](/workspace/typescript/dnd/plans/UNIT_PROFILE_COVERAGE_MATRIX_PLAN.md) | Make private PHB/XPHB mechanics pressure intake explicit: public renamed mechanics-only records, matrix gaps, evidence expectations, and protected-expression gates. |
| 113   | QMBT18 - Drive Unsupported Feature Profile Red-Green Slice | blocked | QMBT10-QMBT13, QMBT17 | QMBT19-QMBT20 | [Unit profile coverage report](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md) | Pick one unsupported/widening feature profile and drive it matrix/QNT-MBT-first into TypeScript implementation and evidence. |
| 114   | QMBT19 - Review Unit Profile Matrix Metrics Semantics | blocked | QMBT10-QMBT18 | QMBT20 | [Unit profile parity PRD](/workspace/typescript/dnd/prd/01_UNIT_PROFILE_PARITY_MBT.md) | Review denominators, labels, and report sections after the corrective and expansion slices so percentages still mean what they claim. |
| 115   | QMBT20 - Recursive Unit Profile Planning Review | blocked | QMBT10-QMBT19 | QMBT21+ | [ACTIVE_PLAN](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md) | Review QMBT10-QMBT19 findings, update PRD/plan docs, and append QMBT21+ tasks plus a new recursive planning-review task unless the matrix lane is explicitly declared complete. |

## Task Details

### Task 91 - QCORE7 - Movement, Spatial Facts, and Grapple

Status: `done`

Depends on: QCORE6
Blocks: QCORE8

Pre-research: [QCORE3_QCORE11_PRE_RESEARCH.md](/workspace/typescript/dnd/plans/QCORE3_QCORE11_PRE_RESEARCH.md)

Matrix: `RAW-QCORE7-MOVEMENT-GRAPPLE-001` (`qnt-proof`).

Scope: turn Movement budget, caller-supplied Movement cost, full Stand from
Prone, table/caller spatial facts, Opportunity Attack trigger facts, and bounded
Grapple/Escape/Release state.

### Task 92 - QCORE8 - Reactions, Continuations, and Concentration

Status: `done`

Depends on: QCORE7
Blocks: QCORE9

Pre-research: [QCORE3_QCORE11_PRE_RESEARCH.md](/workspace/typescript/dnd/plans/QCORE3_QCORE11_PRE_RESEARCH.md)

Matrix: `RAW-PTG-REACTIONS-002`, `RAW-PTG-REACTIONS-004`,
`RAW-PTG-REACTIONS-005`, `RAW-PTG-REACTIONS-006` (`qnt-proof`).

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

Matrix: `RAW-QCORE9-UNIT-FEATURE-PROFILES-001` (`qnt-proof`).

Completed scope: feature procedure facts for Action Surge, Second Wind, Cunning
Action, Champion Improved Critical range 19, Rage, Reckless Attack, Sneak
Attack, Evasion-style save damage replacement, Cutting Words, and Uncanny
Dodge. QNT models facts, not Unit ids or authored Surface records.

### Task 94 - QCORE10 - Spell Procedure Profiles

Status: `done`

Depends on: QCORE9
Blocks: QCORE11

Pre-research: [QCORE3_QCORE11_PRE_RESEARCH.md](/workspace/typescript/dnd/plans/QCORE3_QCORE11_PRE_RESEARCH.md)

Matrix: `RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001` (`qnt-proof`).

Completed scope: Spell Invocation procedure facts and Spell Effects for Magic
Missile, Ray of Frost, Acid Splash, Healing Word, Mage Armor, Spell Slot spend,
Cantrip non-spend, and Readied Spell Response integration with QCORE8.

### Task 95 - QCORE11 - Stat-Block Controls

Status: `done`

Depends on: QCORE10
Blocks: QMBT1

Pre-research: [QCORE3_QCORE11_PRE_RESEARCH.md](/workspace/typescript/dnd/plans/QCORE3_QCORE11_PRE_RESEARCH.md)

Matrix: `RAW-QCORE11-STAT-BLOCK-CONTROLS-001` (`qnt-proof`).

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

Matrix: `RAW-QCORE7-MOVEMENT-GRAPPLE-001`, `RAW-PTG-REACTIONS-002`,
`RAW-PTG-REACTIONS-004`, `RAW-PTG-REACTIONS-005`,
`RAW-PTG-REACTIONS-006`, and
`RAW-QCORE9-UNIT-FEATURE-PROFILES-001` (`runtime-parity` bridge
contract baseline).

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

Matrix: `RAW-QCORE7-MOVEMENT-GRAPPLE-001` (`runtime-parity`).

Completed scope: focused promoted runtime MBT parity for QCORE7 movement and
grapple: Move, Dash, Disengage, Stand from Prone, Grapple, Escape Grapple,
Release Grapple, and Opportunity Attack decline/resume. The focused lane
projects movement budget, dash bonus, prone, disengaged, grapple link, escape
DC, action availability, holes, pending OA, result, and invalid reason.

### Task 98 - QMBT3 - Reaction and Continuation Runtime Parity

Status: `done`

Depends on: QMBT1, QCORE8
Blocks: none

Pre-research: [QMBT1_QMBT5_PRE_RESEARCH.md](/workspace/typescript/dnd/plans/QMBT1_QMBT5_PRE_RESEARCH.md)

Matrix: `RAW-PTG-REACTIONS-002`, `RAW-PTG-REACTIONS-004`,
`RAW-PTG-REACTIONS-005`, `RAW-PTG-REACTIONS-006` (`runtime-parity`).

Completed scope: focused promoted runtime MBT parity for QCORE8 reaction
protocol: reaction offer, decline, matching reaction spend, continuation
resume, Readied Movement release, and Concentration saving throw break/hold.
Full Readied Spell release and full Opportunity Attack damage resolution remain
out of this lane.

Verification: RAW/ubiquitous check for Reactions, Ready, Concentration, and
Opportunity Attack passages; focused QMBT3 timed run; existing promoted
battle-runtime MBT after the Readied Movement runtime behavior correction;
`pnpm quality`; two `/simplify` rounds.

### Task 99 - QMBT4 - Feature Procedure Runtime Parity

Status: `done`

Depends on: QMBT1, QCORE9
Blocks: none

Pre-research: [QMBT1_QMBT5_PRE_RESEARCH.md](/workspace/typescript/dnd/plans/QMBT1_QMBT5_PRE_RESEARCH.md)

Matrix: `RAW-QCORE9-UNIT-FEATURE-PROFILES-001` (`runtime-parity`).

Completed scope: focused promoted runtime MBT parity for QCORE9 feature
procedure profiles: Action Surge, Second Wind, Cunning Action, Improved
Critical, Rage/Reckless, Sneak Attack, Evasion, Cutting Words, and Uncanny
Dodge. The lane projects per-feature facts rather than full runtime resource
objects.

Verification: RAW/ubiquitous check for the relevant Fighter, Rogue, Barbarian,
and Bard feature passages plus procedure terminology; focused QMBT4 timed run;
package typecheck; `pnpm quality`; two `/simplify` review rounds. Existing
promoted battle-runtime MBT was not rerun because this task added parity
coverage and docs/script wiring without production runtime behavior changes.

### Task 100 - QMBT5 - Spell Procedure Runtime Parity

Status: `done`

Depends on: QMBT1, QCORE10
Blocks: none

Pre-research: [QMBT1_QMBT5_PRE_RESEARCH.md](/workspace/typescript/dnd/plans/QMBT1_QMBT5_PRE_RESEARCH.md)

Matrix: `RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001` (`runtime-parity`).

Completed scope: focused promoted runtime MBT parity for QCORE10 spell
procedure profiles through production spell reducers and projections. The lane
uses the package-local `rule-core-spells.mbt.qnt` spec and
`rule-core-spells.mbt.test.ts` driver to project spell HP/resource/effect
facts without broad authored spell-catalog discovery.

Verification: RAW/ubiquitous check for spellcasting, Ready, Concentration, and
each modeled spell passage; focused QMBT5 timed run; package typecheck;
`pnpm quality`; two `/simplify` review rounds.

### Task 101 - QMBT6 - Stat-Block Control Runtime Parity

Status: `done`

Depends on: QMBT1, QCORE11
Blocks: none

Pre-research: [QMBT1_QMBT5_PRE_RESEARCH.md](/workspace/typescript/dnd/plans/QMBT1_QMBT5_PRE_RESEARCH.md)

Matrix: `RAW-QCORE11-STAT-BLOCK-CONTROLS-001` (`runtime-parity`).

Completed scope: focused promoted runtime MBT parity for QCORE11 Stat Block
Multiattack named dispatch through typed fixtures, not authored monster parsing.
Taking Multiattack spends the Attack action and consumes the first listed
attack dispatch; remaining named dispatches stay pending, Movement may
interleave, non-Movement turn subjects such as Bonus Action or ordinary Action
are rejected while the dispatch continuation is open, and End Turn closes
unspent dispatches. Legendary Actions remain a separate later tracer with their
own window/use/refresh projection.

Verification: RAW/ubiquitous check for Stat Block, Multiattack, Monster
Actions, Bonus Action, Reaction, Legendary Actions, and Limited Usage passages;
focused QMBT6 timed run; existing promoted battle-runtime MBT after the
Multiattack runtime behavior correction; package typecheck; package unit tests;
`pnpm quality`; two `/simplify` rounds.

### Task 102 - QMBT7 - Specific Unit Parity MBT and Matrix Integration

Status: `done`

Depends on: QMBT4-QMBT6, Unit profile matrix

Blocks: QMBT8-QMBT9

Research / plan: [QMBT7_SPECIFIC_UNIT_PARITY_MBT_PLAN.md](/workspace/typescript/dnd/plans/QMBT7_SPECIFIC_UNIT_PARITY_MBT_PLAN.md)

Completed scope: defined the Specific Unit Parity evidence states, added
deterministic catalog/projection/admission coverage for
`fighter_second_wind`, `barbarian_reckless_attack`, and `rogue_evasion`, cited
selected identity MBT evidence for `fighter_second_wind`, and recorded QMBT8+
expansion boundaries.

Out of scope: enumerating all Units in QNT; one MBT trace per shipped Unit;
duplicating Surface Unit data into QNT; broad catalog discovery inside focused
MBT drivers.

Verification: existing QCORE9/QMBT4 RAW anchors; `pnpm
unit-profile-coverage:check`; focused deterministic projection/admission test;
`pnpm --filter @dnd/battle-runtime typecheck`; focused QMBT4 feature MBT with
the timed protocol; no broad battle MBT; two `/simplify` rounds.

### Task 103 - QMBT8 - Expand Unit Feature Admission Evidence

Status: `done`

Depends on: QMBT7

Blocks: QMBT9

Research / plan: [QMBT7_SPECIFIC_UNIT_PARITY_MBT_PLAN.md](/workspace/typescript/dnd/plans/QMBT7_SPECIFIC_UNIT_PARITY_MBT_PLAN.md)

Scope: first modularize the unit-profile checker/report pipeline enough that
authored catalog discovery, claim validation, evidence validation, metrics, and
report rendering can grow without becoming one temporal catch-all file. Then
expand `unit-evidence.jsonl` deterministic admission/projection evidence for
remaining supported Unit feature identities, using focused tests that load
authored Units through the production Unit catalog and production feature
projection/support boundaries. Keep profile ids single-source through
`unit-claims.jsonl`.

Out of scope: selected identity MBT expansion; QNT catalog enumeration; spell
identity expansion.

Verification: `pnpm unit-profile-coverage:check`; focused deterministic
admission/projection tests; package typecheck; two `/simplify` rounds. Do not
run battle MBT for deterministic evidence-only expansion.

### Task 104 - QMBT9 - Select Specific Unit Identity MBT Expansion

Status: `done`

Depends on: QMBT7-QMBT8

Blocks: none

Research / plan: [QMBT7_SPECIFIC_UNIT_PARITY_MBT_PLAN.md](/workspace/typescript/dnd/plans/QMBT7_SPECIFIC_UNIT_PARITY_MBT_PLAN.md)

Completed scope: selected identity MBT evidence for
`fighter_action_surge`, `fighter_improved_critical`, `barbarian_rage`,
`barbarian_reckless_attack`, `rogue_cunning_action`, `rogue_evasion`,
`rogue_uncanny_dodge`, and `rogue_sneak_attack`, recorded separately from
deterministic evidence. Selected identity MBT coverage is now 9/16.

Out of scope: one MBT trace per shipped Unit; broad battle MBT; QNT Unit
catalog loops.

Verification: local SRD and `UBIQUITOUS_LANGUAGE.md` checks for the already
modeled Fighter, Barbarian, and Rogue feature anchors; focused feature MBT with
the standard timed protocol; `pnpm unit-profile-coverage:check`; package
typecheck; `pnpm quality`; two `/simplify` rounds.

### Task 105 - QMBT10 - Tighten Unit Identity Evidence Semantics

Status: `ready-for-research`

Depends on: QMBT7-QMBT9

Blocks: QMBT12, QMBT16, QMBT19

Research / plan: [01_UNIT_PROFILE_PARITY_MBT.md](/workspace/typescript/dnd/prd/01_UNIT_PROFILE_PARITY_MBT.md), [QMBT7_SPECIFIC_UNIT_PARITY_MBT_PLAN.md](/workspace/typescript/dnd/plans/QMBT7_SPECIFIC_UNIT_PARITY_MBT_PLAN.md)

Scope: research and fix the semantics of `selected-identity-mbt`. The current
checker proves that `unit-evidence.jsonl` and an owner-local
`UNIT-IDENTITY-EVIDENCE` marker agree, but it does not prove that the MBT action
set actually exercised each claimed Unit id as an identity-bearing replay. The
task must decide whether to strengthen evidence markers, add action/fixture
markers, split evidence tags, or downgrade overbroad QMBT9 claims.

Out of scope: adding new selected identity MBT cases; broad battle MBT; changing
Procedure Parity profile evidence.

Verification: `pnpm unit-profile-coverage:check`; focused evidence checker
tests or negative fixtures if introduced; no MBT unless the task changes MBT
driver behavior or evidence must be validated by an actual focused run.

### Task 106 - QMBT11 - Finish Unit Profile Checker Modularization

Status: `ready-for-research`

Depends on: QMBT8

Blocks: QMBT12-QMBT15, QMBT19

Research / plan: [01_UNIT_PROFILE_PARITY_MBT.md](/workspace/typescript/dnd/prd/01_UNIT_PROFILE_PARITY_MBT.md)

Scope: research and finish the checker modularization started by QMBT8. Report
rendering is now separate, but `scripts/unit-profile-coverage-check.cjs` still
owns authored discovery, installed inventory discovery, claim validation,
evidence validation, owner-marker scanning, and CLI orchestration. Split or
otherwise isolate these responsibilities enough that adding all Units does not
concentrate every matrix concern in one temporal catch-all script.

Out of scope: changing matrix semantics; adding new Unit evidence; selected MBT
expansion.

Verification: `pnpm unit-profile-coverage:check`; generated matrix/report stay
stable unless intentionally changed; focused script-level regression checks if
new module boundaries make them practical.

### Task 107 - QMBT12 - Reconcile QMBT8-QMBT9 Closeout

Status: `blocked`

Depends on: QMBT10-QMBT11

Blocks: QMBT13-QMBT20

Research / plan: [QMBT7_SPECIFIC_UNIT_PARITY_MBT_PLAN.md](/workspace/typescript/dnd/plans/QMBT7_SPECIFIC_UNIT_PARITY_MBT_PLAN.md)

Scope: after QMBT10-QMBT11, review whether QMBT8 and QMBT9 remain correctly
closed. Update closeout notes, task statuses, report labels, evidence rows, and
metrics if the corrected evidence semantics or modularization findings require
reclassification.

Out of scope: new profile implementation and broad evidence expansion.

Verification: `pnpm unit-profile-coverage:check`; active-plan consistency
check across Ralph index, DAG row, and task detail.

### Task 108 - QMBT13 - Classify Authored Catalog Admission Gaps

Status: `blocked`

Depends on: QMBT11-QMBT12

Blocks: QMBT14-QMBT18

Research / plan: [UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md)

Scope: turn `catalogAdmission.status = "not-in-unit-catalog"` from a raw gap
list into actionable categories. Candidate dispositions include intentional
backlog, SRD candidate, Classic/private pressure, non-runtime authored data,
duplicate/content issue, and explicit unsupported/widening pressure.

Out of scope: implementing every missing Unit; admitting all authored content
to the catalog.

Verification: `pnpm unit-profile-coverage:check`; generated report separates
raw not-in-catalog inventory from triaged planning pressure.

### Task 109 - QMBT14 - Trace Spell Unit Admission Evidence

Status: `blocked`

Depends on: QMBT11-QMBT13

Blocks: QMBT15-QMBT16

Research / plan: [QMBT7_SPECIFIC_UNIT_PARITY_MBT_PLAN.md](/workspace/typescript/dnd/plans/QMBT7_SPECIFIC_UNIT_PARITY_MBT_PLAN.md)

Scope: add a small deterministic spell Unit admission/projection tracer before
broad spell expansion. The tracer should use real installed spell Unit ids,
exercise production catalog/support/projection boundaries, and clarify how
spell evidence differs from feature Unit evidence.

Out of scope: all spell Units; selected spell identity MBT; broad battle MBT.

Verification: `pnpm unit-profile-coverage:check`; focused deterministic spell
admission/projection tests; package typecheck.

### Task 110 - QMBT15 - Expand Spell Unit Admission Evidence

Status: `blocked`

Depends on: QMBT14

Blocks: QMBT16

Research / plan: [QMBT7_SPECIFIC_UNIT_PARITY_MBT_PLAN.md](/workspace/typescript/dnd/plans/QMBT7_SPECIFIC_UNIT_PARITY_MBT_PLAN.md)

Scope: expand deterministic spell Unit admission/projection evidence if QMBT14
proves the methodology and denominators are clear. Keep evidence deterministic
and catalog/projection focused.

Out of scope: selected identity MBT; QNT catalog enumeration; unsupported spell
profile implementation.

Verification: `pnpm unit-profile-coverage:check`; focused deterministic tests;
package typecheck.

### Task 111 - QMBT16 - Decide Selected Spell Identity MBT

Status: `blocked`

Depends on: QMBT10, QMBT14-QMBT15

Blocks: QMBT19-QMBT20

Research / plan: [01_UNIT_PROFILE_PARITY_MBT.md](/workspace/typescript/dnd/prd/01_UNIT_PROFILE_PARITY_MBT.md)

Scope: decide whether any spell Unit identities need selected identity MBT
beyond QMBT5 Procedure Parity. Use the corrected QMBT10 evidence semantics and
the spell admission evidence from QMBT14-QMBT15. Add only high-risk selected
identity MBT cases, or explicitly record why none are justified yet.

Out of scope: one MBT trace per spell; broad authored spell catalog discovery
inside QNT.

Verification: `pnpm unit-profile-coverage:check`; focused MBT only for chosen
identities, one run at a time with the standard timed protocol.

### Task 112 - QMBT17 - Define Classic Non-SRD Mechanics Intake Policy

Status: `blocked`

Depends on: QMBT12-QMBT13

Blocks: QMBT18-QMBT20

Research / plan: [UNIT_PROFILE_COVERAGE_MATRIX_PLAN.md](/workspace/typescript/dnd/plans/UNIT_PROFILE_COVERAGE_MATRIX_PLAN.md)

Scope: make private PHB/XPHB mechanics pressure intake explicit. Define how
pressure becomes public renamed mechanics-only Units, synthetic labels, matrix
gaps, unsupported/widening dispositions, and evidence requirements without
leaking private-source identity into shipped ids, labels, prose, or provenance.

Out of scope: importing private content into this repo; adding protected
expression; broad runtime support for every private-source mechanic.

Verification: `pnpm unit-profile-coverage:check`; expression/provenance gates
remain executable.

### Task 113 - QMBT18 - Drive Unsupported Feature Profile Red-Green Slice

Status: `blocked`

Depends on: QMBT10-QMBT13, QMBT17

Blocks: QMBT19-QMBT20

Research / plan: [UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md)

Scope: pick one unsupported or widening feature profile from the matrix and
drive it through the red/green flow: matrix gap or authored-source pressure,
QNT Procedure Parity profile, focused Procedure Parity MBT expectation,
TypeScript implementation, deterministic evidence, and selected identity MBT
only if identity risk justifies it.

Out of scope: solving every unsupported feature profile.

Verification: RAW/source check for the selected feature; QNT/proof or focused
QMBT as needed; `pnpm unit-profile-coverage:check`; runtime tests; MBT only
after behavior is complete.

### Task 114 - QMBT19 - Review Unit Profile Matrix Metrics Semantics

Status: `blocked`

Depends on: QMBT10-QMBT18

Blocks: QMBT20

Research / plan: [01_UNIT_PROFILE_PARITY_MBT.md](/workspace/typescript/dnd/prd/01_UNIT_PROFILE_PARITY_MBT.md)

Scope: review all matrix denominators, labels, report sections, and evidence
categories after the corrective and expansion slices. Confirm that each
percentage still answers a concrete planning question and does not overclaim
coverage.

Out of scope: new runtime behavior.

Verification: `pnpm unit-profile-coverage:check`; report review against PRD
goals and active-plan task semantics.

### Task 115 - QMBT20 - Recursive Unit Profile Planning Review

Status: `blocked`

Depends on: QMBT10-QMBT19

Blocks: QMBT21+

Research / plan: [ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md)

Scope: review QMBT10-QMBT19 findings, update the PRD and plan docs, and append
the next batch of QMBT21+ tasks. This task must include a new recursive
planning-review task at the end of the appended batch unless the Unit profile
matrix lane is explicitly declared complete.

Out of scope: implementation work not captured by the new task batch.

Verification: active-plan consistency check across Ralph index, DAG table, and
task details; `pnpm unit-profile-coverage:check` if matrix docs or generated
artifacts change.
