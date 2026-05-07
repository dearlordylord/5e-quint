# Active Plan

Date: 2026-05-07

This is the single active planning queue.
Completed PBA15A0A-PBA29 work was removed from this queue after closeout; older
closeout history remains in git history.
Completed QCORE0-QCORE6 work was removed from this active queue after closeout;
their research and proof artifacts remain linked from the rule-core docs and
task-specific research files.

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
      "status": "done",
      "title": "Tighten Unit Identity Evidence Semantics"
    },
    {
      "number": 106,
      "id": "QMBT11",
      "status": "done",
      "title": "Finish Unit Profile Checker Modularization"
    },
    {
      "number": 107,
      "id": "QMBT12",
      "status": "done",
      "title": "Reconcile QMBT8-QMBT9 Closeout"
    },
    {
      "number": 108,
      "id": "QMBT13",
      "status": "done",
      "title": "Classify Authored Catalog Admission Gaps"
    },
    {
      "number": 109,
      "id": "QMBT14",
      "status": "done",
      "title": "Trace Spell Unit Admission Evidence"
    },
    {
      "number": 110,
      "id": "QMBT15",
      "status": "done",
      "title": "Expand Spell Unit Admission Evidence"
    },
    {
      "number": 111,
      "id": "QMBT16",
      "status": "done",
      "title": "Decide Selected Spell Identity MBT"
    },
    {
      "number": 112,
      "id": "QMBT17",
      "status": "done",
      "title": "Define Classic Non-SRD Mechanics Intake Policy"
    },
    {
      "number": 113,
      "id": "QMBT18",
      "status": "done",
      "title": "Drive Unsupported Feature Profile Red-Green Slice"
    },
    {
      "number": 114,
      "id": "QMBT19",
      "status": "done",
      "title": "Review Unit Profile Matrix Metrics Semantics"
    },
    {
      "number": 115,
      "id": "QMBT20",
      "status": "done",
      "title": "Recursive Unit Profile Planning Review"
    },
    {
      "number": 116,
      "id": "QMBT21",
      "status": "done",
      "title": "Close Classic Mechanics Deterministic Admission Gap"
    },
    {
      "number": 117,
      "id": "QMBT22",
      "status": "done",
      "title": "Promote Shield Triggered Reaction Spell Boundary"
    },
    {
      "number": 118,
      "id": "QMBT23",
      "status": "done",
      "title": "Decide Fire Bolt Object-Targeting Spell Boundary"
    },
    {
      "number": 119,
      "id": "QMBT24",
      "status": "done",
      "title": "Select Next SRD Feature Widening Slice"
    },
    {
      "number": 120,
      "id": "QMBT25",
      "status": "done",
      "title": "Re-triage Spell Catalog Admission After Boundary Slices"
    },
    {
      "number": 121,
      "id": "QMBT26",
      "status": "done",
      "title": "Recursive Unit Profile Planning Review"
    },
    {
      "number": 122,
      "id": "QMBT27",
      "status": "done",
      "title": "Promote Archery Passive Ranged Attack-Roll Bonus"
    },
    {
      "number": 123,
      "id": "QMBT28",
      "status": "done",
      "title": "Re-triage Spell Admission Candidates After Shield and Healing Word"
    },
    {
      "number": 124,
      "id": "QMBT29",
      "status": "done",
      "title": "Select Next SRD Feature Widening Slice After Archery"
    },
    {
      "number": 125,
      "id": "QMBT30",
      "status": "done",
      "title": "Recursive Unit Profile Planning Review"
    },
    {
      "number": 126,
      "id": "QMBT31",
      "status": "done",
      "title": "Promote Savage Attacker Weapon Damage Dice Choice"
    },
    {
      "number": 127,
      "id": "QMBT32",
      "status": "done",
      "title": "Promote Direct Hit Point Restoration Spell Batch"
    },
    {
      "number": 128,
      "id": "QMBT33",
      "status": "done",
      "title": "Recursive Unit Profile Planning Review"
    },
    {
      "number": 129,
      "id": "QMBT34",
      "status": "done",
      "title": "Promote Mass Cure Wounds Area Hit Point Restoration"
    },
    {
      "number": 130,
      "id": "QMBT35",
      "status": "done",
      "title": "Select Next SRD Feature Widening Slice After Savage Attacker"
    },
    {
      "number": 131,
      "id": "QMBT36",
      "status": "done",
      "title": "Recursive Unit Profile Planning Review"
    },
    {
      "number": 132,
      "id": "QMBT37",
      "status": "done",
      "title": "Promote Level 5 Extra Attack Sequencing"
    },
    {
      "number": 133,
      "id": "QMBT38",
      "status": "done",
      "title": "Select Next SRD Feature Widening Slice After Extra Attack"
    },
    {
      "number": 134,
      "id": "QMBT39",
      "status": "done",
      "title": "Recursive Unit Profile Planning Review"
    },
    {
      "number": 135,
      "id": "QMBT40",
      "status": "done",
      "title": "Promote Fast Movement Passive Speed Bonus"
    },
    {
      "number": 136,
      "id": "QMBT41",
      "status": "done",
      "title": "Select Next SRD Feature Widening Slice After Fast Movement"
    },
    {
      "number": 137,
      "id": "QMBT42",
      "status": "done",
      "title": "Split Runtime Tests by RAW and Ubiquitous Boundaries"
    },
    {
      "number": 138,
      "id": "QMBT43",
      "status": "done",
      "title": "Recursive Unit Profile Planning Review"
    },
    {
      "number": 139,
      "id": "QMBT44",
      "status": "done",
      "title": "Promote Roving Passive Speed Kind Grants"
    },
    {
      "number": 140,
      "id": "QMBT45",
      "status": "done",
      "title": "Select Next SRD Feature Widening Slice After Roving"
    },
    {
      "number": 141,
      "id": "QMBT46",
      "status": "done",
      "title": "Recursive Unit Profile Planning Review"
    },
    {
      "number": 142,
      "id": "QMBT47",
      "status": "ready-for-implementation-after-light-research",
      "title": "Promote Relentless Endurance Zero-Hit-Point Replacement"
    },
    {
      "number": 143,
      "id": "QMBT48",
      "status": "ready-for-research",
      "title": "Select Next SRD Feature Widening Slice After Relentless Endurance"
    },
    {
      "number": 144,
      "id": "QMBT49",
      "status": "ready-for-research",
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
| 103   | QMBT8 - Expand Unit Feature Admission Evidence | done | QMBT7 | QMBT9 | [QMBT7 specific Unit parity plan](/workspace/typescript/dnd/plans/QMBT7_SPECIFIC_UNIT_PARITY_MBT_PLAN.md) | Completed deterministic admission/projection evidence expansion for remaining supported Unit feature identities; QMBT12 confirmed the rows remain valid after QMBT10 evidence semantics and QMBT11 modularization. |
| 104   | QMBT9 - Select Specific Unit Identity MBT Expansion | done | QMBT7-QMBT8 | none | [QMBT7 specific Unit parity plan](/workspace/typescript/dnd/plans/QMBT7_SPECIFIC_UNIT_PARITY_MBT_PLAN.md) | Completed selected identity MBT evidence for eight additional supported SRD Unit feature identities; QMBT12 confirmed all selected rows now satisfy replay-marker semantics, and coverage remains 9/16. |
| 105   | QMBT10 - Tighten Unit Identity Evidence Semantics | done | QMBT7-QMBT9 | QMBT12, QMBT16, QMBT19 | [Unit profile parity PRD](/workspace/typescript/dnd/prd/01_UNIT_PROFILE_PARITY_MBT.md), [QMBT7 plan](/workspace/typescript/dnd/plans/QMBT7_SPECIFIC_UNIT_PARITY_MBT_PLAN.md) | Research and fix whether `selected-identity-mbt` evidence proves executable Unit-specific replay or only owner-file membership; downgrade or strengthen evidence before expanding MBT metrics. |
| 106   | QMBT11 - Finish Unit Profile Checker Modularization | done | QMBT8 | QMBT12-QMBT15, QMBT19 | [Unit profile parity PRD](/workspace/typescript/dnd/prd/01_UNIT_PROFILE_PARITY_MBT.md) | Completed checker split into CLI orchestration, shared config, IO, installed/authored Unit discovery, owner-marker scanning, claim/evidence validation, self-test, and report rendering modules without changing matrix semantics or evidence rows. |
| 107   | QMBT12 - Reconcile QMBT8-QMBT9 Closeout | done | QMBT10-QMBT11 | QMBT13-QMBT20 | [QMBT7 plan](/workspace/typescript/dnd/plans/QMBT7_SPECIFIC_UNIT_PARITY_MBT_PLAN.md) | Completed reconciliation: QMBT8-QMBT9 remain closed, no evidence rows were reclassified, deterministic and selected identity coverage remain 9/16, and QMBT13 is unblocked. |
| 108   | QMBT13 - Classify Authored Catalog Admission Gaps | done | QMBT11-QMBT12 | QMBT14-QMBT18 | [Unit profile coverage report](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md) | Completed generated catalog-admission dispositions and report triage for authored not-in-catalog Surface Units. |
| 109   | QMBT14 - Trace Spell Unit Admission Evidence | done | QMBT11-QMBT13 | QMBT15-QMBT16 | [QMBT7 plan](/workspace/typescript/dnd/plans/QMBT7_SPECIFIC_UNIT_PARITY_MBT_PLAN.md) | Completed deterministic spell Unit admission/projection tracer for `acid_splash`, `mage_armor`, `magic_missile`, and `ray_of_frost` through catalog Spell records, creature Spell Access, `startBattle`, and `discoverBattleActs`. |
| 110   | QMBT15 - Expand Spell Unit Admission Evidence | done | QMBT14 | QMBT16 | [QMBT7 plan](/workspace/typescript/dnd/plans/QMBT7_SPECIFIC_UNIT_PARITY_MBT_PLAN.md) | Completed candidate narrowing: `fire_bolt` and `shield` are no longer counted as supported spell Unit profiles until their SRD-required object-burning and triggered-Reaction boundaries are represented at the matrix/runtime boundary. |
| 111   | QMBT16 - Decide Selected Spell Identity MBT | done | QMBT10, QMBT14-QMBT15 | QMBT19-QMBT20 | [Unit profile parity PRD](/workspace/typescript/dnd/prd/01_UNIT_PROFILE_PARITY_MBT.md), [QMBT16 decision](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT16_SELECTED_SPELL_IDENTITY_MBT_DECISION.md) | Completed decision: no currently supported spell Unit identity justifies selected identity MBT beyond QMBT5 procedure parity plus QMBT14 deterministic admission/projection evidence. |
| 112   | QMBT17 - Define Classic Non-SRD Mechanics Intake Policy | done | QMBT12-QMBT13 | QMBT18-QMBT20 | [Classic non-SRD intake policy](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT17_CLASSIC_NON_SRD_MECHANICS_INTAKE_POLICY.md) | Completed private PHB/XPHB mechanics pressure intake policy plus executable checker coverage for private-source identity markers, protected-expression fields, provenance, synthetic naming, and SRD mechanics overlap. |
| 113   | QMBT18 - Drive Unsupported Feature Profile Red-Green Slice | done | QMBT10-QMBT13, QMBT17 | QMBT19-QMBT20 | [Unit profile coverage report](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md), [Classic non-SRD intake policy](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT17_CLASSIC_NON_SRD_MECHANICS_INTAKE_POLICY.md) | Completed Defense as a passive Armor Class bonus profile with QNT procedure profile, focused feature MBT projection, runtime admission/projection, character AC projection reuse, deterministic evidence, and refreshed matrix metrics. |
| 114   | QMBT19 - Review Unit Profile Matrix Metrics Semantics | done | QMBT10-QMBT18 | QMBT20 | [Unit profile parity PRD](/workspace/typescript/dnd/prd/01_UNIT_PROFILE_PARITY_MBT.md) | Completed metric semantics review: generated JSON/report now define each metric's planning question, measure, and denominator; installed inventory is report health rather than coverage; passive production profiles count in executable evidence denominators. |
| 115   | QMBT20 - Recursive Unit Profile Planning Review | done | QMBT10-QMBT19 | QMBT21-QMBT26 | [ACTIVE_PLAN](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md) | Completed QMBT10-QMBT19 review, refreshed PRD status notes, and appended QMBT21-QMBT26 because the matrix lane is not complete. |
| 116   | QMBT21 - Close Classic Mechanics Deterministic Admission Gap | done | QMBT17-QMBT20 | QMBT26 | [Unit profile coverage report](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md), [Classic non-SRD intake policy](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT17_CLASSIC_NON_SRD_MECHANICS_INTAKE_POLICY.md) | Completed deterministic admission/projection evidence for the Classic non-SRD mechanics-only Unit `mycelium_step` through the policy fixture boundary and production alternate-action-cost support projection. |
| 117   | QMBT22 - Promote Shield Triggered Reaction Spell Boundary | done | QMBT10, QMBT15-QMBT20 | QMBT25-QMBT26 | [Unit profile parity PRD](/workspace/typescript/dnd/prd/01_UNIT_PROFILE_PARITY_MBT.md) | Completed triggered Reaction Spell Access for `shield`, including attack-hit and Magic Missile trigger evidence, and returned `shield` to supported spell Unit evidence. |
| 118   | QMBT23 - Decide Fire Bolt Object-Targeting Spell Boundary | done | QMBT15-QMBT20 | QMBT25-QMBT26 | [Unit profile parity PRD](/workspace/typescript/dnd/prd/01_UNIT_PROFILE_PARITY_MBT.md) | Completed decision: `fire_bolt` remains `needs-surface-widening` until promoted spell invocation has an explicit object-target branch and object-ignition effect outcome; QMBT25 should treat it as a spell-boundary blocker, not a supported spell-admission candidate. |
| 119   | QMBT24 - Select Next SRD Feature Widening Slice | done | QMBT18-QMBT20 | QMBT26 | [Archery feature widening slice plan](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT24_ARCHERY_FEATURE_WIDENING_SLICE_PLAN.md) | Completed decision: select `feat_archery` as the next Defense-style SRD feature widening slice, with a red/green plan for `unit-feature.passive-ranged-attack-roll-bonus`. |
| 120   | QMBT25 - Re-triage Spell Catalog Admission After Boundary Slices | done | QMBT22-QMBT23 | QMBT26 | [Unit profile coverage report](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md) | Completed spell admission re-triage by admitting `healing_word` as `spell.bonus-action-healing`, adding deterministic admission/projection evidence, refreshing matrix metrics, and keeping `fire_bolt` out of supported evidence behind the object-targeting boundary. |
| 121   | QMBT26 - Recursive Unit Profile Planning Review | done | QMBT21-QMBT25 | QMBT27-QMBT30 | [ACTIVE_PLAN](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md) | Completed QMBT21-QMBT25 review, refreshed PRD status notes, and appended QMBT27-QMBT30 because the matrix lane is not complete. |
| 122   | QMBT27 - Promote Archery Passive Ranged Attack-Roll Bonus | done | QMBT24-QMBT26 | QMBT29-QMBT30 | [Archery feature widening slice plan](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT24_ARCHERY_FEATURE_WIDENING_SLICE_PLAN.md) | Completed `feat_archery` as `unit-feature.passive-ranged-attack-roll-bonus` across QNT, focused QMBT, runtime projection/support, deterministic admission evidence, and matrix artifacts. |
| 123   | QMBT28 - Re-triage Spell Admission Candidates After Shield and Healing Word | done | QMBT22-QMBT23, QMBT25-QMBT26 | QMBT30 | [QMBT28 spell admission triage](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT28_SPELL_ADMISSION_TRIAGE.md), [Unit profile coverage report](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md), [QMBT23 Fire Bolt decision](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT23_FIRE_BOLT_OBJECT_TARGET_BOUNDARY_DECISION.md) | Completed decision: select direct Hit Point restoration for `cure_wounds` and `mass_healing_word` as the next spell admission batch, with `fire_bolt` still excluded behind the QMBT23 object-target/object-ignition boundary. |
| 124   | QMBT29 - Select Next SRD Feature Widening Slice After Archery | done | QMBT27 | QMBT30 | [Savage Attacker feature widening slice plan](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT29_SAVAGE_ATTACKER_FEATURE_WIDENING_SLICE_PLAN.md), [Unit profile coverage report](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md) | Completed decision: select `feat_savage_attacker` as the next SRD feature widening slice, with a red/green plan for `unit-feature.weapon-damage-dice-roll-choice`. |
| 125   | QMBT30 - Recursive Unit Profile Planning Review | done | QMBT27-QMBT29 | QMBT31-QMBT33 | [ACTIVE_PLAN](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md) | Completed QMBT27-QMBT29 review, refreshed PRD status notes, and appended QMBT31-QMBT33 because the matrix lane is not complete. |
| 126   | QMBT31 - Promote Savage Attacker Weapon Damage Dice Choice | done | QMBT29-QMBT30 | QMBT33 | [Savage Attacker feature widening slice plan](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT29_SAVAGE_ATTACKER_FEATURE_WIDENING_SLICE_PLAN.md), [Unit profile coverage report](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md) | Completed `feat_savage_attacker` as `unit-feature.weapon-damage-dice-roll-choice` across QNT, focused QMBT, runtime projection/support, deterministic admission evidence, and matrix artifacts. |
| 127   | QMBT32 - Promote Direct Hit Point Restoration Spell Batch | done | QMBT28-QMBT30 | QMBT33 | [QMBT28 spell admission triage](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT28_SPELL_ADMISSION_TRIAGE.md), [Unit profile coverage report](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md) | Completed `cure_wounds` and `mass_healing_word` as `spell.hit-point-restoration` across QNT procedure facts, runtime projection/support, focused QMBT, deterministic admission evidence, and matrix artifacts. |
| 128   | QMBT33 - Recursive Unit Profile Planning Review | done | QMBT31-QMBT32 | QMBT34-QMBT36 | [QMBT33 planning review](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT33_RECURSIVE_PLANNING_REVIEW.md), [ACTIVE_PLAN](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md) | Completed QMBT31-QMBT32 review, refreshed PRD status notes, and appended QMBT34-QMBT36 because the matrix lane is not complete. |
| 129   | QMBT34 - Promote Mass Cure Wounds Area Hit Point Restoration | done | QMBT32-QMBT33 | QMBT36 | [QMBT33 planning review](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT33_RECURSIVE_PLANNING_REVIEW.md), [Unit profile coverage report](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md) | Completed `mass_cure_wounds` as `spell.hit-point-restoration` with point-origin Sphere target selection, focused runtime parity, deterministic admission evidence, and refreshed matrix artifacts. |
| 130   | QMBT35 - Select Next SRD Feature Widening Slice After Savage Attacker | done | QMBT31-QMBT33 | QMBT36 | [Extra Attack feature widening slice plan](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT35_EXTRA_ATTACK_FEATURE_WIDENING_SLICE_PLAN.md), [QMBT33 planning review](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT33_RECURSIVE_PLANNING_REVIEW.md), [Unit profile coverage report](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md) | Completed decision: select level-5 Fighter, Paladin, and Ranger Extra Attack as the next SRD feature widening slice, with a red/green plan for `unit-feature.attack-action-attack-count-scaling`. |
| 131   | QMBT36 - Recursive Unit Profile Planning Review | done | QMBT34-QMBT35 | QMBT37-QMBT39 | [QMBT36 planning review](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT36_RECURSIVE_PLANNING_REVIEW.md), [ACTIVE_PLAN](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md), [Extra Attack feature widening slice plan](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT35_EXTRA_ATTACK_FEATURE_WIDENING_SLICE_PLAN.md) | Completed QMBT34-QMBT35 review, refreshed PRD status notes, and appended QMBT37-QMBT39 because the matrix lane is not complete. |
| 132   | QMBT37 - Promote Level 5 Extra Attack Sequencing | done | QMBT35-QMBT36 | QMBT38-QMBT39 | [Extra Attack feature widening slice plan](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT35_EXTRA_ATTACK_FEATURE_WIDENING_SLICE_PLAN.md), [QMBT36 planning review](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT36_RECURSIVE_PLANNING_REVIEW.md), [Unit profile coverage report](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md) | Completed level-5 Fighter, Paladin, and Ranger Extra Attack as `unit-feature.attack-action-attack-count-scaling` with QNT profile, runtime sequencing, deterministic evidence, focused runtime parity, and refreshed matrix artifacts. |
| 133   | QMBT38 - Select Next SRD Feature Widening Slice After Extra Attack | done | QMBT37 | QMBT39 | [Fast Movement feature widening slice plan](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT38_FAST_MOVEMENT_FEATURE_WIDENING_SLICE_PLAN.md), [QMBT36 planning review](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT36_RECURSIVE_PLANNING_REVIEW.md), [Unit profile coverage report](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md) | Completed decision: select `barbarian_fast_movement` as the next SRD feature widening slice, with a red/green plan for `unit-feature.passive-speed-bonus` and a proposed QMBT40 implementation task. |
| 134   | QMBT39 - Recursive Unit Profile Planning Review | done | QMBT37-QMBT38 | QMBT40-QMBT43 | [QMBT39 planning review](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT39_RECURSIVE_PLANNING_REVIEW.md), [Fast Movement feature widening slice plan](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT38_FAST_MOVEMENT_FEATURE_WIDENING_SLICE_PLAN.md), [Unit profile coverage report](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md) | Completed QMBT37-QMBT38 review, refreshed PRD status notes, and appended QMBT40-QMBT43 because the matrix lane is not complete. |
| 135   | QMBT40 - Promote Fast Movement Passive Speed Bonus | done | QMBT38-QMBT39 | QMBT41, QMBT43 | [Fast Movement feature widening slice plan](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT38_FAST_MOVEMENT_FEATURE_WIDENING_SLICE_PLAN.md), [QMBT39 planning review](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT39_RECURSIVE_PLANNING_REVIEW.md), [Unit profile coverage report](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md) | Completed `barbarian_fast_movement` as `unit-feature.passive-speed-bonus` with QNT profile, runtime projection from authored mechanics, deterministic admission evidence, focused runtime parity, and refreshed matrix artifacts. |
| 136   | QMBT41 - Select Next SRD Feature Widening Slice After Fast Movement | done | QMBT40 | QMBT43 | [Roving feature widening slice plan](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT41_ROVING_FEATURE_WIDENING_SLICE_PLAN.md), [QMBT39 planning review](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT39_RECURSIVE_PLANNING_REVIEW.md), [Unit profile coverage report](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md) | Completed decision: select `ranger_roving` as the next SRD feature widening slice, with a red/green plan for `unit-feature.passive-speed-kind-grants` and a proposed QMBT44 implementation task. |
| 137   | QMBT42 - Split Runtime Tests by RAW and Ubiquitous Boundaries | done | QMBT22, QMBT39 | QMBT43 | [ACTIVE_PLAN](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md), [SRD Shield](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md), [SRD Reaction](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [SRD Opportunity Attacks](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md) | Split Shield runtime behavior tests out of Unit profile admission, establish RAW/ubiquitous naming guidance for deterministic battle-runtime test files, and leave support-profile admission tests narrow. |
| 138   | QMBT43 - Recursive Unit Profile Planning Review | done | QMBT40-QMBT42 | QMBT44-QMBT46 | [QMBT43 planning review](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT43_RECURSIVE_PLANNING_REVIEW.md), [Roving feature widening slice plan](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT41_ROVING_FEATURE_WIDENING_SLICE_PLAN.md), [Unit profile coverage report](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md) | Completed QMBT40-QMBT42 review, refreshed PRD status notes, and appended QMBT44-QMBT46 because the matrix lane is not complete. |
| 139   | QMBT44 - Promote Roving Passive Speed Kind Grants | done | QMBT41-QMBT43 | QMBT45-QMBT46 | [Roving feature widening slice plan](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT41_ROVING_FEATURE_WIDENING_SLICE_PLAN.md), [QMBT43 planning review](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT43_RECURSIVE_PLANNING_REVIEW.md), [Unit profile coverage report](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md) | Completed `ranger_roving` as `unit-feature.passive-speed-kind-grants` with QNT profile coverage, authored mechanics shape parsing, Climb/Swim Speed movement and Dash runtime behavior, deterministic admission evidence, focused runtime parity, and refreshed matrix artifacts. |
| 140   | QMBT45 - Select Next SRD Feature Widening Slice After Roving | done | QMBT44 | QMBT46 | [Relentless Endurance feature widening slice plan](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT45_RELENTLESS_ENDURANCE_FEATURE_WIDENING_SLICE_PLAN.md), [QMBT43 planning review](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT43_RECURSIVE_PLANNING_REVIEW.md), [Unit profile coverage report](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md) | Completed decision: select `orc_relentless_endurance` as the next SRD feature widening slice, with a red/green plan for a zero-Hit-Point replacement Unit-feature profile and a proposed QMBT47 implementation task. |
| 141   | QMBT46 - Recursive Unit Profile Planning Review | done | QMBT44-QMBT45 | QMBT47-QMBT49 | [QMBT46 planning review](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT46_RECURSIVE_PLANNING_REVIEW.md), [Relentless Endurance feature widening slice plan](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT45_RELENTLESS_ENDURANCE_FEATURE_WIDENING_SLICE_PLAN.md), [Unit profile coverage report](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md) | Completed QMBT44-QMBT45 review, refreshed PRD status notes, and appended QMBT47-QMBT49 because the matrix lane is not complete. |
| 142   | QMBT47 - Promote Relentless Endurance Zero-Hit-Point Replacement | ready-for-implementation-after-light-research | QMBT45-QMBT46 | QMBT48-QMBT49 | [Relentless Endurance feature widening slice plan](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT45_RELENTLESS_ENDURANCE_FEATURE_WIDENING_SLICE_PLAN.md), [QMBT46 planning review](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT46_RECURSIVE_PLANNING_REVIEW.md), [Unit profile coverage report](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md) | Implement `orc_relentless_endurance` as `unit-feature.zero-hit-point-replacement` through the existing zero-Hit-Point lifecycle and authored `triggered_replacement` mechanics shape. |
| 143   | QMBT48 - Select Next SRD Feature Widening Slice After Relentless Endurance | ready-for-research | QMBT47 | QMBT49 | [QMBT46 planning review](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT46_RECURSIVE_PLANNING_REVIEW.md), [Unit profile coverage report](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md) | After QMBT47 refreshes matrix pressure, select the next narrow SRD feature widening slice without mixing zero-HP replacement with AC base formulas, healing pools, Temporary Hit Points, resistance, attack replacement, Weapon Mastery, spell, or magic-item scope. |
| 144   | QMBT49 - Recursive Unit Profile Planning Review | ready-for-research | QMBT47-QMBT48 | QMBT50+ | [ACTIVE_PLAN](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md), [QMBT46 planning review](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT46_RECURSIVE_PLANNING_REVIEW.md) | Review QMBT47-QMBT48 findings, update PRD and plan docs, and append the next task batch unless the Unit profile matrix lane is explicitly declared complete. |

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

QMBT12 closeout: these deterministic evidence rows remain valid after QMBT10
and QMBT11. No deterministic admission/projection evidence was downgraded or
reclassified; the generated report still counts 9/16 supported Unit claims.

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
deterministic evidence. QMBT12 confirmed those rows now satisfy QMBT10's
replay-marker semantics, not just owner-file membership. Selected identity MBT
coverage remains 9/16.

Out of scope: one MBT trace per shipped Unit; broad battle MBT; QNT Unit
catalog loops.

Verification: local SRD and `UBIQUITOUS_LANGUAGE.md` checks for the already
modeled Fighter, Barbarian, and Rogue feature anchors; focused feature MBT with
the standard timed protocol; `pnpm unit-profile-coverage:check`; package
typecheck; `pnpm quality`; two `/simplify` rounds.

### Task 105 - QMBT10 - Tighten Unit Identity Evidence Semantics

Status: `done`

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

Status: `done`

Depends on: QMBT8

Blocks: QMBT12-QMBT15, QMBT19

Research / plan: [01_UNIT_PROFILE_PARITY_MBT.md](/workspace/typescript/dnd/prd/01_UNIT_PROFILE_PARITY_MBT.md)

Completed scope: finished the checker modularization started by QMBT8.
`scripts/unit-profile-coverage-check.cjs` is now CLI orchestration, with shared
config, IO, installed/authored Unit discovery, owner-marker scanning,
claim/evidence validation, self-test, and report rendering owned by separate
modules.

Out of scope: changing matrix semantics; adding new Unit evidence; selected MBT
expansion.

Verification: `pnpm unit-profile-coverage:check`; checker self-test; `pnpm
quality`; generated matrix/report stayed stable.

### Task 107 - QMBT12 - Reconcile QMBT8-QMBT9 Closeout

Status: `done`

Depends on: QMBT10-QMBT11

Blocks: QMBT13-QMBT20

Research / plan: [QMBT7_SPECIFIC_UNIT_PARITY_MBT_PLAN.md](/workspace/typescript/dnd/plans/QMBT7_SPECIFIC_UNIT_PARITY_MBT_PLAN.md)

Scope: after QMBT10-QMBT11, review whether QMBT8 and QMBT9 remain correctly
closed. Update closeout notes, task statuses, report labels, evidence rows, and
metrics if the corrected evidence semantics or modularization findings require
reclassification.

Out of scope: new profile implementation and broad evidence expansion.

Completed scope: reviewed QMBT8 deterministic evidence, QMBT9 selected identity
evidence, QMBT10 replay-marker semantics, QMBT11 modularization notes, and the
generated matrix/report. QMBT8 and QMBT9 remain closed. No evidence rows,
report labels, or generated metrics required reclassification; deterministic
admission/projection coverage and selected identity MBT coverage both remain
9/16. QMBT13 was unblocked for research.

Verification: `pnpm unit-profile-coverage:check`; active-plan consistency
check across Ralph index, DAG row, and task detail.

### Task 108 - QMBT13 - Classify Authored Catalog Admission Gaps

Status: `done`

Depends on: QMBT11-QMBT12

Blocks: QMBT14-QMBT18

Research / plan: [UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md)

Completed scope: turned `catalogAdmission.status = "not-in-unit-catalog"` from
a raw gap list into generated actionable dispositions. The report now separates
SRD spell candidates, intentional magic-item backlog, unsupported/widening
pressure, non-runtime authored data, duplicate content issues, and the
Classic/private pressure category.

Out of scope: implementing every missing Unit; admitting all authored content
to the catalog.

Verification: `pnpm unit-profile-coverage:check`; checker self-test; generated
report separates raw not-in-catalog inventory from triaged planning pressure.

### Task 109 - QMBT14 - Trace Spell Unit Admission Evidence

Status: `done`

Depends on: QMBT11-QMBT13

Blocks: QMBT15-QMBT16

Research / plan: [QMBT7_SPECIFIC_UNIT_PARITY_MBT_PLAN.md](/workspace/typescript/dnd/plans/QMBT7_SPECIFIC_UNIT_PARITY_MBT_PLAN.md)

Completed scope: added a deterministic spell Unit admission/projection tracer
for `acid_splash`, `mage_armor`, `magic_missile`, and `ray_of_frost`. The
tracer uses real installed spell Unit ids, loads production catalog Spell
records into creature Spell Access, starts a battle, and verifies
`discoverBattleActs` spell subjects, invocation facts, initial holes, and
spell-act ids.

Out of scope: all spell Units; selected spell identity MBT; broad battle MBT.

Verification: local SRD/ubiquitous-language spellcasting and spell entry check;
`pnpm unit-profile-coverage:check`; focused deterministic spell
admission/projection tests; package typecheck.

### Task 110 - QMBT15 - Expand Spell Unit Admission Evidence

Status: `done`

Depends on: QMBT14

Blocks: QMBT16

Research / plan: [QMBT7_SPECIFIC_UNIT_PARITY_MBT_PLAN.md](/workspace/typescript/dnd/plans/QMBT7_SPECIFIC_UNIT_PARITY_MBT_PLAN.md)

Scope: expand deterministic spell Unit admission/projection evidence if QMBT14
proves the methodology and denominators are clear. Keep evidence deterministic
and catalog/projection focused.

Closeout: `fire_bolt` and `shield` were narrowed from `supported-profile` to
`needs-surface-widening` instead of adding partial deterministic evidence rows.
The supported spell denominator now excludes both until Fire Bolt object-burning
and Shield triggered-Reaction admission/projection are represented at the
matrix/runtime boundary.

Out of scope: selected identity MBT; QNT catalog enumeration; unsupported spell
profile implementation.

Verification: `pnpm unit-profile-coverage:check`; focused deterministic tests;
package typecheck.

### Task 111 - QMBT16 - Decide Selected Spell Identity MBT

Status: `done`

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

Result: no selected spell identity MBT rows are added for the currently
supported spell Units. See
[QMBT16_SELECTED_SPELL_IDENTITY_MBT_DECISION.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT16_SELECTED_SPELL_IDENTITY_MBT_DECISION.md).

### Task 112 - QMBT17 - Define Classic Non-SRD Mechanics Intake Policy

Status: `done`

Depends on: QMBT12-QMBT13

Blocks: QMBT18-QMBT20

Research / plan: [QMBT17_CLASSIC_NON_SRD_MECHANICS_INTAKE_POLICY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT17_CLASSIC_NON_SRD_MECHANICS_INTAKE_POLICY.md)

Completed scope: made private PHB/XPHB mechanics pressure intake explicit:
public renamed mechanics-only Units, synthetic labels, matrix gaps,
unsupported/widening dispositions, assumption closure, and evidence
requirements without leaking private-source identity into shipped ids, labels,
prose, or provenance. The checker now covers private-source identity markers,
protected-expression fields, provenance, synthetic naming, and duplicate SRD
mechanics overlap for the Classic non-SRD collection.

Out of scope: importing private content into this repo; adding protected
expression; broad runtime support for every private-source mechanic.

Verification: `pnpm unit-profile-coverage:check`; `pnpm quality`.

### Task 113 - QMBT18 - Drive Unsupported Feature Profile Red-Green Slice

Status: `done`

Depends on: QMBT10-QMBT13, QMBT17

Blocks: QMBT19-QMBT20

Research / plan: [UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md), [QMBT17_CLASSIC_NON_SRD_MECHANICS_INTAKE_POLICY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT17_CLASSIC_NON_SRD_MECHANICS_INTAKE_POLICY.md)

Completed scope: promoted Defense from an unsupported SRD authored Unit to
`unit-feature.passive-armor-class-bonus`, modeled the Defense Armor Class
procedure in QNT, added focused feature MBT projection coverage, admitted the
profile in battle-runtime support parsing, reused the same projection for
character Armor Class state, added deterministic admission/projection evidence,
and refreshed the unit profile matrix/report.

Out of scope: solving every unsupported feature profile.

Verification: RAW/source check for `.references/srd-5.2.1/Feats.md` Defense
and `UBIQUITOUS_LANGUAGE.md` Armor Class / Armor Category terminology; focused
QNT/QMBT feature checks; `pnpm unit-profile-coverage:check`; runtime admission
and typecheck coverage; `pnpm quality`; two `/simplify` review rounds.

### Task 114 - QMBT19 - Review Unit Profile Matrix Metrics Semantics

Status: `done`

Depends on: QMBT10-QMBT18

Blocks: QMBT20

Research / plan: [01_UNIT_PROFILE_PARITY_MBT.md](/workspace/typescript/dnd/prd/01_UNIT_PROFILE_PARITY_MBT.md)

Completed scope: reviewed matrix denominators, labels, report sections, and
evidence categories after the corrective and expansion slices. The generated
JSON/report now define each metric's planning question, measure, and
denominator; installed inventory is report health rather than coverage; passive
production profiles count in executable evidence denominators.

Out of scope: new runtime behavior.

Verification: `pnpm unit-profile-coverage:check`; report review against PRD
goals and active-plan task semantics.

### Task 115 - QMBT20 - Recursive Unit Profile Planning Review

Status: `done`

Depends on: QMBT10-QMBT19

Blocks: QMBT21-QMBT26

Research / plan: [ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md)

Scope: review QMBT10-QMBT19 findings, update the PRD and plan docs, and append
the next batch of QMBT21+ tasks. This task must include a new recursive
planning-review task at the end of the appended batch unless the Unit profile
matrix lane is explicitly declared complete.

Out of scope: implementation work not captured by the new task batch.

Completed scope: reviewed QMBT10-QMBT19 closeout and the generated Unit
profile report. At QMBT20 closeout, the lane was not complete: deterministic
admission/projection was 14/15 because `mycelium_step` lacked identity
evidence, supported executable Unit coverage was 15/35, `shield` and
`fire_bolt` remained intentionally narrowed behind runtime-boundary decisions,
and the authored catalog still had SRD feature-style widening pressure.
Appended QMBT21-QMBT26 to cover the next focused batch and the next recursive
review.

Verification: active-plan consistency check across Ralph index, DAG table, and
task details; `pnpm unit-profile-coverage:check` if matrix docs or generated
artifacts change.

### Task 116 - QMBT21 - Close Classic Mechanics Deterministic Admission Gap

Status: `done`

Depends on: QMBT17-QMBT20

Blocks: QMBT26

Research / plan: [UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md), [QMBT17_CLASSIC_NON_SRD_MECHANICS_INTAKE_POLICY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT17_CLASSIC_NON_SRD_MECHANICS_INTAKE_POLICY.md)

Scope: close the only supported-Unit deterministic admission gap by adding
production admission/projection evidence for `mycelium_step`, the Classic
non-SRD mechanics-only Unit that shares the supported
`unit-feature.alternate-action-cost` profile. If production admission is not a
valid boundary for Classic mechanics-only fixtures, reclassify the claim or
evidence denominator explicitly so the missing 1/15 state is not ambiguous.

Out of scope: importing private-source identity, adding protected expression,
or broadening Classic non-SRD policy beyond the existing public mechanics-only
contract.

Verification: re-read QMBT17 policy before edits; RAW/ubiquitous check only if
the task touches SRD mechanics; focused deterministic admission/projection test
if evidence is added; `pnpm unit-profile-coverage:check`; package typecheck if
runtime test code changes; no MBT unless focused driver behavior changes;
`/simplify` convergence, minimum two rounds unless the final changeset is
trivial.

Completed scope: added deterministic admission/projection evidence for
`mycelium_step` through the Classic non-SRD mechanics policy fixture boundary
and the production alternate-action-cost support projection. Deterministic
admission/projection coverage is now 15/15.

### Task 117 - QMBT22 - Promote Shield Triggered Reaction Spell Boundary

Status: `done`

Depends on: QMBT10, QMBT15-QMBT20

Blocks: QMBT25-QMBT26

Research / plan: [01_UNIT_PROFILE_PARITY_MBT.md](/workspace/typescript/dnd/prd/01_UNIT_PROFILE_PARITY_MBT.md)

Scope: research local SRD Shield, Reaction, Spellcasting, and Spell Access
terminology, then model the promoted boundary needed for triggered Reaction
spell choices. The target outcome is either reclassifying `shield` back to
supported with deterministic catalog/access/invocation evidence, or recording a
precise assumption/widening blocker that keeps it out of the supported
denominator.

Out of scope: broad spell catalog admission, generic Counterspell-style
reaction chains, and selected identity MBT unless QMBT10 replay-marker criteria
show identity risk after deterministic evidence exists.

Verification: local SRD and `UBIQUITOUS_LANGUAGE.md` check before rules edits;
update QNT before runtime if behavior changes; focused QMBT for changed spell
or reaction procedure behavior with the mandatory timed protocol; `pnpm
unit-profile-coverage:check`; relevant package typecheck/tests; `pnpm quality`
for production behavior changes; `/simplify` convergence, minimum two rounds
unless the final changeset is trivial.

Completed scope: promoted the triggered Reaction Spell Access boundary for
`shield`, including attack-hit and Magic Missile trigger coverage, production
Reaction spell offering/execution, and deterministic catalog/access/invocation
evidence. `shield` is now a supported `spell.reaction-shield` Unit in the
matrix.

### Task 118 - QMBT23 - Decide Fire Bolt Object-Targeting Spell Boundary

Status: `done`

Depends on: QMBT15-QMBT20

Blocks: QMBT25-QMBT26

Research / plan: [01_UNIT_PROFILE_PARITY_MBT.md](/workspace/typescript/dnd/prd/01_UNIT_PROFILE_PARITY_MBT.md)

Scope: research local SRD Fire Bolt, Objects, targeting, and spell effect text,
then decide whether promoted battle-runtime should represent object targets and
flammable-object ignition as table-supplied facts, an explicit spell projection
boundary, or an assumption-backed unsupported state. If implemented, reclassify
`fire_bolt` only after QNT, runtime, deterministic admission, and matrix
evidence agree.

Completed decision: [QMBT23 Fire Bolt Object Target Boundary Decision](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT23_FIRE_BOLT_OBJECT_TARGET_BOUNDARY_DECISION.md)
keeps `fire_bolt` classified as `needs-surface-widening`. Promoted support
requires an explicit object-target Spell Invocation branch and object-ignition
Spell Effect outcome; table-supplied object facts are necessary inputs, but not
a complete runtime boundary.

Out of scope: grid state, pathfinding, cover/line-of-sight derivation, and a
general object simulation model beyond the Fire Bolt boundary decision.

Verification: local SRD and `UBIQUITOUS_LANGUAGE.md` check before rules edits;
update QNT before runtime for behavior changes; focused spell QMBT with the
mandatory timed protocol if procedure behavior changes; `pnpm
unit-profile-coverage:check`; relevant package typecheck/tests; `pnpm quality`
for production behavior changes; `/simplify` convergence, minimum two rounds
unless the final changeset is trivial.

### Task 119 - QMBT24 - Select Next SRD Feature Widening Slice

Status: `done`

Depends on: QMBT18-QMBT20

Blocks: QMBT26

Research / plan: [QMBT24_ARCHERY_FEATURE_WIDENING_SLICE_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT24_ARCHERY_FEATURE_WIDENING_SLICE_PLAN.md), [UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md)

Completed scope: selected `feat_archery` from the generated
unsupported/widening inventory as the next Defense-style SRD feature widening
slice. The chosen profile is `unit-feature.passive-ranged-attack-roll-bonus`,
covering the SRD Archery Fighting Style feat's passive +2 bonus to attack rolls
made with Ranged weapons. Fast Movement/Roving, Extra Attack, Adrenaline Rush,
and other mixed-boundary rows remain out of this slice.

Out of scope: implementing the selected feature in this planning task; solving
all class features, species traits, masteries, or feats at once.

Verification: local SRD and `UBIQUITOUS_LANGUAGE.md` checks completed for the
candidate rows; `pnpm unit-profile-coverage:check`; active-plan consistency
across Ralph index, DAG table, and task details; two `/simplify` review rounds.

### Task 120 - QMBT25 - Re-triage Spell Catalog Admission After Boundary Slices

Status: `done`

Depends on: QMBT22-QMBT23

Blocks: QMBT26

Research / plan: [UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md)

Scope: after QMBT22 and QMBT23 settle the two known spell-boundary blockers,
refresh spell Unit admission triage. Append the next deterministic spell
evidence batch from SRD spell candidates whose projection profile is now
unambiguous, and keep spell rows that require new effect families out of the
supported denominator.

Out of scope: one MBT trace per spell, QNT catalog enumeration, and broad
authored spell import.

Verification: `pnpm unit-profile-coverage:check`; focused deterministic spell
admission/projection tests for any new evidence rows; focused MBT only if a
chosen spell changes procedure behavior; active-plan consistency for any new
batch appended from the triage; `/simplify` convergence, minimum two rounds
unless the final changeset is trivial.

Completed scope: refreshed spell admission after QMBT22 and QMBT23 by admitting
`healing_word` as `spell.bonus-action-healing` with deterministic
admission/projection evidence. `shield` remained supported from QMBT22, and
`fire_bolt` remained out of supported evidence behind the QMBT23 object-target
and object-ignition boundary.

### Task 121 - QMBT26 - Recursive Unit Profile Planning Review

Status: `done`

Depends on: QMBT21-QMBT25

Blocks: QMBT27-QMBT30

Research / plan: [ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md)

Scope: review QMBT21-QMBT25 findings, update the PRD and plan docs, and append
the next batch of QMBT27+ tasks starting with `QMBT27 - Promote Archery Passive
Ranged Attack-Roll Bonus` from QMBT24's selected Archery widening slice. This
task must include a new recursive planning-review task at the end of the
appended batch unless the Unit profile matrix lane is explicitly declared
complete.

Out of scope: implementation work not captured by the new task batch.

Completed scope: reviewed QMBT21-QMBT25 closeout and the generated Unit
profile report. At QMBT26 closeout, the lane is not complete: supported
executable Unit coverage is 17/36, deterministic admission/projection evidence
is complete for the supported Unit denominator at 17/17, selected identity MBT
coverage remains intentionally selective at 9/17, `fire_bolt` remains a
spell-boundary blocker, and SRD feature/spell widening pressure remains.
Appended QMBT27-QMBT30 to implement Archery, re-triage spell admission
candidates, select the next feature widening slice after Archery, and run the
next recursive planning review.

Verification: active-plan consistency check across Ralph index, DAG table, and
task details; `pnpm unit-profile-coverage:check` if matrix docs or generated
artifacts change; `/simplify` convergence, minimum two rounds unless the final
changeset is trivial.

### Task 122 - QMBT27 - Promote Archery Passive Ranged Attack-Roll Bonus

Status: `done`

Depends on: QMBT24-QMBT26

Blocks: QMBT29-QMBT30

Research / plan: [QMBT24_ARCHERY_FEATURE_WIDENING_SLICE_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT24_ARCHERY_FEATURE_WIDENING_SLICE_PLAN.md)

Scope: implement the QMBT24 red/green plan for `feat_archery`. Promote the
domain profile `unit-feature.passive-ranged-attack-roll-bonus` for the SRD
Archery Fighting Style feat's passive +2 bonus to attack rolls made with
Ranged weapons. Update the SRD Unit catalog boundary, QNT procedure profile and
proof, focused feature MBT projection, production support parser/projection,
weapon attack-roll execution boundary, deterministic admission/projection
evidence, and generated matrix artifacts as one coherent slice.

Out of scope: Fast Movement/Roving, Extra Attack, weapon masteries, Temporary
Hit Point traits, general roll-modifier families beyond the Archery-shaped
passive ranged weapon attack-roll bonus, and authored-id dispatch registries.

Verification: RAW and `UBIQUITOUS_LANGUAGE.md` check for Archery, Fighting
Style, Attack Rolls, Ranged weapons, and attack modifier timing; update QNT
before runtime behavior; focused QNT proof; focused QMBT feature parity with
the mandatory timed background protocol because runtime behavior changes;
`pnpm unit-profile-coverage:check`; relevant package typecheck/tests; `pnpm
quality`; `/simplify` convergence, minimum two rounds.

Completed scope: promoted `feat_archery` into the SRD Unit catalog and
supported runtime profile matrix as `unit-feature.passive-ranged-attack-roll-bonus`,
modeled the Archery +2 Ranged weapon attack-roll procedure in QNT, projected the
support profile through production battle attack-roll holes, and added focused
MBT plus deterministic admission/projection evidence.

### Task 123 - QMBT28 - Re-triage Spell Admission Candidates After Shield and Healing Word

Status: `done`

Depends on: QMBT22-QMBT23, QMBT25-QMBT26

Blocks: QMBT30

Research / plan:
[QMBT28_SPELL_ADMISSION_TRIAGE.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT28_SPELL_ADMISSION_TRIAGE.md),
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md),
[QMBT23_FIRE_BOLT_OBJECT_TARGET_BOUNDARY_DECISION.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT23_FIRE_BOLT_OBJECT_TARGET_BOUNDARY_DECISION.md)

Scope: review the spell catalog after QMBT22 admitted `shield`, QMBT25 admitted
`healing_word`, and QMBT23 kept `fire_bolt` behind the explicit object-target
and object-ignition boundary. Select the next deterministic spell admission
batch whose SRD profile is already unambiguous, or append a focused boundary
task when every high-value candidate needs a new spell effect family. Keep
`fire_bolt` out of supported evidence until the QMBT23 conditions are met.

Out of scope: implementing the selected spell batch, one MBT trace per spell,
QNT catalog enumeration, broad authored spell import, and object-target support
for Fire Bolt unless this task explicitly selects that as the next boundary
task.

Verification: local SRD and `UBIQUITOUS_LANGUAGE.md` checks for candidate spell
rules being selected; active-plan consistency if a follow-on task is appended
or revised; `pnpm unit-profile-coverage:check` only if matrix docs or generated
artifacts change; no MBT for research-only triage; `/simplify` convergence,
minimum two rounds unless the final changeset is trivial.

Completed scope: selected direct Hit Point restoration for `cure_wounds` and
`mass_healing_word` as the next spell admission batch, kept `fire_bolt` out of
supported evidence behind the QMBT23 object-target/object-ignition boundary,
and recorded a red/green implementation plan. QMBT30 appended that work as
QMBT32.

### Task 124 - QMBT29 - Select Next SRD Feature Widening Slice After Archery

Status: `done`

Depends on: QMBT27

Blocks: QMBT30

Research / plan:
[QMBT29_SAVAGE_ATTACKER_FEATURE_WIDENING_SLICE_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT29_SAVAGE_ATTACKER_FEATURE_WIDENING_SLICE_PLAN.md),
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md)

Scope: completed review of remaining SRD feature, species trait, feat, and
mastery pressure after Archery. Selected `feat_savage_attacker` as the next
narrow battle-executable feature-style widening slice, with source checks and
a red/green plan comparable to QMBT24.

Out of scope: implementing the selected slice; solving all unsupported
features, species traits, feats, or masteries at once; widening movement,
attack-count, reaction, and resource families in a single mixed task.

Verification: local SRD and `UBIQUITOUS_LANGUAGE.md` checks for candidate rows;
`pnpm unit-profile-coverage:check`; active-plan consistency across Ralph index,
DAG table, and task details if new tasks are appended or revised; no MBT for
research-only slice selection; `/simplify` convergence, minimum two rounds
unless the final changeset is trivial.

### Task 125 - QMBT30 - Recursive Unit Profile Planning Review

Status: `done`

Depends on: QMBT27-QMBT29

Blocks: QMBT31-QMBT33

Research / plan: [ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md)

Scope: review QMBT27-QMBT29 findings, update the PRD and plan docs, and append
the next batch of QMBT31+ tasks. This task must include a new recursive
planning-review task at the end of the appended batch unless the Unit profile
matrix lane is explicitly declared complete.

Out of scope: implementation work not captured by the new task batch.

Verification: active-plan consistency check across Ralph index, DAG table, and
task details; `pnpm unit-profile-coverage:check` if matrix docs or generated
artifacts change; `/simplify` convergence, minimum two rounds unless the final
changeset is trivial.

Completed scope: reviewed QMBT27-QMBT29. QMBT27 promoted Archery as
`unit-feature.passive-ranged-attack-roll-bonus`, raising the generated matrix
to 51 installed Units, 16 executable profiles, 18/37 supported executable Unit
coverage, 18/18 deterministic admission/projection coverage, and 9/18 selected
identity MBT coverage. QMBT28 selected direct Hit Point restoration for
`cure_wounds` and `mass_healing_word` while keeping `fire_bolt` blocked behind
QMBT23 object-target/object-ignition boundaries. QMBT29 selected
`feat_savage_attacker` as the next feature-style widening slice. The matrix
lane is not complete, so QMBT31-QMBT33 were appended.

Completed verification: active-plan consistency was checked across the Ralph
index, DAG table, and task details for QMBT30-QMBT33 with no scoped
mismatches. Older QCORE7-QCORE11 title-prefix mismatches and QMBT1-QMBT6
missing-detail mismatches predate this planning diff and were treated as
baseline noise. `pnpm unit-profile-coverage:check` passed for the refreshed
matrix documentation. `/simplify` convergence ran two review rounds: round 1
found the missing QMBT30 closeout verification record; round 2 found no
remaining important fixes after this record was added. `git diff --check`
passed for the reviewed planning files. No MBT was run because QMBT30 changed
planning documentation only and did not change battle-runtime behavior.

### Task 126 - QMBT31 - Promote Savage Attacker Weapon Damage Dice Choice

Status: `done`

Depends on: QMBT29-QMBT30

Blocks: QMBT33

Research / plan:
[QMBT29_SAVAGE_ATTACKER_FEATURE_WIDENING_SLICE_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT29_SAVAGE_ATTACKER_FEATURE_WIDENING_SLICE_PLAN.md),
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md)

Scope: implement the QMBT29 red/green plan for `feat_savage_attacker`.
Promote `unit-feature.weapon-damage-dice-roll-choice` for the SRD Savage
Attacker feat's once-per-turn weapon damage dice choice. Update the QNT
procedure profile and proof first, then focused feature QMBT, production
support parsing/projection, attack damage hole filling, deterministic
admission/projection evidence, and generated matrix artifacts.

Out of scope: Extra Attack, movement-capacity features, Unarmored Defense AC
calculation alternatives, species resource mixtures, weapon masteries, magic
items, and general damage-reroll families beyond the Savage Attacker-shaped
weapon damage dice choice.

Verification completed: RAW and `UBIQUITOUS_LANGUAGE.md` checked for Savage
Attacker, weapon hits, Damage Rolls, Critical Hits, Attack Damage Riders, and
once-per-turn resource wording. `ASSUMPTIONS.md` A46 records the Savage
Attacker plus Critical Hit modeling decision. Focused QNT proof, timed focused
QMBT feature parity, `pnpm unit-profile-coverage:check`, package
typecheck/tests, `pnpm quality`, and two simplify review rounds passed.

### Task 127 - QMBT32 - Promote Direct Hit Point Restoration Spell Batch

Status: `done`

Depends on: QMBT28-QMBT30

Blocks: QMBT33

Research / plan:
[QMBT28_SPELL_ADMISSION_TRIAGE.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT28_SPELL_ADMISSION_TRIAGE.md),
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md)

Scope: implement the QMBT28 red/green plan for direct Hit Point restoration
spells. Promote `cure_wounds` and `mass_healing_word` through a domain-named
healing profile that makes action cost, target count, minimum slot level,
selected slot level, dice expression, and spellcasting ability modifier
explicit. Update QNT procedure facts before runtime widening, then production
spell support projection, deterministic admission/projection evidence, and
generated matrix artifacts.

Out of scope: Fire Bolt object targeting/ignition, Mass Cure Wounds
area-centered targeting, condition removal, max-HP modification, heal-to-max,
target Reaction stand-up, noncombat sensing spells, concentration condition
lifecycle, and forced movement spells.

Verification completed: RAW and `UBIQUITOUS_LANGUAGE.md` checked for Cure
Wounds, Mass Healing Word, Healing Word precedent, Spell Definition, Spell
Access, Spell Invocation, Spell Effect, Casting Time, Spell Slots, and Hit
Points. Focused QNT proof, timed focused QMBT spell parity, deterministic
admission/projection tests, `pnpm unit-profile-coverage:check`, package
typecheck/tests, `pnpm quality`, and two simplify review rounds passed.

### Task 128 - QMBT33 - Recursive Unit Profile Planning Review

Status: `done`

Depends on: QMBT31-QMBT32

Blocks: QMBT34-QMBT36

Research / plan:
[QMBT33_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT33_RECURSIVE_PLANNING_REVIEW.md),
[ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md)

Scope: review QMBT31-QMBT32 findings, update the PRD and plan docs, and append
the next batch of QMBT34+ tasks. This task must include a new recursive
planning-review task at the end of the appended batch unless the Unit profile
matrix lane is explicitly declared complete.

Out of scope: implementation work not captured by the new task batch.

Verification: active-plan consistency check across Ralph index, DAG table, and
task details; `pnpm unit-profile-coverage:check` if matrix docs or generated
artifacts change; `/simplify` convergence, minimum two rounds unless the final
changeset is trivial.

Completed scope: reviewed QMBT31-QMBT32. QMBT31 promoted
`feat_savage_attacker` as
`unit-feature.weapon-damage-dice-roll-choice`, raising selected identity MBT
coverage to 10/21. QMBT32 promoted `cure_wounds` and
`mass_healing_word` as `spell.hit-point-restoration`, raising generated
matrix status to 53 installed Units, 17 executable profiles, 21/39 supported
executable Unit coverage, and 21/21 deterministic admission/projection
coverage. The matrix lane is not complete, so QMBT34-QMBT36 were appended.

Completed verification: active-plan consistency was checked across the Ralph
index, DAG table, and task details for QMBT33-QMBT36 with no scoped
mismatches. `pnpm unit-profile-coverage:check` passed; matrix docs and
generated artifacts were not changed. `/simplify` convergence ran two review
rounds: round 1 found that Mass Cure Wounds should be the next spell widening
because QMBT32 already proved direct HP restoration but left point-origin
Sphere targeting out of scope; round 2 found no important changes after the
next batch was narrowed to one spell implementation task, one feature
selection task, and the recursive review. `git diff --check` passed for the
reviewed planning files. No MBT was run because QMBT33 changed planning
documentation only and did not change battle-runtime behavior.

### Task 129 - QMBT34 - Promote Mass Cure Wounds Area Hit Point Restoration

Status: `done`

Depends on: QMBT32-QMBT33

Blocks: QMBT36

Research / plan:
[QMBT33_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT33_RECURSIVE_PLANNING_REVIEW.md),
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md)

Scope: promote `mass_cure_wounds` as a supported SRD spell Unit under
`spell.hit-point-restoration`. Extend the QMBT32 direct HP restoration boundary
with explicit point-origin 30-foot-radius Sphere target selection, up to six
creature targets in the area, Action casting, minimum level-5 Spell Slot spend,
slot scaling, deterministic admission/projection evidence, and refreshed
matrix artifacts.

Out of scope: `heal`, `mass_heal`, `power_word_heal`, condition removal,
max-HP modification, heal-to-max allocation, target Reaction stand-up,
Fire Bolt object targeting/ignition, general area damage, concentration
condition lifecycle, and magic item spell-grant admission.

Completed scope: promoted `mass_cure_wounds` as `spell.hit-point-restoration`
with point-origin 30-foot-radius Sphere target-list evidence, up to six
creature targets, Magic Action casting, minimum level-5 Spell Slot spend, slot
scaling, deterministic admission/projection evidence, focused spell runtime
parity, and refreshed matrix artifacts.

Verification: RAW and `UBIQUITOUS_LANGUAGE.md` check for Mass Cure Wounds,
Area of Effect, Sphere, Target, Spell Definition, Spell Access, Spell
Invocation, Spell Effect, Casting Time, Spell Slots, and Hit Points; focused
QNT proof for the area HP restoration procedure facts; focused QMBT spell
parity; `pnpm unit-profile-coverage:check`; package typecheck/tests;
`pnpm quality`; `/simplify` convergence, minimum two rounds.

### Task 130 - QMBT35 - Select Next SRD Feature Widening Slice After Savage Attacker

Status: `done`

Depends on: QMBT31-QMBT33

Blocks: QMBT36

Research / plan:
[QMBT35_EXTRA_ATTACK_FEATURE_WIDENING_SLICE_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT35_EXTRA_ATTACK_FEATURE_WIDENING_SLICE_PLAN.md),
[QMBT33_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT33_RECURSIVE_PLANNING_REVIEW.md),
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md)

Scope: review remaining SRD feature-style executable pressure after Savage
Attacker and select one narrow next feature widening slice. Candidate lanes
include Extra Attack sequencing, Fast Movement/Roving Speed projection,
Unarmored Defense base AC calculation selection, Lay on Hands/Tireless/
Adrenaline Rush healing or Temporary Hit Point resources, Dragonborn Breath
Weapon attack replacement, damage resistance traits, and Weapon Mastery
properties. Produce a task-specific decision doc and suggested implementation
task if a slice is selected.

Out of scope: implementing the selected feature slice; selecting spell,
magic-item, or catalog-cleanup work; broad feature-family widening; solving all
unsupported feature rows in one task.

Verification: RAW and `UBIQUITOUS_LANGUAGE.md` checks for every candidate
boundary seriously considered; active-plan consistency check for any appended
tasks; `pnpm unit-profile-coverage:check` only if matrix docs or generated
artifacts change; no MBT for this research-only task; `/simplify` convergence,
minimum two rounds.

Completed scope: selected level-5 `fighter_extra_attack`,
`paladin_extra_attack`, and `ranger_extra_attack` as the next bounded SRD
feature widening slice. The chosen implementation boundary is the authored
passive `scale_attack_count` / `additional: 1` shape projected as
`unit-feature.attack-action-attack-count-scaling`, kept distinct from Stat
Block Multiattack, Fighter higher-tier Extra Attacks, Dragonborn Breath
Weapon, Weapon Mastery, speed projection, AC base calculation alternatives,
healing/temp-HP resources, resistance traits, spells, and magic items.

Verification: RAW checked against the SRD 5.2.1 class Extra Attack passages,
Attack action, movement between attacks, turn action/movement rules, and
multiclass Extra Attack non-stacking; `UBIQUITOUS_LANGUAGE.md` checked for
Multiattack, Speed/Movement, Unarmored Defense/Armor Class, Hit
Points/Temporary Hit Points, Pool/Quota/Spend, Resistance/Damage Type, and
Weapon Mastery terms; `/simplify` converged in two rounds; no MBT was run
because this was research-only; `pnpm unit-profile-coverage:check` was not run
because matrix docs and generated artifacts did not change.

### Task 131 - QMBT36 - Recursive Unit Profile Planning Review

Status: `done`

Depends on: QMBT34-QMBT35

Blocks: QMBT37-QMBT39

Research / plan:
[QMBT36_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT36_RECURSIVE_PLANNING_REVIEW.md),
[ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md),
[QMBT35_EXTRA_ATTACK_FEATURE_WIDENING_SLICE_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT35_EXTRA_ATTACK_FEATURE_WIDENING_SLICE_PLAN.md)

Scope: review QMBT34-QMBT35 findings, update the PRD and plan docs, and append
the next batch of QMBT37+ tasks. This task must include a new recursive
planning-review task at the end of the appended batch unless the Unit profile
matrix lane is explicitly declared complete.

Out of scope: implementation work not captured by the new task batch.

Verification: active-plan consistency check across Ralph index, DAG table, and
task details; `pnpm unit-profile-coverage:check` if matrix docs or generated
artifacts change; `/simplify` convergence, minimum two rounds unless the final
changeset is trivial.

Completed scope: reviewed QMBT34-QMBT35 closeout and the generated Unit
profile report. At QMBT36 closeout, the lane is not complete: supported
executable Unit coverage is 22/40, deterministic admission/projection evidence
is complete for the supported Unit denominator at 22/22, selected identity MBT
coverage remains intentionally selective at 10/22, `fire_bolt` remains a
spell-boundary blocker, and SRD feature widening pressure remains. Appended
QMBT37-QMBT39 to implement level-5 Extra Attack sequencing, select the next
feature widening slice after Extra Attack, and run the next recursive planning
review.

Verification: active-plan consistency check across Ralph index, DAG table, and
task details; `pnpm unit-profile-coverage:check`; `/simplify` convergence in
two rounds. MBT was not run because QMBT36 changed planning documentation only.

### Task 132 - QMBT37 - Promote Level 5 Extra Attack Sequencing

Status: `done`

Depends on: QMBT35-QMBT36

Blocks: QMBT38-QMBT39

Research / plan:
[QMBT35_EXTRA_ATTACK_FEATURE_WIDENING_SLICE_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT35_EXTRA_ATTACK_FEATURE_WIDENING_SLICE_PLAN.md),
[QMBT36_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT36_RECURSIVE_PLANNING_REVIEW.md),
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md)

Scope: implement the QMBT35 red/green plan for level-5 Extra Attack. Promote
`fighter_extra_attack`, `paladin_extra_attack`, and `ranger_extra_attack` as
supported SRD feature Units under
`unit-feature.attack-action-attack-count-scaling`. The implementation boundary
is the authored passive `scale_attack_count` / `additional: 1` mechanics shape
projected into one Attack action that spends the action once, opens exactly one
additional ordinary attack slot, allows Movement between the attack slots, and
closes an unspent slot at End Turn.

Out of scope: Fighter level-11/20 Extra Attacks, Warlock invocation variants,
Monk catalog intake, Stat Block Multiattack, Dragonborn Breath Weapon attack
replacement, two-weapon fighting, Nick, Cleave, Weapon Mastery properties,
speed projection, AC base calculation alternatives, healing or Temporary Hit
Point resource features, resistance traits, spell admission, magic items, and
authored-id dispatch registries.

Completed scope: promoted level-5 Fighter, Paladin, and Ranger Extra Attack as
`unit-feature.attack-action-attack-count-scaling`, using the authored
`scale_attack_count` / `additional: 1` mechanics projection to open one
ordinary attack slot after spending the Attack action once. The implementation
allows Movement between attack slots, closes unspent slots at End Turn, keeps
multiclass Extra Attack non-stacking to one added slot for this slice, and
keeps class-feature Extra Attack distinct from Stat Block Multiattack.

Verification: RAW and `UBIQUITOUS_LANGUAGE.md` check completed through the
QMBT35/QMBT36 source anchors; focused QNT proof for the new attack-count
scaling profile passed; focused Extra Attack runtime parity passed with the
mandatory timed background MBT protocol; `pnpm unit-profile-coverage:check`
passed; relevant battle-runtime typecheck/tests passed; `pnpm quality` passed;
`/simplify` converged after two rounds.

### Task 133 - QMBT38 - Select Next SRD Feature Widening Slice After Extra Attack

Status: `done`

Depends on: QMBT37

Blocks: QMBT39

Research / plan:
[QMBT38_FAST_MOVEMENT_FEATURE_WIDENING_SLICE_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT38_FAST_MOVEMENT_FEATURE_WIDENING_SLICE_PLAN.md),
[QMBT36_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT36_RECURSIVE_PLANNING_REVIEW.md),
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md)

Completed scope: reviewed remaining SRD feature-style executable pressure
after QMBT37 and selected `barbarian_fast_movement` as the next narrow feature
widening slice. The selected implementation boundary is
`unit-feature.passive-speed-bonus`: a +10-foot Speed increase while not wearing
Heavy armor, with movement budget and Dash using the effective Speed.

Out of scope: implementing the selected feature slice; selecting spell,
magic-item, or catalog-cleanup work; broad feature-family widening; solving all
unsupported feature rows in one task.

Verification: RAW and `UBIQUITOUS_LANGUAGE.md` checks were recorded in the
Fast Movement slice plan for every seriously considered candidate boundary;
active-plan consistency check updated the Ralph index, DAG table, and task
details; `pnpm unit-profile-coverage:check` was not run because matrix docs and
generated artifacts did not change; MBT was not run because this was
research-only; `/simplify` converged after two rounds.

Result: QMBT39 is unblocked and should append
`QMBT40 - Promote Fast Movement Passive Speed Bonus` before the next recursive
review batch continues broad feature-family widening.

### Task 134 - QMBT39 - Recursive Unit Profile Planning Review

Status: `done`

Depends on: QMBT37-QMBT38

Blocks: QMBT40-QMBT43

Research / plan:
[ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md),
[QMBT39_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT39_RECURSIVE_PLANNING_REVIEW.md),
[QMBT38_FAST_MOVEMENT_FEATURE_WIDENING_SLICE_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT38_FAST_MOVEMENT_FEATURE_WIDENING_SLICE_PLAN.md),
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md)

Scope: review QMBT37-QMBT38 findings, update the PRD and plan docs, append
`QMBT40 - Promote Fast Movement Passive Speed Bonus`, and append any additional
QMBT41+ batch tasks. This task must include a new recursive planning-review
task at the end of the appended batch unless the Unit profile matrix lane is
explicitly declared complete.

Out of scope: implementation work not captured by the new task batch.

Completed scope: reviewed QMBT37's Extra Attack implementation closeout and
QMBT38's Fast Movement selection, confirmed the generated matrix lane is not
complete, refreshed PRD status notes, and appended QMBT40-QMBT43.

Verification: active-plan consistency check across Ralph index, DAG table, and
task details; `pnpm unit-profile-coverage:check` if matrix docs or generated
artifacts change; `/simplify` convergence in two rounds. MBT was not run
because QMBT39 changed planning documentation only.

### Task 135 - QMBT40 - Promote Fast Movement Passive Speed Bonus

Status: `done`

Depends on: QMBT38-QMBT39

Blocks: QMBT41, QMBT43

Research / plan:
[QMBT38_FAST_MOVEMENT_FEATURE_WIDENING_SLICE_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT38_FAST_MOVEMENT_FEATURE_WIDENING_SLICE_PLAN.md),
[QMBT39_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT39_RECURSIVE_PLANNING_REVIEW.md),
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md)

Scope: implement the QMBT38 red/green plan for `barbarian_fast_movement`.
Promote a new `unit-feature.passive-speed-bonus` profile for the SRD Barbarian
Fast Movement feature: a +10-foot Speed increase while not wearing Heavy
armor. The implementation must derive movement budget and Dash bonus from the
effective Speed, use authored mechanics shape parsing rather than authored-id
dispatch, and refresh deterministic admission/projection evidence and matrix
artifacts.

Closeout: completed `barbarian_fast_movement` as
`unit-feature.passive-speed-bonus`, including QNT profile/proof evidence,
production support from authored mechanics, effective Speed projection into
movement budget and Dash, deterministic admission/projection evidence, focused
runtime parity, and refreshed matrix artifacts.

Out of scope: Ranger Roving Climb and Swim Speed grants, Dash-as-Bonus-Action
traits, Temporary Hit Point features, Unarmored Defense AC base calculation
alternatives, Dragonborn Breath Weapon, resistance traits, Weapon Mastery
properties, spell admission, magic items, general movement feature families,
and per-Unit Speed caches that duplicate canonical build/equipment facts.

Verification: RAW and `UBIQUITOUS_LANGUAGE.md` check for Fast Movement, Speed,
Movement, Dash, Heavy armor predicates, and Speed capacity vs movement spent;
focused QNT proof for the passive Speed bonus profile; focused runtime parity
with the mandatory timed background MBT protocol if promoted battle behavior
changes; `pnpm unit-profile-coverage:check`; relevant package typecheck/tests;
`pnpm quality`; `/simplify` convergence, minimum two rounds.

### Task 136 - QMBT41 - Select Next SRD Feature Widening Slice After Fast Movement

Status: `done`

Depends on: QMBT40

Blocks: QMBT43

Research / plan:
[QMBT41 Roving feature widening slice plan](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT41_ROVING_FEATURE_WIDENING_SLICE_PLAN.md),
[QMBT39_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT39_RECURSIVE_PLANNING_REVIEW.md),
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md)

Scope: after QMBT40 refreshes matrix pressure, select the next narrow SRD
feature-style widening slice. Candidate lanes should remain domain-distinct:
Roving's special Speed grants, AC base calculation alternatives, healing pools,
Temporary Hit Points, resistance traits, attack replacement, and Weapon Mastery
properties should not be mixed into one implementation task.

Out of scope: implementing the selected slice, selecting spell or magic-item
work, catalog cleanup unrelated to feature widening, and broad feature-family
widening.

Verification: RAW and `UBIQUITOUS_LANGUAGE.md` check for every seriously
considered candidate boundary; active-plan consistency across Ralph index, DAG
table, and task details; `pnpm unit-profile-coverage:check` if matrix docs or
generated artifacts change; `/simplify` convergence, minimum two rounds unless
the final changeset is trivial. MBT is not expected for this research-only
task.

Closeout: selected `ranger_roving` as the next narrow SRD feature-style
widening slice and proposed QMBT44, `Promote Roving Passive Speed Kind Grants`,
for the implementation work. The selected profile boundary is
`unit-feature.passive-speed-kind-grants`: reuse Fast Movement's passive
walk-Speed increase shape, then add represented Climb Speed and Swim Speed
grants equal to effective Speed without mixing AC base alternatives, healing
pools, Temporary Hit Points, attack replacement, resistance, Weapon Mastery,
spell, or magic-item scope.

### Task 137 - QMBT42 - Split Runtime Tests by RAW and Ubiquitous Boundaries

Status: `done`

Depends on: QMBT22, QMBT39

Blocks: QMBT43

Research / plan:
[ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md),
[Spells/Descriptions-S-Z.md Shield](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md),
[Rules-Glossary.md Reaction and Opportunity Attacks](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Playing-the-Game.md Reactions and Opportunity Attacks](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md)

Scope: split deterministic battle-runtime tests that assert runtime behavior
out of `unit-profile-admission.test.ts` and into RAW/ubiquitous-language
boundaries. Start with the Shield cluster: create
`packages/battle-runtime/src/shield-reaction-spell.test.ts` with
`describe("Shield Reaction spell")`; move Shield runtime behavior tests there,
including attack-hit Reaction offer, +5 Armor Class against the triggering
Attack Roll, later attacks before expiration, expiration at the start of the
caster's next turn, spell attack roll hits, Magic Missile named-spell negation,
and Spell Slot constraints. Keep only a narrow Shield support-profile /
Spell Access projection smoke test in `unit-profile-admission.test.ts`.

Guidance: use RAW concepts as deterministic runtime test boundaries:
`shield-reaction-spell.test.ts` for Shield's own Spell Effect and Reaction
spell obligations; future `reactions.test.ts` for shared Reaction
Offer/Decline/Resolve, Reaction reset, and continuation protocol;
`opportunity-attacks.test.ts` for reach-exit, melee attack requirement,
Disengage suppression, and movement resume; `spell-support-profiles.test.ts`,
`unit-feature-support-profiles.test.ts`, and `feat-support-profiles.test.ts`
for support-profile boundary checks. The Opportunity Attack in the Shield
duration scenario should remain in the Shield file because it observes Shield
expiration rather than proving generic Opportunity Attack rules.

Naming guidance: prefer `Reaction`, `Opportunity Attack`, `Armor Class`,
`Attack Roll`, `Spell Slot`, `Spell Access`, `Spell Invocation`,
`Spell Effect`, `Duration`, `Magic Action`, and `Hit Point restoration`.
Avoid implementation-history terms such as `admission`, `candidate`, `slice`,
`tracer`, `expansion`, `re-triage`, and `profile projection` outside the
support-profile boundary where they are literally the rule under test.

Helper guidance: keep helper names layer-honest. Authored/catalog helpers
should name SRD provenance explicitly, e.g. `srdSpellRecord` and
`srdUnitRecord`; structured-input-only fixtures should not be named as SRD
provenance; runtime builders should use battle/runtime names such as
`battleWithShieldReactionSpell` and `battleWithAttackers`; resolution helpers
may use names such as `resolveAttackRollOnly`, `resolveShieldReactionChoice`,
and `endTurnByActor`. Do not collapse provenance, structured input, and runtime
projection in generic helper names.

Out of scope: changing production battle-runtime behavior, broad test-suite
renames, moving all `index.test.ts` clusters in one task, changing unit profile
matrix semantics, or altering `UNIT-IDENTITY-EVIDENCE` comments beyond moving
them with the tests they describe.

Verification: RAW and `UBIQUITOUS_LANGUAGE.md` check for Shield, Reaction,
Opportunity Attack, Armor Class, Attack Roll, Spell Slot, Spell Access, Spell
Invocation, and Spell Effect; focused package tests for all files touched by
the move; `pnpm --filter @dnd/battle-runtime typecheck`; active-plan
consistency across Ralph index, DAG table, and task details; `/simplify`
convergence, minimum two rounds. MBT is not expected because this is a
test-organization task unless production behavior changes.

### Task 138 - QMBT43 - Recursive Unit Profile Planning Review

Status: `done`

Depends on: QMBT40-QMBT42

Blocks: QMBT44-QMBT46

Research / plan:
[QMBT43_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT43_RECURSIVE_PLANNING_REVIEW.md),
[QMBT41_ROVING_FEATURE_WIDENING_SLICE_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT41_ROVING_FEATURE_WIDENING_SLICE_PLAN.md),
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md)

Scope: review QMBT40-QMBT42 findings, update the PRD and plan docs, and append
the next implementation/research batch. This task must include a new recursive
planning-review task at the end of the appended batch unless the Unit profile
matrix lane is explicitly declared complete.

Closeout: completed QMBT40-QMBT42 review, confirmed the matrix lane remains
incomplete at 26/44 supported executable Units, refreshed PRD status notes, and
appended QMBT44-QMBT46. The next implementation task is QMBT44,
`Promote Roving Passive Speed Kind Grants`, followed by post-Roving SRD feature
slice selection and another recursive planning review.

Out of scope: implementation work not captured by the new task batch.

Verification: active-plan consistency check across Ralph index, DAG table, and
task details; `pnpm unit-profile-coverage:check` if matrix docs or generated
artifacts change; `/simplify` convergence, minimum two rounds unless the final
changeset is trivial.

### Task 139 - QMBT44 - Promote Roving Passive Speed Kind Grants

Status: `done`

Depends on: QMBT41-QMBT43

Blocks: QMBT45-QMBT46

Research / plan:
[QMBT41_ROVING_FEATURE_WIDENING_SLICE_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT41_ROVING_FEATURE_WIDENING_SLICE_PLAN.md),
[QMBT43_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT43_RECURSIVE_PLANNING_REVIEW.md),
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md)

Scope: implement the QMBT41 red/green plan for `ranger_roving`. Promote
`unit-feature.passive-speed-kind-grants` for the SRD Ranger Roving feature:
reuse the Fast Movement-shaped +10-foot Speed increase while not wearing Heavy
armor, then add represented Climb Speed and Swim Speed grants equal to
effective Speed. The implementation must derive movement and Dash from the
chosen effective Speed kind, handle switching speed kinds by subtracting
distance already moved, use authored mechanics shape parsing rather than
authored-id dispatch, and refresh deterministic admission/projection evidence
and matrix artifacts.

Out of scope: AC base calculation alternatives, Lay On Hands and other healing
pools, Temporary Hit Point resources, Breath Weapon attack replacement,
resistance traits, Weapon Mastery properties, spell admission, magic items,
and general movement feature families beyond Roving's authored passive Speed
increase plus Climb/Swim Speed grants.

Verification: RAW and `UBIQUITOUS_LANGUAGE.md` check for Roving, Speed,
special speeds, Climb Speed, Swim Speed, Dash, Heavy armor predicates, and the
distinction between Speed capacity and Movement spent; focused QNT proof for
the speed-kind grant profile; focused runtime parity with the mandatory timed
background MBT protocol if promoted battle behavior changes; `pnpm
unit-profile-coverage:check`; relevant package typecheck/tests; `pnpm
quality`; `/simplify` convergence, minimum two rounds.

### Task 140 - QMBT45 - Select Next SRD Feature Widening Slice After Roving

Status: `done`

Depends on: QMBT44

Blocks: QMBT46

Research / plan:
[QMBT45_RELENTLESS_ENDURANCE_FEATURE_WIDENING_SLICE_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT45_RELENTLESS_ENDURANCE_FEATURE_WIDENING_SLICE_PLAN.md),
[QMBT43_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT43_RECURSIVE_PLANNING_REVIEW.md),
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md)

Completed scope: selected `orc_relentless_endurance` as the next narrow SRD
feature-style widening slice after QMBT44 refreshed matrix pressure. The
decision keeps zero-Hit-Point replacement distinct from movement and special
Speed kinds, AC base calculation alternatives, healing pools, Temporary Hit
Points, resistance traits, attack replacement, and Weapon Mastery properties.

Out of scope: implementing the selected slice, selecting spell or magic-item
work, catalog cleanup unrelated to feature widening, and broad feature-family
widening.

Verification: RAW and `UBIQUITOUS_LANGUAGE.md` check completed for every
seriously considered candidate boundary; active-plan consistency updated across
Ralph index, DAG table, and task details; `/simplify` converged in two rounds.
MBT was not run because this was research-only and made no promoted
battle-runtime behavior change.

### Task 141 - QMBT46 - Recursive Unit Profile Planning Review

Status: `done`

Depends on: QMBT44-QMBT45

Blocks: QMBT47-QMBT49

Research / plan:
[QMBT46_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT46_RECURSIVE_PLANNING_REVIEW.md),
[QMBT45_RELENTLESS_ENDURANCE_FEATURE_WIDENING_SLICE_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT45_RELENTLESS_ENDURANCE_FEATURE_WIDENING_SLICE_PLAN.md),
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md)

Closeout: completed QMBT44-QMBT45 review, confirmed the matrix lane remains
incomplete at 27/45 supported executable Units, refreshed PRD status notes, and
appended QMBT47-QMBT49. The next implementation task is QMBT47, `Promote
Relentless Endurance Zero-Hit-Point Replacement`, followed by post-Relentless
Endurance SRD feature slice selection and another recursive planning review.

Out of scope: implementation work not captured by the new task batch.

Verification: active-plan consistency check across Ralph index, DAG table, and
task details; `pnpm unit-profile-coverage:check` if matrix docs or generated
artifacts change; `/simplify` convergence, minimum two rounds unless the final
changeset is trivial.

### Task 142 - QMBT47 - Promote Relentless Endurance Zero-Hit-Point Replacement

Status: `ready-for-implementation-after-light-research`

Depends on: QMBT45-QMBT46

Blocks: QMBT48-QMBT49

Research / plan:
[QMBT45_RELENTLESS_ENDURANCE_FEATURE_WIDENING_SLICE_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT45_RELENTLESS_ENDURANCE_FEATURE_WIDENING_SLICE_PLAN.md),
[QMBT46_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT46_RECURSIVE_PLANNING_REVIEW.md),
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md)

Scope: implement the QMBT45 red/green plan for `orc_relentless_endurance`.
Promote `unit-feature.zero-hit-point-replacement` for the SRD Orc Relentless
Endurance trait: when the creature is reduced to 0 Hit Points, is not killed
outright, has an unspent once-per-Long-Rest use, and chooses to use the trait,
replace the drop to 0 with 1 Hit Point instead. The implementation must use the
existing damage/drop-to-zero lifecycle and authored `triggered_replacement`
mechanics shape parsing rather than authored-id dispatch, and it must refresh
deterministic admission/projection evidence and matrix artifacts.

Out of scope: general death-prevention effects, Death Ward and other spells,
magic items, AC base calculation alternatives, Lay On Hands and other healing
pools, Temporary Hit Point resources, Breath Weapon attack replacement,
resistance traits, Weapon Mastery properties, and broad zero-Hit-Point feature
families.

Verification: RAW and `UBIQUITOUS_LANGUAGE.md` check for Relentless Endurance,
Hit Points, Dropping to 0 Hit Points, Instant Death, Death Saving Throws,
Unconscious, Long Rest reset, and the distinction between zero-HP replacement
and healing; focused QNT proof for the new zero-HP replacement feature profile;
focused runtime parity with the mandatory timed background MBT protocol if
promoted battle behavior changes; `pnpm unit-profile-coverage:check`; relevant
package typecheck/tests; `pnpm quality`; `/simplify` convergence, minimum two
rounds.

### Task 143 - QMBT48 - Select Next SRD Feature Widening Slice After Relentless Endurance

Status: `ready-for-research`

Depends on: QMBT47

Blocks: QMBT49

Research / plan:
[QMBT46_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT46_RECURSIVE_PLANNING_REVIEW.md),
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md)

Scope: after QMBT47 refreshes matrix pressure, select the next narrow SRD
feature-style widening slice. Candidate lanes must stay domain-distinct:
AC base formulas, healing pools, Temporary Hit Points, resistance traits,
attack replacement, Weapon Mastery properties, spell admission, and magic-item
intake should not be mixed into one slice.

Out of scope: implementing the selected slice, selecting spell or magic-item
work unless the review explicitly changes lane ownership, catalog cleanup
unrelated to feature widening, and broad feature-family widening.

Verification: RAW and `UBIQUITOUS_LANGUAGE.md` check for every seriously
considered candidate boundary; active-plan consistency across Ralph index, DAG
table, and task details; `/simplify` convergence, minimum two rounds. MBT is
not required for this research-only task.

### Task 144 - QMBT49 - Recursive Unit Profile Planning Review

Status: `ready-for-research`

Depends on: QMBT47-QMBT48

Blocks: QMBT50+

Research / plan:
[ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md),
[QMBT46_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT46_RECURSIVE_PLANNING_REVIEW.md)

Scope: review QMBT47-QMBT48 findings, update the PRD and plan docs, and append
the next implementation/research batch. This task must include a new recursive
planning-review task at the end of the appended batch unless the Unit profile
matrix lane is explicitly declared complete.

Out of scope: implementation work not captured by the new task batch.

Verification: active-plan consistency check across Ralph index, DAG table, and
task details; `pnpm unit-profile-coverage:check` if matrix docs or generated
artifacts change; `/simplify` convergence, minimum two rounds unless the final
changeset is trivial.
