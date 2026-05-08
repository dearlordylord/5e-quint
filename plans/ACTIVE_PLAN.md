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
      "number": 160,
      "id": "QMBT65",
      "status": "done",
      "title": "Promote Cutting Words Ability Check Reaction Reduction"
    },
    {
      "number": 161,
      "id": "QMBT66",
      "status": "done",
      "title": "Recursive Unit Profile Planning Review"
    },
    {
      "number": 162,
      "id": "QMBT67",
      "status": "done",
      "title": "Project Bardic Inspiration Reaction Reduction Facts"
    },
    {
      "number": 163,
      "id": "QMBT68",
      "status": "done",
      "title": "Project Monk Deflect Attacks Redirect Facts"
    },
    {
      "number": 164,
      "id": "QMBT69",
      "status": "deferred",
      "title": "Recursive Unit Profile Planning Review"
    },
    {
      "number": 165,
      "id": "SRDINV1",
      "status": "done",
      "title": "Classify Installed Level-1 Owner Evidence"
    },
    {
      "number": 166,
      "id": "SRDINV1A",
      "status": "done",
      "title": "Derive SRDINV1 Owner Evidence From Durable Sources"
    },
    {
      "number": 167,
      "id": "SRDINV1B",
      "status": "done",
      "title": "Create Character-Creation Owner Evidence Manifest"
    },
    {
      "number": 168,
      "id": "SRDINV2",
      "status": "done",
      "title": "Author Missing Level-1 Class Containers"
    },
    {
      "number": 169,
      "id": "SRDINV3",
      "status": "done",
      "title": "Classify Missing Level-1 Class Feature Rows"
    },
    {
      "number": 170,
      "id": "SRDINV4",
      "status": "done",
      "title": "Classify Level-1 Character Creation Rows"
    },
    {
      "number": 171,
      "id": "SRDINV5A",
      "status": "done",
      "title": "Classify Level-1 Spell Access Rows"
    },
    {
      "number": 172,
      "id": "SRDINV5B",
      "status": "done",
      "title": "Classify Missing Cantrip and Level-1 Spell Units"
    },
    {
      "number": 173,
      "id": "SRDINV5C",
      "status": "done",
      "title": "Classify Installed Cantrip and Level-1 Spell Units"
    },
    {
      "number": 174,
      "id": "SRDINV5D",
      "status": "done",
      "title": "Review Catalog-Only Cantrip and Level-1 Spell Units"
    },
    {
      "number": 175,
      "id": "SRDINV6",
      "status": "done",
      "title": "Review Catalog-Only and Surface-Widening Rows"
    },
    {
      "number": 176,
      "id": "SRDINV7",
      "status": "done",
      "title": "Recursive SRD Inventory Planning Review"
    },
    {
      "number": 177,
      "id": "SRDINV8",
      "status": "done",
      "title": "Widen Class Container Proficiency Surface Facts"
    },
    {
      "number": 178,
      "id": "SRDINV9",
      "status": "done",
      "title": "Widen Non-Wizard Spell Access Surface Facts"
    },
    {
      "number": 179,
      "id": "SRDINV10",
      "status": "done",
      "title": "Widen Level-1 Class Feature Surface Mechanics"
    },
    {
      "number": 180,
      "id": "SRDINV11",
      "status": "done",
      "title": "Recursive SRD Inventory Planning Review"
    },
    {
      "number": 181,
      "id": "SRDINV12",
      "status": "done",
      "title": "Author Expressible Level-1 Class Containers"
    },
    {
      "number": 182,
      "id": "SRDINV13",
      "status": "done",
      "title": "Author Expressible Level-1 Spell Access Records"
    },
    {
      "number": 183,
      "id": "SRDINV14",
      "status": "done",
      "title": "Author Expressible Level-1 Class Feature Records"
    },
    {
      "number": 184,
      "id": "SRDINV15",
      "status": "done",
      "title": "Author Level-1 Weapon Mastery Records"
    },
    {
      "number": 185,
      "id": "SRDINV16",
      "status": "done",
      "title": "Recursive SRD Inventory Planning Review"
    },
    {
      "number": 186,
      "id": "SRDINV17",
      "status": "done",
      "title": "Close Character-Creation Class Container Evidence"
    },
    {
      "number": 187,
      "id": "SRDINV18",
      "status": "done",
      "title": "Close Character-Creation Class Feature Evidence"
    },
    {
      "number": 188,
      "id": "SRDINV19",
      "status": "done",
      "title": "Close Character-Creation Spell Access Evidence"
    },
    {
      "number": 189,
      "id": "SRDINV20",
      "status": "done",
      "title": "Close Character-Creation Weapon Mastery Evidence"
    },
    {
      "number": 190,
      "id": "SRDINV21",
      "status": "ready-for-research",
      "title": "Recursive SRD Inventory Planning Review"
    },
    {
      "number": 191,
      "id": "SRDINV18A",
      "status": "done",
      "title": "Close Eldritch Invocation Choice Evidence"
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
| 160   | QMBT65 - Promote Cutting Words Ability Check Reaction Reduction | done | none | QMBT66 | [Unit profile coverage report](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md), [SRD Bard](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Bard.md), [SRD Playing the Game](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md), [SRD Rules Glossary](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Completed `bard_cutting_words` Ability Check reduction as part of `unit-feature.reaction-roll-or-damage-reduction`, with authored mechanics admission, caller-supplied already-successful Ability Check facts, Reaction and Bardic Inspiration spend, QNT proof coverage, focused runtime parity, deterministic admission evidence, and refreshed matrix artifacts. |
| 161   | QMBT66 - Recursive Unit Profile Planning Review | done | QMBT65 | QMBT67 | [QMBT66 review](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT66_RECURSIVE_PLANNING_REVIEW.md), [Unit profile coverage report](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md), [ACTIVE_PLAN](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md) | Completed recursive planning review, kept the matrix lane open, refreshed PRD status, and appended the QMBT67-QMBT69 projection-cleanup batch. |
| 162   | QMBT67 - Project Bardic Inspiration Reaction Reduction Facts | done | QMBT66 | QMBT68 | [QMBT66 review](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT66_RECURSIVE_PLANNING_REVIEW.md), [Surface README](/workspace/typescript/dnd/packages/surface/README.md), [battle reducer](/workspace/typescript/dnd/packages/battle-runtime/src/battle-reducer.ts), [unit feature support](/workspace/typescript/dnd/packages/battle-runtime/src/unit-feature-support.ts), [SRD Bard](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Bard.md), [SRD Playing the Game](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md), [SRD Rules Glossary](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Move Bardic Inspiration reaction-reduction resource cost and die expression facts into supported profile projection data so generic reaction reducers no longer derive Bard class die thresholds for Cutting Words attack-roll, Ability Check, or damage-roll reduction. |
| 163   | QMBT68 - Project Monk Deflect Attacks Redirect Facts | done | QMBT67 | QMBT69 | [QMBT66 review](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT66_RECURSIVE_PLANNING_REVIEW.md), [Surface README](/workspace/typescript/dnd/packages/surface/README.md), [battle reducer](/workspace/typescript/dnd/packages/battle-runtime/src/battle-reducer.ts), [unit feature support](/workspace/typescript/dnd/packages/battle-runtime/src/unit-feature-support.ts), [SRD Monk](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Monk.md), [SRD Playing the Game](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md), [SRD Rules Glossary](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Completed Deflect Attacks redirect projection cleanup: Surface authors redirect facts, support projection emits executable cost/save/damage/target/damage-type facts, and reducers consume those facts without Monk-specific formula derivation. |
| 164   | QMBT69 - Recursive Unit Profile Planning Review | deferred | QMBT68 | none | [QMBT66 review](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT66_RECURSIVE_PLANNING_REVIEW.md), [Unit profile coverage report](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md), [ACTIVE_PLAN](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md) | Still parked by the SRD inventory frontier instruction; QMBT68 is complete, but the older QMBT queue remains deferred until that frontier resumes it. |
| 165   | SRDINV1 - Classify Installed Level-1 Owner Evidence | done | none | SRDINV1A | [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [SRD inventory Ralph batch plan](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md), [SRD Classes](/workspace/typescript/dnd/.references/srd-5.2.1/Classes), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Completed installed level-1 owner-evidence classification, but follow-up must remove private evidence constants before downstream SRDINV work proceeds. |
| 166   | SRDINV1A - Derive SRDINV1 Owner Evidence From Durable Sources | done | SRDINV1 | SRDINV1B, SRDINV2-SRDINV7 | [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [SRD inventory Ralph batch plan](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md), [Unit profile evidence](/workspace/typescript/dnd/plans/unit-profile-coverage/unit-evidence.jsonl), [Unit profile claims](/workspace/typescript/dnd/plans/unit-profile-coverage/unit-claims.jsonl), [character-creation-runtime tests](/workspace/typescript/dnd/packages/character-creation-runtime/src/index.test.ts) | Completed durable evidence-source derivation: battle-runtime owner evidence now comes from Unit matrix artifacts, character-creation rows without a row-level manifest remain evidence-required, and private evidence-present allowlists were removed. |
| 167   | SRDINV1B - Create Character-Creation Owner Evidence Manifest | done | SRDINV1A | SRDINV4 | [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [SRD inventory Ralph batch plan](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md), [character-creation-runtime tests](/workspace/typescript/dnd/packages/character-creation-runtime/src/index.test.ts), [character-creation-runtime README](/workspace/typescript/dnd/packages/character-creation-runtime/README.md), [character-creation owner evidence](/workspace/typescript/dnd/plans/unit-profile-coverage/character-creation-owner-evidence.json) | Completed checker-readable character-creation owner-evidence manifest and inventory wiring; covered Fighter/Wizard support-profile rows now derive owner-evidence-present from manifest entries, while absent rows remain owner-evidence-required. |
| 168   | SRDINV2 - Author Missing Level-1 Class Containers | done | SRDINV1A | SRDINV7 | [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [SRD inventory Ralph batch plan](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md) | Completed missing class-container closure: Barbarian and Warlock are authored and installed; Fighter/Wizard now carry primary ability source facts; the other eight class containers are explicit named Surface-widening closures in the generated inventory. |
| 169   | SRDINV3 - Classify Missing Level-1 Class Feature Rows | done | SRDINV1A | SRDINV7 | [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [SRD inventory Ralph batch plan](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md) | Completed missing level-1 class-feature classification: all 11 rows now carry named Surface-widening blockers in the generated inventory, reducing SRDINV3 generated row count to zero and moving those rows into SRDINV6. |
| 170   | SRDINV4 - Classify Level-1 Character Creation Rows | done | SRDINV1A, SRDINV1B | SRDINV7 | [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [SRD inventory Ralph batch plan](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md), [character-creation owner evidence](/workspace/typescript/dnd/plans/unit-profile-coverage/character-creation-owner-evidence.json) | Completed level-1 character-creation classification: generated inventory now marks class-container-owned source facts and non-runtime table summaries, and SRDINV4 rows steer class-owned facts toward class-container work rather than standalone records. |
| 171   | SRDINV5A - Classify Level-1 Spell Access Rows | done | SRDINV1A | SRDINV7 | [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [SRD inventory Ralph batch plan](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md) | Completed level-1 spell-access classification: six non-Wizard Spellcasting rows now carry named Surface-widening blockers, Wizard Spellcasting remains covered by character-creation owner evidence, and individual Spell Unit pressure stays in SRDINV5B-SRDINV5D. |
| 172   | SRDINV5B - Classify Missing Cantrip and Level-1 Spell Units | done | SRDINV1A | SRDINV7 | [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [SRD inventory Ralph batch plan](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md) | Completed missing cantrip and level-1 Spell Unit classification: missing Spell Definition Unit ids now have explicit authoring-ready, Surface-widening, or catalog-only/dead-for-now outcomes; remaining authoring-ready detect rows stay visible in generated inventory for later authoring work. |
| 173   | SRDINV5C - Classify Installed Cantrip and Level-1 Spell Units | done | SRDINV1A | SRDINV7 | [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [SRD inventory Ralph batch plan](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md) | Completed installed cantrip and level-1 Spell Unit classification: supported installed spell rows derive owner evidence from Unit matrix claims plus deterministic admission/projection evidence; unsupported Sleep rows remain evidence-required; Fire Bolt and Thunderwave rows carry Surface/runtime blockers; Detect Magic and Light close as catalog-only/dead-for-now. |
| 174   | SRDINV5D - Review Catalog-Only Cantrip and Level-1 Spell Units | done | SRDINV1A | SRDINV7 | [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [SRD inventory Ralph batch plan](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md) | Completed catalog-only spell-pressure review: the 151-row denominator now splits into 74 explicit catalog-only/dead-for-now closures and 77 authored executable follow-up rows across six named spell runtime batches. |
| 175   | SRDINV6 - Review Catalog-Only and Surface-Widening Rows | done | SRDINV1A | SRDINV7 | [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [SRD inventory Ralph batch plan](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md) | Completed catalog-only and Surface-widening review: the SRDINV6 denominator remains 62 rows, with 4 explicit nonspell catalog-only/dead-for-now closures and 58 rows that name concrete Surface-widening blockers for SRDINV7/SRDINV8. |
| 176   | SRDINV7 - Recursive SRD Inventory Planning Review | done | SRDINV2-SRDINV5D, SRDINV6 | SRDINV8-SRDINV11 | [SRDINV7 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV7_RECURSIVE_PLANNING_REVIEW.md), [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [SRD inventory Ralph batch plan](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md), [ACTIVE_PLAN](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md) | Completed recursive planning review: level-1 remains open, so the next batch is three concrete Surface-widening families plus SRDINV11 review. |
| 177   | SRDINV8 - Widen Class Container Proficiency Surface Facts | done | SRDINV7 | SRDINV11 | [SRDINV7 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV7_RECURSIVE_PLANNING_REVIEW.md), [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [Surface README](/workspace/typescript/dnd/packages/surface/README.md), [SRD Classes](/workspace/typescript/dnd/.references/srd-5.2.1/Classes) | Completed Surface class-container source-fact widening for Bard/Druid tool choices, Monk/Rogue property-filtered Martial weapon and tool proficiencies, and Ranger fixed-plus-choice multiclass proficiencies. |
| 178   | SRDINV9 - Widen Non-Wizard Spell Access Surface Facts | done | SRDINV7 | SRDINV10, SRDINV11 | [SRDINV7 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV7_RECURSIVE_PLANNING_REVIEW.md), [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [Surface README](/workspace/typescript/dnd/packages/surface/README.md), [SRD Classes](/workspace/typescript/dnd/.references/srd-5.2.1/Classes) | Completed Surface Spell Access widening for non-Wizard list-prepared casters, prepared half casters without level-1 cantrips, and the shared Warlock Pact Magic/Pact Slot source shape consumed by SRDINV10. |
| 179   | SRDINV10 - Widen Level-1 Class Feature Surface Mechanics | done | SRDINV7, SRDINV9 | SRDINV11 | [SRDINV7 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV7_RECURSIVE_PLANNING_REVIEW.md), [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [Surface README](/workspace/typescript/dnd/packages/surface/README.md), [SRD Classes](/workspace/typescript/dnd/.references/srd-5.2.1/Classes) | Completed Surface class-feature mechanics widening for the SRDINV3/SRDINV6 level-1 blockers without adding parallel Pact Magic source state. |
| 180   | SRDINV11 - Recursive SRD Inventory Planning Review | done | SRDINV8-SRDINV10 | SRDINV12-SRDINV16 | [SRDINV11 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV11_RECURSIVE_PLANNING_REVIEW.md), [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [SRD inventory Ralph batch plan](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md), [ACTIVE_PLAN](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md) | Completed recursive planning review: level-1 remains open with zero level-1 Surface-widening rows, so the next batch is expressible level-1 authoring plus SRDINV16 review. |
| 181   | SRDINV12 - Author Expressible Level-1 Class Containers | done | SRDINV11 | SRDINV13-SRDINV16 | [SRDINV11 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV11_RECURSIVE_PLANNING_REVIEW.md), [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [Surface README](/workspace/typescript/dnd/packages/surface/README.md), [SRD Classes](/workspace/typescript/dnd/.references/srd-5.2.1/Classes), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Completed Bard, Cleric, Druid, Monk, Paladin, Ranger, Rogue, and Sorcerer class container records from SRD source facts without creating standalone records for class-owned creation rows. |
| 182   | SRDINV13 - Author Expressible Level-1 Spell Access Records | done | SRDINV12 | SRDINV16 | [SRDINV11 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV11_RECURSIVE_PLANNING_REVIEW.md), [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [Surface README](/workspace/typescript/dnd/packages/surface/README.md), [SRD Classes](/workspace/typescript/dnd/.references/srd-5.2.1/Classes), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Completed Bard, Cleric, Druid, Paladin, Ranger, and Sorcerer level-1 Spellcasting access records with class-list preparation, slot, focus, and replacement source facts; individual Spell Definitions remain outside this authoring task. |
| 183   | SRDINV14 - Author Expressible Level-1 Class Feature Records | done | SRDINV12 | SRDINV16 | [SRDINV11 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV11_RECURSIVE_PLANNING_REVIEW.md), [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [Surface README](/workspace/typescript/dnd/packages/surface/README.md), [SRD Classes](/workspace/typescript/dnd/.references/srd-5.2.1/Classes), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Completed Bardic Inspiration, Divine Order, Druidic, Primal Order, Martial Arts, Favored Enemy, Expertise, Thieves' Cant, Innate Sorcery, and Eldritch Invocations records using widened class-feature mechanics. |
| 184   | SRDINV15 - Author Level-1 Weapon Mastery Records | done | SRDINV12 | SRDINV16 | [SRDINV11 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV11_RECURSIVE_PLANNING_REVIEW.md), [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [Surface README](/workspace/typescript/dnd/packages/surface/README.md), [SRD Classes](/workspace/typescript/dnd/.references/srd-5.2.1/Classes), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Completed Barbarian, Paladin, Ranger, and Rogue Weapon Mastery records as character-sheet choice facts; mastery property runtime behavior remains separate. |
| 185   | SRDINV16 - Recursive SRD Inventory Planning Review | done | SRDINV12-SRDINV15 | SRDINV17-SRDINV21 | [SRDINV16 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV16_RECURSIVE_PLANNING_REVIEW.md), [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [SRD inventory Ralph batch plan](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md), [ACTIVE_PLAN](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md) | Completed recursive planning review: level-1 remains open with 121 owner-evidence-required rows, so the next batch is character-creation owner-evidence closure plus SRDINV21 review. |
| 186   | SRDINV17 - Close Character-Creation Class Container Evidence | done | SRDINV16 | SRDINV18-SRDINV21 | [SRDINV16 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV16_RECURSIVE_PLANNING_REVIEW.md), [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [SRD inventory Ralph batch plan](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md), [character-creation owner evidence](/workspace/typescript/dnd/plans/unit-profile-coverage/character-creation-owner-evidence.json), [character-creation runtime README](/workspace/typescript/dnd/packages/character-creation-runtime/README.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Completed character-creation owner evidence for authored class containers, core traits, starting equipment, and multiclass-entry facts without creating standalone duplicate records. |
| 187   | SRDINV18 - Close Character-Creation Class Feature Evidence | done | SRDINV17 | SRDINV18A, SRDINV21 | [SRDINV16 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV16_RECURSIVE_PLANNING_REVIEW.md), [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [SRD inventory Ralph batch plan](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md), [character-creation owner evidence](/workspace/typescript/dnd/plans/unit-profile-coverage/character-creation-owner-evidence.json), [character-creation runtime README](/workspace/typescript/dnd/packages/character-creation-runtime/README.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Completed character-creation owner evidence for retained level-1 class-feature refs and implemented supported acquisition choices for Divine Order, Primal Order, and Rogue Expertise. Eldritch Invocation feature-choice evidence remains split into SRDINV18A because retained feature refs cannot prove invocation option discovery/fill/finalization. |
| 188   | SRDINV19 - Close Character-Creation Spell Access Evidence | done | SRDINV17 | SRDINV21 | [SRDINV16 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV16_RECURSIVE_PLANNING_REVIEW.md), [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [SRD inventory Ralph batch plan](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md), [character-creation owner evidence](/workspace/typescript/dnd/plans/unit-profile-coverage/character-creation-owner-evidence.json), [character-creation runtime README](/workspace/typescript/dnd/packages/character-creation-runtime/README.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Completed character-creation owner evidence for Bard, Cleric, Druid, Paladin, Ranger, and Sorcerer level-1 Spell Access through discovery, fill admission, finalization, build projection, and manifest evidence without admitting individual Spell Definitions as runtime-supported. |
| 189   | SRDINV20 - Close Character-Creation Weapon Mastery Evidence | done | SRDINV17 | SRDINV21 | [SRDINV16 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV16_RECURSIVE_PLANNING_REVIEW.md), [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [SRD inventory Ralph batch plan](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md), [character-creation owner evidence](/workspace/typescript/dnd/plans/unit-profile-coverage/character-creation-owner-evidence.json), [character-creation runtime README](/workspace/typescript/dnd/packages/character-creation-runtime/README.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Completed character-creation owner evidence for Barbarian, Paladin, Ranger, and Rogue level-1 Weapon Mastery choices through discovery, fill, finalization, build projection, and manifest evidence while leaving mastery property execution separate. |
| 190   | SRDINV21 - Recursive SRD Inventory Planning Review | ready-for-research | SRDINV17-SRDINV20, SRDINV18A | none | [SRDINV16 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV16_RECURSIVE_PLANNING_REVIEW.md), [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [SRD inventory Ralph batch plan](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md), [ACTIVE_PLAN](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md) | Review SRDINV17-SRDINV20 plus SRDINV18A owner-evidence closure, refresh inventory metrics, and append the next concrete batch unless level-1 inventory is explicitly complete. |
| 191   | SRDINV18A - Close Eldritch Invocation Choice Evidence | done | SRDINV18 | SRDINV21 | [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [character-creation owner evidence](/workspace/typescript/dnd/plans/unit-profile-coverage/character-creation-owner-evidence.json), [Warlock SRD](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Warlock.md), [character-creation runtime README](/workspace/typescript/dnd/packages/character-creation-runtime/README.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Close Warlock Eldritch Invocations as actual feature-choice evidence by adding a durable invocation option catalog/discovery path and character-creation fill, finalization, build projection, manifest, and inventory evidence without treating the retained feature Unit ref as sufficient. |

## Task Details

Older task details were removed from this active queue after closeout. Use git history and the linked task-specific plan files for archived closeout detail.

### Task 160 - QMBT65 - Promote Cutting Words Ability Check Reaction Reduction

Status: `done`

Depends on: none

Blocks: QMBT66

Research / plan:
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md),
[Bard.md](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Bard.md),
[Playing-the-Game.md](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md),
[Rules-Glossary.md](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: implement the Cutting Words red/green plan for `bard_cutting_words` only.
Promote the missing Ability Check branch of
`unit-feature.reaction-roll-or-damage-reduction` by adding an already-rolled
successful Ability Check outcome boundary, parsing the existing Surface
`reaction_roll_or_damage_reduction` mechanics shape for
`ability_check_reduction`, and threading the existing Bardic Inspiration pool
and die-size derivation so resolving the reaction spends one Reaction and one
Bardic Inspiration use.

Out of scope: a Cutting Words-only profile, duplicate Bardic Inspiration
resource state, generic D20 Test reaction reduction, GM ability-check decision
logic, DC calculation, proficiency calculation, Lay On Hands, Tireless, AC base
formulas, resistance traits, Breath Weapon, Weapon Mastery, spells, magic
items, content cleanup, checker metric changes, and class catalog backlog
planning.

Verification: RAW check for Bardic Inspiration, Cutting Words, Ability Checks,
D20 Tests, Difficulty Class, Reactions, and Bardic Inspiration rest recovery;
`UBIQUITOUS_LANGUAGE.md` check for Ability Check, D20 Test, Difficulty Class,
Reaction, Pool, Spend, Proficiency Bonus, Attack Roll, and any boundary terms
added by the implementation; focused QNT proof for the added Ability Check
reduction branch; focused runtime tests for converted-success-to-failure and
still-successful reduction behavior; focused runtime tests that malformed
Ability Check reduction shapes remain unsupported; Tier 1 battle-runtime MBT
with the mandatory timed background protocol if promoted battle-runtime
reaction behavior changes; `pnpm unit-profile-coverage:check`; relevant
package typecheck/tests; `pnpm quality`; `/simplify` convergence, minimum two
rounds.

Completed scope: promoted `bard_cutting_words` Ability Check reaction
reduction through the existing
`unit-feature.reaction-roll-or-damage-reduction` profile. The runtime now
accepts caller-supplied already-successful Ability Check facts, verifies the
Bard can see the creature and receives the required within-60-feet spatial
fact, spends Reaction and the existing Bardic Inspiration pool, and reports
whether the reduced total still succeeds.

Out of scope honored: no Cutting Words-only profile, duplicate Bardic
Inspiration pool, generic D20 Test modifier, DC/proficiency calculation, class
catalog work, spell work, or checker metric changes were introduced.

Verification completed: RAW/source review checked `.references/srd-5.2.1`
`Classes/Bard.md`, `Playing-the-Game.md`, `Rules-Glossary.md`, and
`UBIQUITOUS_LANGUAGE.md`; focused QNT Cutting Words tests passed; focused
runtime tests and deterministic admission tests passed; package typecheck
passed; matrix artifacts were regenerated and
`pnpm unit-profile-coverage:check` passed; `pnpm quality` passed; Tier 1
battle-runtime MBT passed with timed single-run protocol; `/simplify`
convergence is recorded in this closeout.

`/simplify` round 1: kept Ability Check reduction on the existing reaction
profile and shared Bardic Inspiration resource instead of adding a
Cutting Words-specific support profile or pool.

`/simplify` round 2: no important changes found; the boundary remains limited
to successful Ability Checks and does not absorb Tactical Mind, Bardic
Inspiration grant/use, D20 Test-wide roll modification, or GM check/DC
selection.

### Task 161 - QMBT66 - Recursive Unit Profile Planning Review

Status: `done`

Depends on: QMBT65

Blocks: QMBT67

Research / plan:
[QMBT66_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT66_RECURSIVE_PLANNING_REVIEW.md),
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md),
[ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md)

Scope: review QMBT65 findings, update the PRD and plan docs, classify what the
previous Cutting Words/Reaction work taught the project, and append the largest
coherent next batch whose tasks are similar enough to run without re-planning
between each item. The recursive review is a batch-planning checkpoint, not a
one-task queue maintainer. It should append multiple implementation/research
tasks when the reviewed findings establish a repeatable pattern, for example a
Reaction-reduction family, healing/resource family, AC/base-formula family,
Weapon Mastery family, or other matrix-visible cluster. A single-task batch is
acceptable only when QMBT65 exposes a new boundary, unresolved Surface shape,
or runtime/QNT uncertainty that makes further batching speculative; if that
happens, the QMBT66 artifact must say why. This task must include a new
recursive planning-review task at the end of the appended batch unless the Unit
profile matrix lane is explicitly declared complete.

Out of scope: implementation work not captured by the new task batch.

Verification: RAW/source review for QMBT65 findings and any appended rule
slices; active-plan consistency check across Ralph index, DAG table, and task
details; `pnpm unit-profile-coverage:check` if matrix docs or generated
artifacts change; `/simplify` convergence, minimum two rounds unless the final
changeset is trivial.

Completed scope: reviewed QMBT65 findings, kept the Unit profile matrix lane
open, refreshed the PRD status notes, and selected a projection-cleanup batch
for already-supported SRD profiles before the next widening family. The batch
is QMBT67 Bardic Inspiration reaction-reduction projection facts, QMBT68 Monk
Deflect Attacks redirect projection facts, and QMBT69 recursive review.

Out of scope honored: no runtime behavior, matrix evidence, generated artifacts,
AC formula support, healing-pool support, resistance support, Breath Weapon,
Weapon Mastery, spell intake, magic-item intake, or content cleanup was
implemented in this planning task.

Verification completed: RAW/source review checked `.references/srd-5.2.1`
`Classes/Bard.md`, `Classes/Monk.md`, `Playing-the-Game.md`,
`Rules-Glossary.md`, and `UBIQUITOUS_LANGUAGE.md`; active-plan consistency was
checked across the Ralph task index, DAG table, and task details; PRD status
notes were refreshed; `/simplify` convergence is recorded in the QMBT66 review
artifact. `pnpm unit-profile-coverage:check` was not run because generated
matrix artifacts did not change. MBT was not run because QMBT66 is
planning-only.

### Task 162 - QMBT67 - Project Bardic Inspiration Reaction Reduction Facts

Status: `done`

Depends on: QMBT66

Blocks: QMBT68

Research / plan:
[QMBT66_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT66_RECURSIVE_PLANNING_REVIEW.md),
[Surface README](/workspace/typescript/dnd/packages/surface/README.md),
[battle-reducer.ts](/workspace/typescript/dnd/packages/battle-runtime/src/battle-reducer.ts),
[unit-feature-support.ts](/workspace/typescript/dnd/packages/battle-runtime/src/unit-feature-support.ts),
[Bard.md](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Bard.md),
[Playing-the-Game.md](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md),
[Rules-Glossary.md](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: move Bardic Inspiration reaction-reduction executable facts out of
generic reducer derivation and into supported profile projection data. The
runtime should parse/project the resource cost and reduction die expression for
the existing Cutting Words attack-roll, Ability Check, and damage-roll
reduction branches, then reducers should consume those projected facts without
deriving Bard class die thresholds or hard-coding Bardic Inspiration die
validation text as generic reaction behavior.

Out of scope: changing RAW behavior, widening unrelated Unit profiles, changing
the existing Bardic Inspiration pool, adding a Cutting Words-only profile,
generic D20 Test reaction reduction, Monk Focus or Martial Arts projection, AC
formula support, healing/resource pool widening, resistance traits, Breath
Weapon, Weapon Mastery, spells, magic items, content cleanup, or checker metric
changes.

Verification: RAW/source review for Bardic Inspiration, Font of Inspiration,
Cutting Words, Ability Checks, D20 Tests, Difficulty Class, Reactions, Attack
Rolls, and Damage Rolls; `UBIQUITOUS_LANGUAGE.md` check for Ability Check,
Attack Roll, Damage Roll, Difficulty Class, Reaction, Pool, Spend, and
projection terms introduced by the implementation; focused runtime tests
proving the same attack-roll, Ability Check, and damage-roll reduction behavior
through projected facts; focused admission/projection tests that malformed
Bardic Inspiration projection facts remain unsupported; package-local
typecheck/tests; `pnpm unit-profile-coverage:check` if profile artifacts
change; battle-runtime MBT only if promoted battle behavior changes; `pnpm
quality` if the task changes production behavior; `/simplify` convergence,
minimum two rounds.

### Task 163 - QMBT68 - Project Monk Deflect Attacks Redirect Facts

Status: `done`

Depends on: QMBT67

Blocks: QMBT69

Research / plan:
[QMBT66_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT66_RECURSIVE_PLANNING_REVIEW.md),
[Surface README](/workspace/typescript/dnd/packages/surface/README.md),
[battle-reducer.ts](/workspace/typescript/dnd/packages/battle-runtime/src/battle-reducer.ts),
[unit-feature-support.ts](/workspace/typescript/dnd/packages/battle-runtime/src/unit-feature-support.ts),
[Monk.md](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Monk.md),
[Playing-the-Game.md](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md),
[Rules-Glossary.md](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Completed scope: moved Deflect Attacks redirect executable facts out of generic
reducer derivation and into authored Surface/support projection data. Surface
now authors redirect resource cost, Dexterity save ability, Monk Focus save DC
formula, Martial Arts die expression, Dexterity damage ability, attack-kind
target gate facts, and same-damage-type projection for
`monk_deflect_attacks`; the support profile projects executable resource spend,
fixed save DC, concrete damage dice, target gate, and inherited damage-type
facts for `unit-feature.attack-damage-reduction-zero-damage-redirect`. Reducers
consume those projected facts without deriving Focus Point cost, Martial Arts
die scaling, or Monk Focus save DC from class identity.

Out of scope: changing RAW behavior, widening unrelated Unit profiles, changing
authored Unit ids, changing the existing Deflect Attacks reaction/redirect
timing, changing ordinary attack-damage reduction, Bardic Inspiration
projection, AC formula support, healing/resource pool widening, resistance
traits, Breath Weapon, Weapon Mastery, spells, magic items, content cleanup, or
checker metric changes.

Verification: RAW/source review for Deflect Attacks, Monk's Focus, Martial
Arts, Damage Rolls, Saving Throws, Difficulty Class, Reactions, Focus Point
spend, and Short/Long Rest recovery; `UBIQUITOUS_LANGUAGE.md` check for Pool,
Spend, Damage Roll, Saving Throw, Difficulty Class, Reaction, Damage Type, and
projection terms introduced by the implementation; focused runtime tests
proving the same zero-damage redirect behavior through projected facts; focused
admission/projection tests that malformed redirect projection facts remain
unsupported; package-local typecheck/tests; `pnpm unit-profile-coverage:check`
if profile artifacts change; battle-runtime MBT only if promoted battle
behavior changes; `pnpm quality` if the task changes production behavior;
`/simplify` convergence, minimum two rounds.

Verification completed: RAW/source review checked `.references/srd-5.2.1`
`Classes/Monk.md`, `Playing-the-Game.md`, `Rules-Glossary.md`, and
`UBIQUITOUS_LANGUAGE.md`; focused admission tests passed; focused Deflect
Attacks and Cutting Words runtime tests passed;
`pnpm unit-profile-coverage:check` passed; `pnpm quality` passed.
Battle-runtime MBT was not rerun in the decider because focused and quality
verification passed and the accepted implementation/review had already recorded
a passing Tier 1 run.

`/simplify` round 1: kept SRD terms in authored Surface where they are source
mechanic facts, and projected reducer-facing executable facts instead of
retaining Monk-specific reducer formulas.

`/simplify` round 2: no important changes found; the remaining coupling is
localized in the Deflect Attacks projection parser and literal schema, while
the reducer consumes narrowed profile facts.

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

### Task 165 - SRDINV1 - Classify Installed Level-1 Owner Evidence

Status: `done`

Depends on: none

Blocks: SRDINV1A

Research / plan:
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[SRDINV_RALPH_BATCH_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md),
[Classes](/workspace/typescript/dnd/.references/srd-5.2.1/Classes),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: review the generated `SRDINV1` batch. For each installed level-1 SRD
inventory row currently marked `catalog-installed-needs-owner-evidence`,
classify the operational owner and evidence requirement, or explicitly close
the row as catalog-only/dead-for-now. Do not implement runtime behavior in this
task unless it is needed to make the owner/evidence classification executable.

Closeout: generated SRD inventory now distinguishes installed level-1 rows with
operational owner evidence present, owner evidence still required, and explicit
catalog-only/dead-for-now closure. SRDINV2-SRDINV6/SRDINV5D are unblocked for
their narrower follow-up classification and authoring tasks.

Follow-up required: SRDINV1A must replace private generator constants with
durable evidence sources before downstream SRDINV work proceeds.

Out of scope: PHB/XPHB pressure, QMBT expansion, battle-runtime behavior
changes, authoring missing class containers, and one task per Unit.

Verification: read relevant local SRD class files and check
`UBIQUITOUS_LANGUAGE.md`; active-plan consistency; regenerated SRD inventory
if semantics change; `pnpm unit-profile-coverage:check`; `/simplify`
convergence, minimum two rounds unless the final changeset is trivial. MBT is
not required for inventory planning.

### Task 166 - SRDINV1A - Derive SRDINV1 Owner Evidence From Durable Sources

Status: `done`

Depends on: SRDINV1

Blocks: SRDINV1B, SRDINV2-SRDINV7

Research / plan:
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[SRDINV_RALPH_BATCH_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md),
[unit-evidence.jsonl](/workspace/typescript/dnd/plans/unit-profile-coverage/unit-evidence.jsonl),
[unit-claims.jsonl](/workspace/typescript/dnd/plans/unit-profile-coverage/unit-claims.jsonl),
[character-creation-runtime index.test.ts](/workspace/typescript/dnd/packages/character-creation-runtime/src/index.test.ts)

Scope: fix the SRDINV1 evidence-source contract. Remove private hardcoded
owner-evidence truth from `scripts/srd-unit-inventory.cjs`. Battle-runtime
`owner-evidence-present` classifications must derive from the Unit profile
matrix artifacts, especially `unit-claims.jsonl` and `unit-evidence.jsonl`.
Character-creation owner evidence must either derive from a durable
checker-readable artifact or be downgraded to `owner-evidence-required`; if no
durable character-creation evidence artifact exists, append an atomic task to
create one instead of encoding a private row-id allowlist. Catalog-only closures
may remain explicit only when the closure rationale is generated from a
documented source or task-owned closure table whose purpose is closure, not
evidence truth.

Out of scope: authoring SRD records, adding runtime behavior, broad
character-creation refactors, PHB/XPHB content, and reclassifying rows by
memory rather than durable artifacts.

Verification: generated SRD inventory has zero
`catalog-installed-needs-owner-evidence` level-1 rows; every
`catalog-installed-owner-evidence-present` row has traceable durable evidence;
the generator contains no private `*EvidencePresent*` row-id or Unit-id
allowlist; rows without durable evidence are `catalog-installed-owner-evidence-required`
or explicit catalog-only closures; `pnpm unit-profile-coverage:check`; active
plan consistency across Ralph index, DAG table, and task details; `/simplify`
convergence.

Closeout: battle-runtime owner-evidence-present rows now derive from
`unit-claims.jsonl` SRD `supported-profile` claims plus
`unit-evidence.jsonl` deterministic admission/projection evidence. The
generator no longer carries private `*EvidencePresent*` row-id or Unit-id
allowlists. Character-creation rows without a checker-readable row-level
manifest are downgraded to `catalog-installed-owner-evidence-required`; SRDINV1B
tracks the manifest follow-up.

Verification completed: `pnpm unit-profile-coverage:check`; generated SRD
inventory has zero level-1 `catalog-installed-needs-owner-evidence` rows; the
remaining `catalog-installed-owner-evidence-present` rows trace to durable Unit
matrix artifacts; `pnpm quality`.

`/simplify` round 1: fixed the active-plan follow-up surface so the missing
character-creation evidence manifest remains an executable SRDINV1B task rather
than status prose.

`/simplify` round 2: no important changes found; the remaining coupling is
localized in the SRD inventory generator, where Unit claims and Unit evidence
are read together to derive battle-runtime owner evidence.

### Task 167 - SRDINV1B - Create Character-Creation Owner Evidence Manifest

Status: `done`

Depends on: SRDINV1A

Blocks: SRDINV4

Research / plan:
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[SRDINV_RALPH_BATCH_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md),
[character-creation-runtime index.test.ts](/workspace/typescript/dnd/packages/character-creation-runtime/src/index.test.ts),
[character-creation-runtime README](/workspace/typescript/dnd/packages/character-creation-runtime/README.md),
[character-creation-runtime VOCABULARY](/workspace/typescript/dnd/packages/character-creation-runtime/VOCABULARY.md)

Scope: create a checker-readable character-creation owner-evidence artifact
that maps SRD inventory row ids to durable discovery, fill, finalization, and
build projection coverage. Wire the artifact into `scripts/srd-unit-inventory.cjs`
so character-creation rows become `catalog-installed-owner-evidence-present`
only when the generator can derive row-level evidence from the manifest.

Out of scope: broad character-creation refactors, UI work, PHB/XPHB content,
authoring missing SRD records, battle-runtime behavior, and promoting rows by
test-file memory or row-id allowlist.

Verification: manifest entries are checker-readable and row-id keyed; inventory
generation derives character-creation owner-evidence-present only from the
manifest; rows absent from the manifest remain
`catalog-installed-owner-evidence-required`; active-plan consistency across
Ralph index, DAG table, and task details; `pnpm unit-profile-coverage:check`;
`/simplify` convergence.

Closeout: added
[character-creation-owner-evidence.json](/workspace/typescript/dnd/plans/unit-profile-coverage/character-creation-owner-evidence.json)
as the checker-readable row-id keyed manifest and wired the SRD inventory
generator/checker to accept character-creation owner evidence only from complete
manifest entries with valid source references. The refreshed inventory promotes
16 Fighter/Wizard character-creation rows to
`catalog-installed-owner-evidence-present`; rows absent from the manifest remain
`catalog-installed-owner-evidence-required`.

### Task 168 - SRDINV2 - Author Missing Level-1 Class Containers

Status: `done`

Depends on: SRDINV1A

Blocks: SRDINV7

Research / plan:
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[SRDINV_RALPH_BATCH_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md)

Scope: create or explicitly close the ten missing SRD level-1 class container
records from the generated inventory. Use SRD provenance only. If Surface is
insufficient for a class container fact, record the named Surface blocker
instead of adding runtime-only workaround data.

Out of scope: PHB/XPHB content, battle behavior, spell Unit support, feature
runtime implementation, and broad character builder UI work.

Verification: SRD class source review for every container touched;
`UBIQUITOUS_LANGUAGE.md`; catalog load/reference tests if records are authored;
regenerate inventory; `pnpm unit-profile-coverage:check`; `/simplify`
convergence.

Result: completed with two new SRD class container records
(`class_barbarian`, `class_warlock`), primary ability source facts added to the
existing Fighter/Wizard class containers, and eight remaining class-container
rows closed as named `needs-surface-widening` blockers in the generated
inventory.

### Task 169 - SRDINV3 - Classify Missing Level-1 Class Feature Rows

Status: `done`

Depends on: SRDINV1A

Blocks: SRDINV7

Research / plan:
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[SRDINV_RALPH_BATCH_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md)

Scope: review generated missing level-1 class feature rows and replace generic
author-or-close next actions with sharper outcomes: authored content, named
Surface widening, non-runtime closure, catalog-only closure, or later
owner-specific runtime work.

Out of scope: implementing feature runtime behavior, QNT/QMBT parity, PHB/XPHB
pressure, and one task per Unit.

Closeout: completed missing level-1 class-feature classification. The
generated SRD inventory now names Surface-widening blockers for Bardic
Inspiration, Divine Order, Druidic, Primal Order, Martial Arts, Favored Enemy,
Expertise, Thieves' Cant, Innate Sorcery, Eldritch Invocations, and Pact
Magic; SRDINV3's generated row count is zero and SRDINV6 carries those rows for
the Surface-widening review.

Verification: SRD source review for classified features; `UBIQUITOUS_LANGUAGE.md`;
regenerated inventory; `pnpm unit-profile-coverage:check`; `/simplify`
convergence.

### Task 170 - SRDINV4 - Classify Level-1 Character Creation Rows

Status: `done`

Depends on: SRDINV1A, SRDINV1B

Blocks: SRDINV7

Research / plan:
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[SRDINV_RALPH_BATCH_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md)

Scope: group level-1 hit dice, proficiencies, equipment, multiclass, and table
summary rows by whether the class container should own evidence or whether a
standalone authored record/closure is needed. This task may refine generated
row categories and next actions.

Out of scope: PHB/XPHB content, battle runtime, QMBT, and implementing a full
character-creation runtime feature.

Verification: SRD source review; `UBIQUITOUS_LANGUAGE.md`; update
character-creation docs if architecture/vocabulary changes; regenerate
inventory; `pnpm unit-profile-coverage:check`; `/simplify` convergence.

Closeout: generated inventory records `class-container-owned-source-fact` for
level-1 core traits, equipment pressure, and multiclass entry rows, plus
`non-runtime-table-summary` for class table summaries. Missing class-owned
creation rows now point at class-container authoring or Surface widening instead
of standalone authored records.

### Task 171 - SRDINV5A - Classify Level-1 Spell Access Rows

Status: `done`

Depends on: SRDINV1A

Blocks: SRDINV7

Research / plan:
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[SRDINV_RALPH_BATCH_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md)

Scope: classify the small class Spellcasting/access row set separately from
individual cantrip and level-1 Spell Unit admission/support pressure. Decide
whether each row is owned by a class container, needs Surface widening, needs
authored content, or closes explicitly.

Out of scope: admitting every spell Unit, spell runtime behavior, QMBT spell
expansion, PHB/XPHB content, and private spell-list pressure.

Verification: SRD class Spellcasting/access source review;
`UBIQUITOUS_LANGUAGE.md`; regenerate inventory; `pnpm
unit-profile-coverage:check`; `/simplify` convergence.

Closeout: generated inventory now classifies Bard, Cleric, Druid, Paladin,
Ranger, and Sorcerer level-1 Spellcasting rows as named
`needs-surface-widening` blockers for non-Wizard ClassRecord spellcasting
support. Wizard Spellcasting remains installed with character-creation owner
evidence present. Warlock Pact Magic remains a class-feature Surface-widening
row, and cantrip/level-1 Spell Unit pressure remains reserved for
SRDINV5B-SRDINV5D.

### Task 172 - SRDINV5B - Classify Missing Cantrip and Level-1 Spell Units

Status: `done`

Depends on: SRDINV1A

Blocks: SRDINV7

Research / plan:
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[SRDINV_RALPH_BATCH_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md)

Scope: classify missing SRD cantrip and level-1 Spell Unit rows by authoring
readiness, named Surface blockers, runtime-support pressure, or explicit
closure. Keep this as a classification/next-action task, not an attempt to
author or implement every missing spell.

Out of scope: admitting every spell Unit, spell runtime behavior, QMBT spell
expansion, PHB/XPHB content, and private spell-list pressure.

Verification: SRD spell-list and relevant spell description source review for
rows changed; `UBIQUITOUS_LANGUAGE.md`; regenerate inventory; `pnpm
unit-profile-coverage:check`; `/simplify` convergence.

Closeout: generated inventory now classifies missing cantrip and level-1 Spell
Unit pressure by Spell Definition Unit id so repeated class-list rows cannot
drift. The missing Spell Unit frontier is split into authoring-ready detect
rows, named `needs-surface-widening` blockers, and explicit
`catalog-only/dead-for-now` closures. Later authoring, Surface widening, owner
evidence, and runtime behavior remain in SRDINV5C-SRDINV10.

### Task 173 - SRDINV5C - Classify Installed Cantrip and Level-1 Spell Units

Status: `done`

Depends on: SRDINV1A

Blocks: SRDINV7

Research / plan:
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[SRDINV_RALPH_BATCH_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md)

Scope: classify installed SRD cantrip and level-1 Spell Unit rows by
operational owner evidence requirement. Distinguish catalog load, spell access,
invocation projection, runtime support, deterministic admission/projection, and
catalog-only closure instead of treating installation as support.

Out of scope: spell runtime behavior, selected identity MBT expansion,
PHB/XPHB content, and authoring missing spell records.

Verification: SRD spell source review for rows changed;
`UBIQUITOUS_LANGUAGE.md`; regenerate inventory; `pnpm
unit-profile-coverage:check`; `/simplify` convergence.

Closeout: generated inventory now classifies installed cantrip and level-1
Spell Unit pressure without treating catalog installation as support.
Supported installed Spell Definitions derive owner evidence from
`unit-claims.jsonl` plus deterministic admission/projection evidence in
`unit-evidence.jsonl`; unsupported Sleep rows remain owner-evidence-required;
Fire Bolt and Thunderwave rows carry named Surface/runtime blockers; Detect
Magic and Light are explicit `catalog-only/dead-for-now` closures. Later
catalog-only review, Surface widening, and runtime behavior remain visible in
SRDINV5D-SRDINV10.

### Task 174 - SRDINV5D - Review Catalog-Only Cantrip and Level-1 Spell Units

Status: `done`

Depends on: SRDINV1A

Blocks: SRDINV7

Research / plan:
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[SRDINV_RALPH_BATCH_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md)

Scope: review catalog-only/dead-for-now SRD cantrip and level-1 Spell Unit
rows. Keep dead/catalog-only rows when appropriate, but make that closure
explicit and counted. Promote only concrete follow-up batches for spell rows
that should become authored or executable.

Out of scope: requiring all spell catalog rows to have production consumers,
implementing spell runtime behavior, PHB/XPHB content, and selected identity
MBT expansion.

Verification: SRD spell source review for rows changed; regenerate inventory;
`pnpm unit-profile-coverage:check`; `/simplify` convergence.

Completed scope: reviewed catalog-only/dead-for-now cantrip and level-1 Spell
Unit pressure rows. The generated inventory keeps the 151-row SRDINV5D
denominator, splits it into 74 explicit catalog-only/dead-for-now closures and
77 authored executable follow-up rows, and promotes those executable rows into
six named spell runtime follow-up batches recorded in
`SRDINV_RALPH_BATCH_PLAN.md`.

Out of scope honored: no Spell Definition records were admitted, no spell
runtime behavior was implemented, no PHB/XPHB content was added, and selected
identity MBT expansion was not touched.

Verification completed: local SRD 5.2.1 class spell lists and spell
descriptions were reviewed for the changed classifications;
`UBIQUITOUS_LANGUAGE.md` terminology was checked; inventory artifacts were
regenerated; `pnpm unit-profile-coverage:check` passed; `pnpm quality` passed;
`/simplify` convergence is recorded in the SRDINV5D closeout notes.

### Task 175 - SRDINV6 - Review Catalog-Only and Surface-Widening Rows

Status: `done`

Depends on: SRDINV1A

Blocks: SRDINV7

Research / plan:
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[SRDINV_RALPH_BATCH_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md)

Scope: review rows marked catalog-only/dead-for-now and
needs-surface-widening, including the level-1 class-feature blockers moved from
SRDINV3, the level-1 spell-access blockers moved from SRDINV5A, and the
spell-unit blockers moved from SRDINV5B into the generated SRDINV6 batch. Keep
dead/catalog-only rows when appropriate, but make that closure explicit and
counted. For Surface blockers, ensure the missing Surface construct is named
and promote concrete widening tasks where the blocker should become executable.

Out of scope: requiring all catalog rows to have production consumers,
implementing runtime behavior, PHB/XPHB content, and broad Surface redesign
not backed by a named blocker.

Verification: SRD source review for rows changed; regenerate inventory; `pnpm
unit-profile-coverage:check`; `/simplify` convergence.

Completed scope: reviewed the 62-row SRDINV6 denominator, kept 4 nonspell
catalog-only/dead-for-now rows as explicit SRD-traced closures, and preserved
58 Surface-widening rows with named missing constructs for SRDINV7/SRDINV8
planning.

### Task 176 - SRDINV7 - Recursive SRD Inventory Planning Review

Status: `done`

Depends on: SRDINV2-SRDINV5D, SRDINV6

Blocks: SRDINV8-SRDINV11

Research / plan:
[SRDINV7_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV7_RECURSIVE_PLANNING_REVIEW.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[SRDINV_RALPH_BATCH_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md),
[ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md)

Scope: review SRDINV1A-SRDINV6 findings, update the SRD inventory report and
plan docs, and append a concrete multi-task next batch unless SRD level-1
inventory is explicitly complete. This task must not append only one recursive
continuation task. If level-1 remains open, it should add at least three
specific follow-up tasks grouped by mechanics family, owner boundary, or
Surface-widening blocker.

Out of scope: implementation work not captured by the newly appended batch.

Verification: active-plan consistency across Ralph index, DAG table, and task
details; regenerated inventory; `pnpm unit-profile-coverage:check`; confirm
the appended result is either explicit level-1 completion with final metrics or
a concrete multi-task batch, not a recursive-only placeholder; `/simplify`
convergence, minimum two rounds unless the final changeset is trivial.

Completed scope: reviewed SRDINV1A-SRDINV6 findings and generated inventory
metrics. Level-1 inventory remains open, with 25 level-1 Surface-widening rows,
58 all-row Surface-widening rows, and 77 authored executable spell follow-up
rows, so SRDINV7 appended a concrete Surface-widening batch instead of a
recursive-only continuation: SRDINV8 class-container proficiency/multiclass
facts, SRDINV9 non-Wizard Spell Access facts, SRDINV10 level-1 class-feature
mechanics, and SRDINV11 recursive review.

Out of scope honored: no Surface implementation, record authoring, runtime
support, QNT/MBT work, spell runtime planning, or PHB/XPHB pressure was
implemented in this planning task.

Verification completed: active-plan consistency was updated across the Ralph
task index, DAG table, and task details; generated inventory was checked with
`pnpm unit-profile-coverage:check`; local SRD source review checked Bard,
Cleric, Druid, Monk, Paladin, Ranger, Rogue, Sorcerer, and Warlock
representative blocker passages plus `UBIQUITOUS_LANGUAGE.md`; `/simplify`
convergence is recorded in the SRDINV7 review artifact.

### Task 177 - SRDINV8 - Widen Class Container Proficiency Surface Facts

Status: `done`

Depends on: SRDINV7

Blocks: SRDINV11

Research / plan:
[SRDINV7_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV7_RECURSIVE_PLANNING_REVIEW.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[SRDINV_RALPH_BATCH_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md),
[Surface README](/workspace/typescript/dnd/packages/surface/README.md),
[Classes](/workspace/typescript/dnd/.references/srd-5.2.1/Classes),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: widen Surface class-container source facts for the SRD level-1
proficiency and multiclass-entry blockers named by SRDINV2/SRDINV6. Cover
Bard's Musical Instrument choices, Druid's Herbalism Kit proficiency, Monk and
Rogue tool proficiencies plus property-filtered Martial weapon proficiencies,
and Ranger multiclass entry facts that combine fixed Martial weapon proficiency
with one chosen skill.

Out of scope: non-Wizard Spell Access, Pact Magic, level-1 class-feature
mechanics, authoring SRD records, character-creation runtime implementation,
battle-runtime behavior, QNT/MBT work, and PHB/XPHB content.

Verification: read the relevant local SRD class trait and multiclass passages;
check `UBIQUITOUS_LANGUAGE.md` for Class, Proficiency Level, Class Feature,
Weapon Mastery if touched, and Character Sheet terms; focused Surface tests for
the new source shapes; regenerate inventory if classifications change;
`pnpm unit-profile-coverage:check`; package-local typecheck/tests for touched
Surface code; `/simplify` convergence.

### Task 178 - SRDINV9 - Widen Non-Wizard Spell Access Surface Facts

Status: `done`

Depends on: SRDINV7

Blocks: SRDINV10, SRDINV11

Research / plan:
[SRDINV7_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV7_RECURSIVE_PLANNING_REVIEW.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[Surface README](/workspace/typescript/dnd/packages/surface/README.md),
[Classes](/workspace/typescript/dnd/.references/srd-5.2.1/Classes),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: widen Surface Spell Access facts for non-Wizard SRD level-1 casters and
own the shared Surface source shape for Warlock Pact Magic.
Cover Bard, Cleric, Druid, and Sorcerer list-prepared spellcasting with cantrip
choices, prepared spells, Spell Slot projection, spellcasting ability,
spellcasting focus, and replacement timing; Paladin and Ranger prepared
spellcasting without level-1 cantrips; and Warlock Pact Magic with Pact Slot
projection and Short or Long Rest recovery. The Pact Magic shape produced here
is the only Pact Magic source shape; SRDINV10 must consume it for class-feature
projections instead of defining parallel Pact Magic state.

Out of scope: authoring individual Spell Definition records, implementing spell
runtime behavior, adding Spell Invocation support, class-container proficiency
widening from SRDINV8, class-feature mechanics from SRDINV10, QNT/MBT work, and
PHB/XPHB content.

Verification: read the relevant local SRD Spellcasting and Pact Magic passages;
check `UBIQUITOUS_LANGUAGE.md` for Spell Access, Spell Definition, Spell Slot,
Pact Slot, Class, Pool, Spend, and Concentration terms if touched; focused
Surface tests for the new source shapes; regenerate inventory if
classifications change; `pnpm unit-profile-coverage:check`; package-local
typecheck/tests for touched Surface code; `/simplify` convergence.

Completion: Surface now has class spellcasting source shapes for list-prepared
non-Wizard casters and Warlock Pact Magic, including replacement
timing/cardinality and catalog-validated selected Spell Unit refs. SRDINV10 may
consume the shared Pact Magic source shape instead of defining parallel Pact
Magic state.

### Task 179 - SRDINV10 - Widen Level-1 Class Feature Surface Mechanics

Status: `done`

Depends on: SRDINV7, SRDINV9

Blocks: SRDINV11

Research / plan:
[SRDINV7_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV7_RECURSIVE_PLANNING_REVIEW.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[Surface README](/workspace/typescript/dnd/packages/surface/README.md),
[Classes](/workspace/typescript/dnd/.references/srd-5.2.1/Classes),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: widen Surface mechanics for the level-1 class-feature blockers named by
SRDINV3/SRDINV6 after SRDINV9 lands the shared Pact Magic source shape: Bardic
Inspiration, Cleric Divine Order, Druidic, Druid Primal Order, Monk Martial
Arts, Ranger Favored Enemy, Rogue Expertise, Rogue
Thieves' Cant, Sorcerer Innate Sorcery, Warlock Eldritch Invocations, and
Warlock Pact Magic class-feature projections derived from SRDINV9's shared
Pact Magic source shape. Do not add another Pact Magic source shape or copied
Pact Slot/recovery state.

Out of scope: authoring SRD records, runtime support, generic D20 Test engines,
spell runtime, class-container proficiency widening from SRDINV8, Spell Access
source widening from SRDINV9, QNT/MBT work, and PHB/XPHB content.

Verification: read the relevant local SRD class-feature passages; check
`UBIQUITOUS_LANGUAGE.md` for Class Feature, Pool, Spend, Ability Check, Attack
Roll, Saving Throw, Spell Access, Pact Slot, Reaction, Concentration, and
Weapon Mastery if touched; focused Surface tests for new source shapes;
regenerate inventory if classifications change; `pnpm unit-profile-coverage:check`;
package-local typecheck/tests for touched Surface code; `/simplify`
convergence.

Closeout: Surface now admits the level-1 class-feature source shapes needed
for Bardic Inspiration, Cleric Divine Order, Druidic, Druid Primal Order, Monk
Martial Arts, Ranger Favored Enemy, Rogue Expertise, Rogue Thieves' Cant,
Sorcerer Innate Sorcery, Warlock Eldritch Invocations, and Warlock Pact Magic
class-feature projection. Pact Magic remains derived from the SRDINV9 class
record spellcasting source shape instead of copied feature-local Pact Slot
state.

Verification completed: local SRD class-feature passages and
`UBIQUITOUS_LANGUAGE.md` checked; focused Surface source-shape tests added;
Surface typecheck and focused tests passed; `pnpm unit-profile-coverage:check`
and `pnpm quality` passed; `/simplify` round 1 fixed reviewed schema
over-admission for spell-list and Warlock option ownership; `/simplify` round 2
found no remaining task-owned changes.

### Task 180 - SRDINV11 - Recursive SRD Inventory Planning Review

Status: `done`

Depends on: SRDINV8-SRDINV10

Blocks: SRDINV12-SRDINV16

Research / plan:
[SRDINV11_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV11_RECURSIVE_PLANNING_REVIEW.md),
[SRDINV7_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV7_RECURSIVE_PLANNING_REVIEW.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[SRDINV_RALPH_BATCH_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md),
[ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md)

Scope: review SRDINV8-SRDINV10 findings, refresh generated inventory metrics,
and append the next concrete multi-task batch unless SRD level-1 inventory is
explicitly complete. Candidate next batches include authoring records made
expressible by SRDINV8-SRDINV10, spell Unit Surface blockers, or runtime/MBT
planning for authored executable rows, but SRDINV11 must select based on the
post-widening inventory state.

Out of scope: implementation work not captured by the newly appended batch,
PHB/XPHB pressure, broad runtime rewrites, and treating catalog admission alone
as behavior support.

Verification: active-plan consistency across Ralph index, DAG table, and task
details; regenerated inventory; `pnpm unit-profile-coverage:check`; confirm
the appended result is either explicit level-1 completion with final metrics or
a concrete multi-task batch, not a recursive-only placeholder; `/simplify`
convergence, minimum two rounds unless the final changeset is trivial.

Completed scope: reviewed SRDINV8-SRDINV10 findings and refreshed generated
inventory metrics. Level-1 inventory remains open with 8 missing class
containers, 0 level-1 `needs-surface-widening` rows, 33 all-row
`needs-surface-widening` rows, 96 level-1 `missing-authored-record` rows, and
70 authored executable spell follow-up rows. SRDINV11 appended a concrete
authoring batch instead of a recursive-only continuation: SRDINV12 class
containers, SRDINV13 class Spell Access, SRDINV14 class features, SRDINV15
Weapon Mastery, and SRDINV16 recursive review.

Out of scope honored: no SRD records were authored, no runtime behavior or MBT
planning was promoted, no spell Unit Surface blocker task was started, and
catalog admission remains separate from operational owner evidence.

Verification completed: local SRD class passages and `UBIQUITOUS_LANGUAGE.md`
checked; inventory regenerated; active-plan consistency updated across Ralph
task index, DAG table, and task details; `pnpm unit-profile-coverage:check`
passed; `/simplify` convergence is recorded in the SRDINV11 review artifact.

### Task 181 - SRDINV12 - Author Expressible Level-1 Class Containers

Status: `done`

Depends on: SRDINV11

Blocks: SRDINV13-SRDINV16

Research / plan:
[SRDINV11_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV11_RECURSIVE_PLANNING_REVIEW.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[SRDINV_RALPH_BATCH_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md),
[Surface README](/workspace/typescript/dnd/packages/surface/README.md),
[Classes](/workspace/typescript/dnd/.references/srd-5.2.1/Classes),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: author SRD-provenance class container records for Bard, Cleric, Druid,
Monk, Paladin, Ranger, Rogue, and Sorcerer using the Surface class-container
source facts made expressible by SRDINV8 and SRDINV9. Class-owned
character-creation rows must remain derived from the class container boundary;
do not author standalone records for hit dice, proficiencies, equipment, or
multiclass entry traits.

Out of scope: Spell Definition authoring, class feature authoring, Weapon
Mastery authoring, character-creation runtime implementation, battle-runtime
behavior, QNT/MBT work, PHB/XPHB content, and broad owner-evidence cleanup.

Verification: read the relevant local SRD class trait, Spellcasting, and
multiclass passages; check `UBIQUITOUS_LANGUAGE.md` for Class, Character Sheet,
Spell Access, Proficiency Bonus, Proficiency Level, and Weapon Mastery terms if
touched; focused Surface decoding/reader tests for authored records;
regenerate inventory; `pnpm unit-profile-coverage:check`; package-local
typecheck/tests for touched Surface code; `pnpm quality` if production code or
content changes; `/simplify` convergence.

### Task 182 - SRDINV13 - Author Expressible Level-1 Spell Access Records

Status: `done`

Depends on: SRDINV12

Blocks: SRDINV16

Research / plan:
[SRDINV11_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV11_RECURSIVE_PLANNING_REVIEW.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[SRDINV_RALPH_BATCH_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md),
[Surface README](/workspace/typescript/dnd/packages/surface/README.md),
[Classes](/workspace/typescript/dnd/.references/srd-5.2.1/Classes),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: author missing SRD-provenance level-1 Spell Access records for Bard,
Cleric, Druid, Paladin, Ranger, and Sorcerer using the class-list preparation,
slot, focus, and replacement source facts made expressible by SRDINV9.

Out of scope: authoring individual Spell Definition records, admitting spells
as runtime-supported, spell invocation/projection runtime, class-container
authoring from SRDINV12, class feature authoring, QNT/MBT work, and PHB/XPHB
content.

Verification: read the relevant local SRD Spellcasting passages; check
`UBIQUITOUS_LANGUAGE.md` for Spell Access, Spell Definition, Spell Slot,
Pact Slot, Class, Character Sheet, and Concentration terms if touched; focused
Surface decoding/reader tests; regenerated inventory; `pnpm
unit-profile-coverage:check`; package-local typecheck/tests for touched Surface
code; `pnpm quality` if production code or content changes; `/simplify`
convergence.

### Task 183 - SRDINV14 - Author Expressible Level-1 Class Feature Records

Status: `done`

Depends on: SRDINV12

Blocks: SRDINV16

Research / plan:
[SRDINV11_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV11_RECURSIVE_PLANNING_REVIEW.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[SRDINV_RALPH_BATCH_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md),
[Surface README](/workspace/typescript/dnd/packages/surface/README.md),
[Classes](/workspace/typescript/dnd/.references/srd-5.2.1/Classes),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: author missing SRD-provenance class feature records for Bardic
Inspiration, Divine Order, Druidic, Primal Order, Martial Arts, Favored Enemy,
Expertise, Thieves' Cant, Innate Sorcery, and Eldritch Invocations using the
class-feature mechanics made expressible by SRDINV10. If authoring exposes a
real remaining Surface gap, narrow the task-owned follow-up instead of encoding
a workaround.

Out of scope: class container authoring from SRDINV12, Spell Access authoring
from SRDINV13, Weapon Mastery authoring from SRDINV15, runtime behavior,
generic D20 Test engines, spell runtime, QNT/MBT work, PHB/XPHB content, and
catalog-only closures for Lay On Hands, Unarmored Defense, or Arcane Recovery.

Verification: read the relevant local SRD class-feature passages; check
`UBIQUITOUS_LANGUAGE.md` for Class Feature, Pool, Spend, Ability Check, Attack
Roll, Saving Throw, Spell Access, Pact Slot, Reaction, Concentration, and
Weapon Mastery if touched; focused Surface decoding/reader tests; regenerated
inventory; `pnpm unit-profile-coverage:check`; package-local typecheck/tests
for touched Surface code; `pnpm quality` if production code or content changes;
`/simplify` convergence.

### Task 184 - SRDINV15 - Author Level-1 Weapon Mastery Records

Status: `done`

Depends on: SRDINV12

Blocks: SRDINV16

Research / plan:
[SRDINV11_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV11_RECURSIVE_PLANNING_REVIEW.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[SRDINV_RALPH_BATCH_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md),
[Surface README](/workspace/typescript/dnd/packages/surface/README.md),
[Classes](/workspace/typescript/dnd/.references/srd-5.2.1/Classes),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: author missing SRD-provenance Weapon Mastery records for Barbarian,
Paladin, Ranger, and Rogue as character-sheet choice/source facts. Fighter
Weapon Mastery already has owner evidence and should not be duplicated.

Out of scope: implementing weapon mastery property runtime behavior, class
container authoring from SRDINV12, class feature authoring from SRDINV14,
Spell Access authoring, battle-runtime behavior, QNT/MBT work, and PHB/XPHB
content.

Verification: read the relevant local SRD Weapon Mastery passages; check
`UBIQUITOUS_LANGUAGE.md` for Weapon Mastery, Class, Character Sheet,
Proficiency Level, and Long Rest terms if touched; focused Surface
decoding/reader tests; regenerated inventory; `pnpm unit-profile-coverage:check`;
package-local typecheck/tests for touched Surface code; `pnpm quality` if
production code or content changes; `/simplify` convergence.

### Task 185 - SRDINV16 - Recursive SRD Inventory Planning Review

Status: `done`

Depends on: SRDINV12-SRDINV15

Blocks: SRDINV17-SRDINV21

Research / plan:
[SRDINV16_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV16_RECURSIVE_PLANNING_REVIEW.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[SRDINV_RALPH_BATCH_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md),
[ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md)

Scope: review SRDINV12-SRDINV15 findings, refresh generated inventory metrics,
and append the next concrete multi-task batch unless SRD level-1 inventory is
explicitly complete. Candidate next batches include character-creation
owner-evidence closure, spell Unit Surface blockers, or runtime/MBT planning
for authored executable rows, but SRDINV16 must select based on the
post-authoring inventory state.

Out of scope: implementation work not captured by the newly appended batch,
PHB/XPHB pressure, broad runtime rewrites, and treating catalog admission alone
as behavior support.

Verification: active-plan consistency across Ralph index, DAG table, and task
details; regenerated inventory; `pnpm unit-profile-coverage:check`; confirm
the appended result is either explicit level-1 completion with final metrics or
a concrete multi-task batch, not a recursive-only placeholder; `/simplify`
convergence, minimum two rounds unless the final changeset is trivial.

Completed scope: reviewed SRDINV12-SRDINV15 authoring results and refreshed the
generated inventory. Level-1 authored-record absence is closed, but level-1 is
not complete: the refreshed inventory still has 121
`catalog-installed-owner-evidence-required` rows. The appended batch is
SRDINV17 class-container/source-fact evidence, SRDINV18 class-feature evidence,
SRDINV19 Spell Access evidence, SRDINV20 Weapon Mastery evidence, and SRDINV21
recursive review.

Out of scope honored: no implementation work from the appended batch was
started; no spell Unit Surface blocker, spell runtime, battle-runtime MBT, or
PHB/XPHB task was promoted; catalog admission remains separate from
operational owner evidence.

Verification completed: local SRD class passages and `UBIQUITOUS_LANGUAGE.md`
checked; inventory regenerated; active-plan consistency updated across Ralph
task index, DAG table, and task details; `pnpm unit-profile-coverage:check`
passed; `/simplify` convergence is recorded in the SRDINV16 review artifact.

### Task 186 - SRDINV17 - Close Character-Creation Class Container Evidence

Status: `done`

Depends on: SRDINV16

Blocks: SRDINV18-SRDINV21

Research / plan:
[SRDINV16_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV16_RECURSIVE_PLANNING_REVIEW.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[SRDINV_RALPH_BATCH_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md),
[character-creation-owner-evidence.json](/workspace/typescript/dnd/plans/unit-profile-coverage/character-creation-owner-evidence.json),
[character-creation-runtime README](/workspace/typescript/dnd/packages/character-creation-runtime/README.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: close character-creation owner evidence for authored class containers,
core traits, starting equipment, and multiclass-entry facts. Widen the
character-creation support profile, runtime evidence, and
checker-readable manifest where needed, and keep those rows derived from class
container source facts rather than standalone duplicate records.

Out of scope: class-feature choice evidence from SRDINV18, Spell Access
evidence from SRDINV19, Weapon Mastery evidence from SRDINV20, shared-algebra
multiclass prerequisite closure, Wizard Ritual Adept runtime ownership, spell
Unit runtime, battle-runtime behavior, QNT/MBT work, PHB/XPHB content, and
catalog admission as owner evidence.

Verification: read relevant local SRD class trait, starting equipment, and
multiclass-entry passages; check `UBIQUITOUS_LANGUAGE.md` for Class,
Character Sheet, Multiclassing, Proficiency Bonus, Proficiency Level, and
equipment terms if touched; focused character-creation discovery, fill,
finalization, and build-projection tests; update the character-creation owner
evidence manifest; regenerate inventory; `pnpm unit-profile-coverage:check`;
package-local typecheck/tests for touched runtime code; `pnpm quality` if
production code changes; `/simplify` convergence.

### Task 187 - SRDINV18 - Close Character-Creation Class Feature Evidence

Status: `done`

Depends on: SRDINV17

Blocks: SRDINV18A, SRDINV21

Research / plan:
[SRDINV16_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV16_RECURSIVE_PLANNING_REVIEW.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[SRDINV_RALPH_BATCH_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md),
[character-creation-owner-evidence.json](/workspace/typescript/dnd/plans/unit-profile-coverage/character-creation-owner-evidence.json),
[character-creation-runtime README](/workspace/typescript/dnd/packages/character-creation-runtime/README.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: close character-creation owner evidence for authored level-1 class
feature records that the character-creation boundary owns as retained
CharacterBuild Unit refs or discovered choices: Bardic Inspiration, Divine
Order, Druidic, Primal Order, Martial Arts, Favored Enemy, Expertise, Thieves'
Cant, Innate Sorcery, Eldritch Invocations, and Pact Magic.

Out of scope: class-container/source-fact evidence from SRDINV17, Spell Access
evidence from SRDINV19, Weapon Mastery evidence from SRDINV20, Wizard Ritual
Adept invocation runtime, feature combat execution, spell runtime,
battle-runtime behavior, QNT/MBT work, PHB/XPHB content, and catalog admission
as owner evidence.

Verification: read relevant local SRD class-feature passages; check
`UBIQUITOUS_LANGUAGE.md` for Class Feature, Character Sheet, Spell Access,
Pool, Spend, Proficiency Level, and any rule terms touched; focused
character-creation tests for discovery, fill, finalization, and build
projection; update the owner evidence manifest; regenerate inventory; `pnpm
unit-profile-coverage:check`; package-local typecheck/tests for touched runtime
code; `pnpm quality` if production code changes; `/simplify` convergence.

Completed scope: closed character-creation owner evidence for retained
level-1 class-feature Unit refs and implemented supported acquisition-choice
evidence for Divine Order, Primal Order, and Rogue Expertise. Bardic
Inspiration, Druidic, Martial Arts, Favored Enemy, Thieves' Cant, Innate
Sorcery, and Pact Magic are retained through finalized `CharacterBuild`
feature Unit refs for supported progressions; executable feature behavior
remains downstream runtime work.

Narrowed scope: Warlock Eldritch Invocations remains open for feature-choice
evidence because the current character-creation boundary has no durable
invocation option catalog to discover, fill, finalize, and project. SRDINV18A
keeps that work runnable and dependency-ordered.

Verification completed: local SRD class-feature passages and
`UBIQUITOUS_LANGUAGE.md` were checked; focused character-creation tests cover
discovery, fill, finalization, and build projection for the supported class
feature choices; the owner evidence manifest and generated inventory were
updated; package-local typecheck/tests, `pnpm unit-profile-coverage:check`,
`pnpm quality`, and two `/simplify` rounds passed.

`/simplify` round 1: retained the candidate split that does not count
Eldritch Invocations choice evidence from a retained feature Unit ref, and
added SRDINV18A as the explicit executable follow-up.

`/simplify` round 2: no further task-scope changes found; the remaining
choice-bearing class-feature work is isolated to the invocation option catalog
rather than mixed into Spell Access, Weapon Mastery, or combat execution.

### Task 188 - SRDINV19 - Close Character-Creation Spell Access Evidence

Status: `done`

Depends on: SRDINV17

Blocks: SRDINV21

Research / plan:
[SRDINV16_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV16_RECURSIVE_PLANNING_REVIEW.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[SRDINV_RALPH_BATCH_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md),
[character-creation-owner-evidence.json](/workspace/typescript/dnd/plans/unit-profile-coverage/character-creation-owner-evidence.json),
[character-creation-runtime README](/workspace/typescript/dnd/packages/character-creation-runtime/README.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: close character-creation owner evidence for Bard, Cleric, Druid,
Paladin, Ranger, and Sorcerer level-1 Spell Access records through durable
discovery, fill, finalization, build-projection, and manifest evidence.

Out of scope: authoring or admitting individual Spell Definitions as
runtime-supported, spell invocation/projection runtime, class-container evidence
from SRDINV17, class-feature evidence from SRDINV18, Weapon Mastery evidence
from SRDINV20, battle-runtime behavior, QNT/MBT work, PHB/XPHB content, and
catalog admission as owner evidence.

Verification: read relevant local SRD Spellcasting passages; check
`UBIQUITOUS_LANGUAGE.md` for Spell Access, Spell Definition, Spell Slot,
Pact Slot, Class, Character Sheet, and Concentration terms if touched; focused
character-creation tests for non-Wizard Spell Access discovery, fill,
finalization, and build projection; update the owner evidence manifest;
regenerate inventory; `pnpm unit-profile-coverage:check`; package-local
typecheck/tests for touched runtime code; `pnpm quality` if production code
changes; `/simplify` convergence.

### Task 189 - SRDINV20 - Close Character-Creation Weapon Mastery Evidence

Status: `done`

Depends on: SRDINV17

Blocks: SRDINV21

Research / plan:
[SRDINV16_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV16_RECURSIVE_PLANNING_REVIEW.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[SRDINV_RALPH_BATCH_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md),
[character-creation-owner-evidence.json](/workspace/typescript/dnd/plans/unit-profile-coverage/character-creation-owner-evidence.json),
[character-creation-runtime README](/workspace/typescript/dnd/packages/character-creation-runtime/README.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: close character-creation owner evidence for Barbarian, Paladin, Ranger,
and Rogue level-1 Weapon Mastery choices through durable discovery, fill,
finalization, build-projection, and manifest evidence.

Out of scope: implementing mastery property execution, duplicating weapon
proficiency/category state already owned by class containers, class-container
evidence from SRDINV17, class-feature evidence from SRDINV18, Spell Access
evidence from SRDINV19, battle-runtime behavior, QNT/MBT work, PHB/XPHB
content, and catalog admission as owner evidence.

Verification: read relevant local SRD Weapon Mastery passages; check
`UBIQUITOUS_LANGUAGE.md` for Weapon Mastery, Class, Character Sheet,
Proficiency Level, and Long Rest terms if touched; focused character-creation
tests for Weapon Mastery discovery, fill, finalization, and build projection;
update the owner evidence manifest; regenerate inventory; `pnpm
unit-profile-coverage:check`; package-local typecheck/tests for touched runtime
code; `pnpm quality` if production code changes; `/simplify` convergence.

### Task 190 - SRDINV21 - Recursive SRD Inventory Planning Review

Status: `ready-for-research`

Depends on: SRDINV17-SRDINV20, SRDINV18A

Blocks: none

Research / plan:
[SRDINV16_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV16_RECURSIVE_PLANNING_REVIEW.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[SRDINV_RALPH_BATCH_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md),
[ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md)

Scope: review SRDINV17-SRDINV20 plus SRDINV18A owner-evidence closure, refresh generated
inventory metrics, and append the next concrete multi-task batch unless SRD
level-1 inventory is explicitly complete. If any level-1 row remains
`catalog-only/dead-for-now`, owner-evidence-required, catalog-only without
promoted behavior, or otherwise outside promoted runtime coverage, SRDINV21
must convert that row into executable follow-up work grouped by promoted runtime
owner. That follow-up must preserve the architecture chain where applicable:
QNT first, MBT/parity against the real reducers, then promoted runtime support.
Remaining candidates include shared multiclass prerequisite owner evidence,
Wizard Ritual Adept spell-invocation ownership, spell Unit Surface blockers,
character-sheet AC derivation, rest/spell-slot recovery, healing/resource
actions, or runtime/MBT planning for authored executable spell rows, but
SRDINV21 must select and split concrete tasks based on the refreshed
post-evidence inventory state.

Out of scope: implementation work not captured by the newly appended batch,
PHB/XPHB pressure, broad runtime rewrites, and treating catalog admission alone
as behavior support.

Verification: active-plan consistency across Ralph index, DAG table, and task
details; regenerated inventory; `pnpm unit-profile-coverage:check`; confirm
the appended result is either explicit level-1 completion with final metrics or
a concrete promoted-runtime implementation batch, not a recursive-only
placeholder or passive backlog list; `/simplify` convergence, minimum two
rounds unless the final changeset is trivial.

### Task 191 - SRDINV18A - Close Eldritch Invocation Choice Evidence

Status: `done`

Depends on: SRDINV18

Blocks: SRDINV21

Research / plan:
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[character-creation-owner-evidence.json](/workspace/typescript/dnd/plans/unit-profile-coverage/character-creation-owner-evidence.json),
[Warlock.md](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Warlock.md),
[character-creation-runtime README](/workspace/typescript/dnd/packages/character-creation-runtime/README.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: close Warlock Eldritch Invocations as actual character-creation
feature-choice evidence by adding a durable invocation option catalog/discovery
path and character-creation fill, finalization, build projection, manifest,
and inventory evidence. The implementation must keep retained feature Unit refs
separate from invocation option ownership so `warlock_eldritch_invocations`
cannot be marked owner-evidence-present from catalog admission or retained
feature refs alone.

Out of scope: Wizard Ritual Adept invocation runtime, battle-runtime behavior,
spell runtime, Spell Access evidence from SRDINV19, Weapon Mastery evidence
from SRDINV20, QNT/MBT work, PHB/XPHB content, and treating invocation option
execution as character-creation evidence.

Verification: read Warlock Eldritch Invocations and the relevant local SRD
invocation option passages; check `UBIQUITOUS_LANGUAGE.md` for Class Feature,
Character Sheet, Spell Access, and any invocation terms touched; focused
character-creation tests for invocation option discovery, fill, finalization,
and build projection; update the owner evidence manifest; regenerate inventory;
`pnpm unit-profile-coverage:check`; package-local typecheck/tests for touched
runtime code; `pnpm quality` if production code changes; `/simplify`
convergence.
