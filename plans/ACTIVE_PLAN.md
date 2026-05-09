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
      "status": "done",
      "title": "Recursive SRD Inventory Planning Review"
    },
    {
      "number": 191,
      "id": "SRDINV18A",
      "status": "done",
      "title": "Close Eldritch Invocation Choice Evidence"
    },
    {
      "number": 192,
      "id": "SRDINV22",
      "status": "done",
      "title": "Close Shared Multiclass Primary Ability Evidence"
    },
    {
      "number": 193,
      "id": "SRDINV23",
      "status": "done",
      "title": "Promote Character-Sheet Armor Class Formula Runtime"
    },
    {
      "number": 194,
      "id": "SRDINV24",
      "status": "done",
      "title": "Promote Character-Sheet Rest and Spell Slot Recovery"
    },
    {
      "number": 195,
      "id": "SRDINV25",
      "status": "done",
      "title": "Promote Character-Sheet Healing Resource Actions"
    },
    {
      "number": 196,
      "id": "SRDINV26",
      "status": "done",
      "title": "Close Wizard Ritual Adept Invocation Ownership"
    },
    {
      "number": 197,
      "id": "SRDINV27",
      "status": "done",
      "title": "Recursive SRD Inventory Planning Review"
    },
    {
      "number": 198,
      "id": "SRDINV28A",
      "status": "done",
      "title": "Generalize Spell Damage Invocation Runtime"
    },
    {
      "number": 199,
      "id": "SRDINV28B",
      "status": "done",
      "title": "Promote Pure Spell Damage Runtime"
    },
    {
      "number": 200,
      "id": "SRDINV28C",
      "status": "done",
      "title": "Promote Spell Attack Damage Runtime"
    },
    {
      "number": 201,
      "id": "SRDINV28D",
      "status": "done",
      "title": "Promote Spell Rider Timing Runtime"
    },
    {
      "number": 202,
      "id": "SRDINV28E",
      "status": "done",
      "title": "Decide Starry Wisp Object Targeting"
    },
    {
      "number": 203,
      "id": "SRDINV29A",
      "status": "done",
      "title": "Promote Burning Hands Cone Damage Runtime"
    },
    {
      "number": 204,
      "id": "SRDINV29B",
      "status": "done",
      "title": "Promote Color Spray Cone Condition Runtime"
    },
    {
      "number": 205,
      "id": "SRDINV29C",
      "status": "done",
      "title": "Promote Entangle Area Restraint Runtime"
    },
    {
      "number": 206,
      "id": "SRDINV29D",
      "status": "done",
      "title": "Promote Grease Ground Hazard Runtime"
    },
    {
      "number": 207,
      "id": "SRDINV29E",
      "status": "done",
      "title": "Promote Ice Knife Mixed Attack Burst Runtime"
    },
    {
      "number": 208,
      "id": "SRDINV29F",
      "status": "done",
      "title": "Research Chromatic Orb Chained Attack Runtime"
    },
    {
      "number": 209,
      "id": "SRDINV30A",
      "status": "done",
      "title": "Promote Simple Scalar Buff Spell Runtime"
    },
    {
      "number": 210,
      "id": "SRDINV30B",
      "status": "done",
      "title": "Promote Roll Modifier Spell Runtime"
    },
    {
      "number": 211,
      "id": "SRDINV30C",
      "status": "done",
      "title": "Promote Protection and Charm Spell Runtime"
    },
    {
      "number": 212,
      "id": "SRDINV30D",
      "status": "done",
      "title": "Promote Heroism Turn-Start Runtime"
    },
    {
      "number": 213,
      "id": "SRDINV30E",
      "status": "done",
      "title": "Promote Faerie Fire Area Reveal Runtime"
    },
    {
      "number": 214,
      "id": "SRDINV30F",
      "status": "ready-for-research",
      "title": "Promote Resistance Damage Reduction Runtime"
    },
    {
      "number": 215,
      "id": "SRDINV31A",
      "status": "done",
      "title": "Promote Divine Favor Weapon Rider Runtime"
    },
    {
      "number": 216,
      "id": "SRDINV31B",
      "status": "done",
      "title": "Promote Hunter's Mark Runtime"
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
      "number": 221,
      "id": "SRDINV32A",
      "status": "done",
      "title": "Promote Produce Flame Held Light Runtime"
    },
    {
      "number": 222,
      "id": "SRDINV32B",
      "status": "done",
      "title": "Promote Produce Flame Hurled Attack Runtime"
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
    },
    {
      "number": 225,
      "id": "SRDINV29F1",
      "status": "done",
      "title": "Model Chromatic Orb Chained Replay Facts"
    },
    {
      "number": 226,
      "id": "SRDINV29F2",
      "status": "done",
      "title": "Implement Chromatic Orb Chained Attack Runtime"
    },
    {
      "number": 227,
      "id": "SRDINV29F3",
      "status": "done",
      "title": "Admit Chromatic Orb Runtime Support"
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
| 190   | SRDINV21 - Recursive SRD Inventory Planning Review | done | SRDINV17-SRDINV20, SRDINV18A | SRDINV22-SRDINV27 | [SRDINV21 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV21_RECURSIVE_PLANNING_REVIEW.md), [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [SRD inventory Ralph batch plan](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md), [ACTIVE_PLAN](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md) | Completed recursive planning review: level-1 remains open with 13 owner-evidence-required rows and 4 catalog-only/dead-for-now rows, so the next batch is shared-algebra, character-sheet runtime, and spell-invocation runtime closure plus SRDINV27 review. |
| 191   | SRDINV18A - Close Eldritch Invocation Choice Evidence | done | SRDINV18 | SRDINV21 | [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [character-creation owner evidence](/workspace/typescript/dnd/plans/unit-profile-coverage/character-creation-owner-evidence.json), [Warlock SRD](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Warlock.md), [character-creation runtime README](/workspace/typescript/dnd/packages/character-creation-runtime/README.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Close Warlock Eldritch Invocations as actual feature-choice evidence by adding a durable invocation option catalog/discovery path and character-creation fill, finalization, build projection, manifest, and inventory evidence without treating the retained feature Unit ref as sufficient. |
| 192   | SRDINV22 - Close Shared Multiclass Primary Ability Evidence | done | SRDINV21 | SRDINV23-SRDINV27 | [SRDINV21 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV21_RECURSIVE_PLANNING_REVIEW.md), [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [shared-algebra owner evidence](/workspace/typescript/dnd/plans/unit-profile-coverage/shared-algebra-owner-evidence.json), [shared-algebras README](/workspace/typescript/dnd/packages/shared-algebras/README.md), [multiclass prerequisite algebra](/workspace/typescript/dnd/packages/shared-algebras/src/multiclass-prerequisite-algebra.ts), [multiclass prerequisite proof](/workspace/typescript/dnd/packages/shared-algebras/proofs/multiclass-prerequisite-algebra.qnt), [SRD Character Creation](/workspace/typescript/dnd/.references/srd-5.2.1/Character-Creation.md), [SRD Classes](/workspace/typescript/dnd/.references/srd-5.2.1/Classes), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Completed shared-algebra owner evidence for all 12 level-1 Primary Ability rows by deriving multiclass prerequisite checks from SRD class-container Primary Ability facts and recording checker-visible evidence without duplicating character-creation source state. |
| 193   | SRDINV23 - Promote Character-Sheet Armor Class Formula Runtime | done | SRDINV22 | SRDINV24-SRDINV27 | [SRDINV21 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV21_RECURSIVE_PLANNING_REVIEW.md), [character-sheet runtime README](/workspace/typescript/dnd/packages/character-sheet-runtime/README.md), [character-sheet runtime](/workspace/typescript/dnd/packages/character-sheet-runtime/src/index.ts), [armor class algebra](/workspace/typescript/dnd/packages/shared-algebras/src/armor-class-algebra.ts), [SRD Playing the Game](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md), [SRD Character Creation](/workspace/typescript/dnd/.references/srd-5.2.1/Character-Creation.md), [SRD Barbarian](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Barbarian.md), [SRD Monk](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Monk.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote character-sheet Armor Class derivation for base AC and Barbarian/Monk Unarmored Defense formulas, preserving the SRD rule that only one AC formula applies at a time. |
| 194   | SRDINV24 - Promote Character-Sheet Rest and Spell Slot Recovery | done | SRDINV22 | SRDINV25-SRDINV27 | [SRDINV21 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV21_RECURSIVE_PLANNING_REVIEW.md), [character-sheet runtime README](/workspace/typescript/dnd/packages/character-sheet-runtime/README.md), [character-sheet runtime](/workspace/typescript/dnd/packages/character-sheet-runtime/src/index.ts), [SRD Rules Glossary](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [SRD Character Creation](/workspace/typescript/dnd/.references/srd-5.2.1/Character-Creation.md), [SRD Wizard](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Wizard.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Completed character-sheet rest recovery for Short Rest Hit Dice spending, Long Rest HP/Hit Dice/Spell Slot restoration, Pact Slot recovery, and Wizard Arcane Recovery while keeping Spell Slot, Pact Slot, Hit Die, HP restoration, feature recharge, and Arcane Recovery slot refund facts distinct. |
| 195   | SRDINV25 - Promote Character-Sheet Healing Resource Actions | done | SRDINV22 | SRDINV26-SRDINV27 | [SRDINV21 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV21_RECURSIVE_PLANNING_REVIEW.md), [character-sheet runtime README](/workspace/typescript/dnd/packages/character-sheet-runtime/README.md), [character-sheet runtime](/workspace/typescript/dnd/packages/character-sheet-runtime/src/index.ts), [SRD Paladin](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Paladin.md), [SRD Rules Glossary](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote Lay On Hands as a character-sheet healing resource action with one pool for HP restoration and Poisoned-condition removal. |
| 196   | SRDINV26 - Close Wizard Ritual Adept Invocation Ownership | done | SRDINV22 | SRDINV27 | [SRDINV21 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV21_RECURSIVE_PLANNING_REVIEW.md), [Spell ownership surface](/workspace/typescript/dnd/plans/SPELL1_SPELL_OWNERSHIP_SURFACE.md), [character-sheet runtime README](/workspace/typescript/dnd/packages/character-sheet-runtime/README.md), [SRD Wizard](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Wizard.md), [SRD Spells](/workspace/typescript/dnd/.references/srd-5.2.1/Spells), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Completed Wizard Ritual Adept owner evidence through a character-sheet spellbook ritual invocation boundary over spellbook Spell Access, ritual-tagged Spell Definitions, and the installed spellbook Ritual Access feature. |
| 197   | SRDINV27 - Recursive SRD Inventory Planning Review | done | SRDINV22-SRDINV26 | SRDINV28A-SRDINV28E, SRDINV29A-SRDINV33 | [SRDINV27 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV27_RECURSIVE_PLANNING_REVIEW.md), [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [SRD inventory Ralph batch plan](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md), [ACTIVE_PLAN](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md) | Completed recursive planning review: level-1 inventory is complete with 144 owner-evidence-present rows and 12 non-runtime rows, so the next batch is runtime-ready authored spell execution plus SRDINV33 review. |
| 198   | SRDINV28A - Generalize Spell Damage Invocation Runtime | done | SRDINV27 | SRDINV28B-SRDINV28E, SRDINV29A-SRDINV33 | [SRDINV27 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV27_RECURSIVE_PLANNING_REVIEW.md), [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [battle-runtime spell subjects](/workspace/typescript/dnd/packages/battle-runtime/src/battle-subjects.ts), [battle-runtime reducer](/workspace/typescript/dnd/packages/battle-runtime/src/battle-reducer.ts), [SRD Spells](/workspace/typescript/dnd/.references/srd-5.2.1/Spells), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Generalized promoted spell-damage invocation refs and runtime resource plumbing so attack-roll and save-gated damage can be cantrip or spell-slot-backed with typed optional post-damage riders, creature-only target metadata, and source-derived cantrip/slot damage scaling. |
| 199   | SRDINV28B - Promote Pure Spell Damage Runtime | done | SRDINV28A | SRDINV28C-SRDINV28E, SRDINV29A-SRDINV33 | [SRDINV27 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV27_RECURSIVE_PLANNING_REVIEW.md), [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [SRD Spells](/workspace/typescript/dnd/.references/srd-5.2.1/Spells), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promoted Poison Spray, Sacred Flame, and Inflict Wounds as no-rider direct damage Spell Definitions with deterministic admission/projection and runtime evidence; Burning Hands remains in the area-targeting follow-up because this slice did not add cone target-list support. |
| 200   | SRDINV28C - Promote Spell Attack Damage Runtime | done | SRDINV28A | SRDINV28D-SRDINV28E, SRDINV29A-SRDINV33 | [SRDINV27 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV27_RECURSIVE_PLANNING_REVIEW.md), [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [battle-runtime reducer](/workspace/typescript/dnd/packages/battle-runtime/src/battle-reducer.ts), [SRD Spells](/workspace/typescript/dnd/.references/srd-5.2.1/Spells), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promoted spell attack damage without mandatory speed reduction: ranged spell attack paths remain covered, and damage-only Chill Touch now covers melee spell attack damage with checker-visible deferred healing suppression and generic-target eligibility. |
| 201   | SRDINV28D - Promote Spell Rider Timing Runtime | done | SRDINV28B-SRDINV28C | SRDINV29A-SRDINV33 | [SRDINV27 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV27_RECURSIVE_PLANNING_REVIEW.md), [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [battle-runtime active effects](/workspace/typescript/dnd/packages/battle-runtime/src/battle-reducer.ts), [SRD Spells](/workspace/typescript/dnd/.references/srd-5.2.1/Spells), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promoted typed runtime support for SRD spell riders in scope: Ray of Sickness spell-owned Poisoned expiration, Shocking Grasp Opportunity Attack denial, Guiding Bolt next attack against target Advantage, and Vicious Mockery next attack by target Disadvantage, with Chill Touch healing suppression still excluded from this slice. |
| 202   | SRDINV28E - Decide Starry Wisp Object Targeting | done | SRDINV28A-SRDINV28C | SRDINV29A-SRDINV33 | [SRDINV27 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV27_RECURSIVE_PLANNING_REVIEW.md), [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [battle-runtime target facts](/workspace/typescript/dnd/packages/battle-runtime/src/battle-reducer.ts), [SRD Starry Wisp](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md), [SRD Chill Touch](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Closed by deferring Starry Wisp support with checker-visible `needs-surface-widening` evidence: object target identity, object AC/HP damage disposition, Dim Light emission, and Invisible benefit denial remain unpromoted, while Chill Touch stays limited to its combatant-target damage subset. |
| 203   | SRDINV29A - Promote Burning Hands Cone Damage Runtime | done | SRDINV28A-SRDINV28E | SRDINV33 | [Burning Hands](/workspace/typescript/dnd/packages/surface/content/burning_hands.dhall), [SRD Spells](/workspace/typescript/dnd/.references/srd-5.2.1/Spells), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promoted Burning Hands through the self-origin Cone save-for-half boundary with caller-supplied affected targets, Dexterity save outcomes, Fire damage, slot scaling, and action/slot spend evidence. |
| 204   | SRDINV29B - Promote Color Spray Cone Condition Runtime | done | SRDINV28A-SRDINV28E | SRDINV33 | [Color Spray](/workspace/typescript/dnd/packages/surface/content/color_spray.dhall), [SRD Spells](/workspace/typescript/dnd/.references/srd-5.2.1/Spells), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promoted Color Spray through the self-origin Cone save-gated condition boundary with caller-supplied affected targets, Constitution save outcomes, spell-owned Blinded until the caster's next turn ends, and unrelated Blinded source preservation. |
| 205   | SRDINV29C - Promote Entangle Area Restraint Runtime | done | SRDINV28A-SRDINV28E | SRDINV33 | [Entangle](/workspace/typescript/dnd/packages/surface/content/entangle.dhall), [SRD Spells](/workspace/typescript/dnd/.references/srd-5.2.1/Spells), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promoted Entangle through point-origin cube affected-target saves excluding the caster, spell-owned Restrained until Concentration ends, Strength (Athletics) escape against spell save DC, and matrix-limited Difficult Terrain. |
| 206   | SRDINV29D - Promote Grease Ground Hazard Runtime | done | SRDINV28A-SRDINV28E | SRDINV33 | [Grease](/workspace/typescript/dnd/packages/surface/content/grease.dhall), [SRD Spells](/workspace/typescript/dnd/.references/srd-5.2.1/Spells), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Closed by keeping Grease unsupported in Unit profile evidence: SRD one-minute ground hazard support requires an active area lifecycle plus executable enter-area/end-turn Dexterity save procedures with table-supplied area-membership facts, and the authored on-cast Prone save is not claimed as a supported partial runtime profile. |
| 207   | SRDINV29E - Promote Ice Knife Mixed Attack Burst Runtime | done | SRDINV28A-SRDINV28E | SRDINV33 | [Ice Knife](/workspace/typescript/dnd/packages/surface/content/ice_knife.dhall), [SRD Spells](/workspace/typescript/dnd/.references/srd-5.2.1/Spells), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promoted Ice Knife through a mixed ranged spell attack plus mandatory primary-target-origin Emanation save boundary, with Piercing attack damage, Critical Hit doubling limited to attack dice, Cold burst slot scaling, primary target inclusion, and Concentration follow-up. |
| 208   | SRDINV29F - Research Chromatic Orb Chained Attack Runtime | done | SRDINV28A-SRDINV28E | SRDINV29F1 | [Chromatic Orb research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV29F_CHROMATIC_ORB_CHAINED_ATTACK_RESEARCH.md), [Chromatic Orb](/workspace/typescript/dnd/packages/surface/content/chromatic_orb.dhall), [SRD Spells](/workspace/typescript/dnd/.references/srd-5.2.1/Spells), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Completed research: Chromatic Orb needs a separate chained spell-attack replay procedure rather than widening `spellAttackDamage`; implementation is split into QNT replay facts, reducer runtime, and admission/evidence closure. |
| 209   | SRDINV30A - Promote Simple Scalar Buff Spell Runtime | done | SRDINV28A-SRDINV28E | SRDINV33 | [False Life](/workspace/typescript/dnd/packages/surface/content/false_life.dhall), [Longstrider](/workspace/typescript/dnd/packages/surface/content/longstrider.dhall), [Shield of Faith](/workspace/typescript/dnd/packages/surface/content/shield_of_faith.dhall), [SRD Spells](/workspace/typescript/dnd/.references/srd-5.2.1/Spells) | Promote simple temp HP, Speed, and AC scalar spell effects. |
| 210   | SRDINV30B - Promote Roll Modifier Spell Runtime | done | SRDINV28A-SRDINV28E | SRDINV33 | [Bane](/workspace/typescript/dnd/packages/surface/content/bane.dhall), [Bless](/workspace/typescript/dnd/packages/surface/content/bless.dhall), [Guidance](/workspace/typescript/dnd/packages/surface/content/guidance.dhall), [SRD Spells](/workspace/typescript/dnd/.references/srd-5.2.1/Spells) | Promote Bane, Bless, and Guidance as D20 roll modifier active effects. |
| 211   | SRDINV30C - Promote Protection and Charm Spell Runtime | done | SRDINV28A-SRDINV28E | SRDINV33 | [Animal Friendship](/workspace/typescript/dnd/packages/surface/content/animal_friendship.dhall), [Protection from Evil and Good](/workspace/typescript/dnd/packages/surface/content/protection_from_evil_and_good.dhall), [SRD Spells](/workspace/typescript/dnd/.references/srd-5.2.1/Spells) | Promoted Animal Friendship Beast-target Charmed application and Protection from Evil and Good attacker-creature-type attack Disadvantage, with omitted damage-break, possession, condition-immunity, and save-Advantage clauses retained as checker-visible SRDINV33 blockers. |
| 212   | SRDINV30D - Promote Heroism Turn-Start Runtime | done | SRDINV28A-SRDINV28E | SRDINV33 | [Heroism](/workspace/typescript/dnd/packages/surface/content/heroism.dhall), [SRD Spells](/workspace/typescript/dnd/.references/srd-5.2.1/Spells) | Promoted Heroism as separate Concentration Frightened immunity and target-turn-start Temporary Hit Points effects, with known-willing touch targeting, slot-level target scaling, and non-stacking Temporary Hit Points application. |
| 213   | SRDINV30E - Promote Faerie Fire Area Reveal Runtime | done | SRDINV28A-SRDINV28E | SRDINV33 | [Faerie Fire](/workspace/typescript/dnd/packages/surface/content/faerie_fire.dhall), [SRD Spells](/workspace/typescript/dnd/.references/srd-5.2.1/Spells) | Promote Faerie Fire area save-gated attack Advantage and any executable reveal/invisibility subset. |
| 214   | SRDINV30F - Promote Resistance Damage Reduction Runtime | ready-for-research | SRDINV28A-SRDINV28E | SRDINV33 | [Resistance](/workspace/typescript/dnd/packages/surface/content/resistance.dhall), [SRD Spells](/workspace/typescript/dnd/.references/srd-5.2.1/Spells) | Promote Resistance chosen damage type reduction with once-per-turn semantics. |
| 215   | SRDINV31A - Promote Divine Favor Weapon Rider Runtime | done | SRDINV28A-SRDINV28E | SRDINV33 | [Divine Favor](/workspace/typescript/dnd/packages/surface/content/divine_favor.dhall), [SRD Spells](/workspace/typescript/dnd/.references/srd-5.2.1/Spells) | Promoted Divine Favor as a self-hosted timed Radiant damage rider on caster weapon hits. |
| 216   | SRDINV31B - Promote Hunter's Mark Runtime | done | SRDINV28A-SRDINV28E | SRDINV33 | [Hunter's Mark](/workspace/typescript/dnd/packages/surface/content/hunters_mark.dhall), [SRD Spells](/workspace/typescript/dnd/.references/srd-5.2.1/Spells), [Unit profile coverage](/workspace/typescript/dnd/plans/unit-profile-coverage/README.md) | Promoted the combat subset: marked-target damage, Concentration cleanup, and zero-HP Bonus Action retargeting; SRD finding Advantage and upcast duration maxima remain checker-visible SRDINV33 follow-ups. |
| 217   | SRDINV31C - Promote Divine Smite After-Hit Runtime | ready-for-research | SRDINV28A-SRDINV28E | SRDINV33 | [Divine Smite](/workspace/typescript/dnd/packages/surface/content/divine_smite.dhall), [SRD Spells](/workspace/typescript/dnd/.references/srd-5.2.1/Spells) | Promote immediate after-hit Bonus Action smite damage without replaying the base attack. |
| 218   | SRDINV31D - Promote Ensnaring Strike Runtime | ready-for-research | SRDINV28A-SRDINV28E | SRDINV33 | [Ensnaring Strike](/workspace/typescript/dnd/packages/surface/content/ensnaring_strike.dhall), [SRD Spells](/workspace/typescript/dnd/.references/srd-5.2.1/Spells) | Promote after-hit save-gated Restrained, start-turn damage, and escape lifecycle. |
| 219   | SRDINV31E - Promote Searing Smite Runtime | ready-for-research | SRDINV28A-SRDINV28E | SRDINV33 | [Searing Smite](/workspace/typescript/dnd/packages/surface/content/searing_smite.dhall), [SRD Spells](/workspace/typescript/dnd/.references/srd-5.2.1/Spells) | Promote after-hit Fire damage plus recurring start-turn damage and save-to-end. |
| 220   | SRDINV31F - Promote True Strike Weapon Spell Runtime | ready-for-research | SRDINV28A-SRDINV28E | SRDINV33 | [True Strike](/workspace/typescript/dnd/packages/surface/content/true_strike.dhall), [SRD Spells](/workspace/typescript/dnd/.references/srd-5.2.1/Spells) | Promote spell-hosted weapon attack with spellcasting ability and damage type choice. |
| 221   | SRDINV32A - Promote Produce Flame Held Light Runtime | done | SRDINV28A-SRDINV28E | SRDINV32B, SRDINV33 | [Produce Flame](/workspace/typescript/dnd/packages/surface/content/produce_flame.dhall), [SRD Produce Flame](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-M-P.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote Produce Flame held illumination and recast expiry without coupling it to hurl resolution. |
| 222   | SRDINV32B - Promote Produce Flame Hurled Attack Runtime | done | SRDINV32A | SRDINV33 | [Produce Flame](/workspace/typescript/dnd/packages/surface/content/produce_flame.dhall), [SRD Produce Flame](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-M-P.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote the later Magic action hurl over the held flame, with object targeting either executable or explicitly unsupported. |
| 223   | SRDINV33 - Recursive SRD Inventory Planning Review | blocked | SRDINV28A-SRDINV28E, SRDINV29A-SRDINV29E, SRDINV29F3, SRDINV30A-SRDINV32B | SRDINV34 | [SRDINV27 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV27_RECURSIVE_PLANNING_REVIEW.md), [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [SRD inventory Ralph batch plan](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md), [ACTIVE_PLAN](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md) | Review the split spell-runtime closure, refresh spell Unit metrics, and append Ralph-sized follow-up tasks only after checking execution-invariant granularity. |
| 224   | SRDINV34 - Promote Starry Wisp Object Target Runtime | blocked | SRDINV33 | none | [SRDINV28E decision](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV28E_STARRY_WISP_OBJECT_TARGET_DECISION.md), [battle-runtime target facts](/workspace/typescript/dnd/packages/battle-runtime/src/battle-reducer.ts), [Starry Wisp](/workspace/typescript/dnd/packages/surface/content/starry_wisp.dhall), [Chill Touch](/workspace/typescript/dnd/packages/surface/content/chill_touch.dhall), [SRD Starry Wisp](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md), [SRD Chill Touch](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote the Starry Wisp creature-or-object target boundary only after SRDINV33 orders it against the remaining spell-runtime frontier. |
| 225   | SRDINV29F1 - Model Chromatic Orb Chained Replay Facts | done | SRDINV29F | SRDINV29F2 | [Chromatic Orb research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV29F_CHROMATIC_ORB_CHAINED_ATTACK_RESEARCH.md), [Chromatic Orb](/workspace/typescript/dnd/packages/surface/content/chromatic_orb.dhall), [battle-runtime Quint spec](/workspace/typescript/dnd/packages/battle-runtime/battle-runtime.qnt), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Added promoted QNT procedure facts and replay-hole invariants for Chromatic Orb's damage-type choice, ordered target/attack/damage steps, duplicate-face gate, target uniqueness, previous-target range, and slot-level leap cap. |
| 226   | SRDINV29F2 - Implement Chromatic Orb Chained Attack Runtime | done | SRDINV29F1 | SRDINV29F3 | [Chromatic Orb research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV29F_CHROMATIC_ORB_CHAINED_ATTACK_RESEARCH.md), [battle-runtime reducer](/workspace/typescript/dnd/packages/battle-runtime/src/battle-reducer.ts), [battle-runtime subjects](/workspace/typescript/dnd/packages/battle-runtime/src/battle-subjects.ts), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Implement the chained spell-attack reducer procedure with step-scoped holes/fills, duplicate-face continuation, target uniqueness/range rejection, damage-type reuse, reaction lifecycle composition, and one action/slot spend. |
| 227   | SRDINV29F3 - Admit Chromatic Orb Runtime Support | done | SRDINV29F2 | SRDINV33 | [Chromatic Orb research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV29F_CHROMATIC_ORB_CHAINED_ATTACK_RESEARCH.md), [Chromatic Orb](/workspace/typescript/dnd/packages/surface/content/chromatic_orb.dhall), [unit claims](/workspace/typescript/dnd/plans/unit-profile-coverage/unit-claims.jsonl), [unit evidence](/workspace/typescript/dnd/plans/unit-profile-coverage/unit-evidence.jsonl), [battle-runtime README](/workspace/typescript/dnd/packages/battle-runtime/README.md) | Admitted Chromatic Orb through the chained spell-attack procedure, closed deterministic projection/evidence, refreshed coverage artifacts and docs, and ran the promoted runtime verification lane. |

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

Status: `done`

Depends on: SRDINV17-SRDINV20, SRDINV18A

Blocks: SRDINV22-SRDINV27

Research / plan:
[SRDINV21_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV21_RECURSIVE_PLANNING_REVIEW.md),
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

Completed scope: reviewed SRDINV17-SRDINV20 plus SRDINV18A, refreshed generated
inventory recommendations, and appended the SRDINV22-SRDINV26 promoted-runtime
closure batch plus SRDINV27 recursive review. Level-1 inventory remains open
with 13 owner-evidence-required rows and 4 catalog-only/dead-for-now rows, so
the new batch converts those rows into executable owner work rather than
leaving them as passive backlog.

Verification completed: local SRD passages for multiclass prerequisites,
Primary Ability, Armor Class, Unarmored Defense, Long Rest, Short Rest, Spell
Slots, Arcane Recovery, Lay On Hands, and Ritual Adept were checked;
`UBIQUITOUS_LANGUAGE.md` was checked for the relevant owner terms; inventory
was regenerated; active-plan consistency was updated across the Ralph index,
DAG table, and task details; `pnpm unit-profile-coverage:check` passed; two
`/simplify` rounds are recorded in the SRDINV21 review artifact. MBT was not
run because this task changed planning and generated inventory recommendations
only.

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

### Task 192 - SRDINV22 - Close Shared Multiclass Primary Ability Evidence

Status: `done`

Depends on: SRDINV21

Blocks: SRDINV23-SRDINV27

Research / plan:
[SRDINV21_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV21_RECURSIVE_PLANNING_REVIEW.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[shared-algebras README](/workspace/typescript/dnd/packages/shared-algebras/README.md),
[multiclass-prerequisite-algebra.ts](/workspace/typescript/dnd/packages/shared-algebras/src/multiclass-prerequisite-algebra.ts),
[multiclass-prerequisite-algebra.qnt](/workspace/typescript/dnd/packages/shared-algebras/proofs/multiclass-prerequisite-algebra.qnt),
[Character-Creation.md](/workspace/typescript/dnd/.references/srd-5.2.1/Character-Creation.md),
[Classes](/workspace/typescript/dnd/.references/srd-5.2.1/Classes),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: close owner evidence for all 12 level-1 Primary Ability rows through
the shared multiclass prerequisite algebra. Source facts must continue to come
from class containers; this task should wire checker-visible evidence to the
existing shared algebra, tests, and QNT proof rather than duplicating Primary
Ability data in character-creation runtime.

Out of scope: character-creation build projection evidence for Primary Ability,
class-container authoring, class-feature runtime behavior, character-sheet AC,
rest recovery, spell invocation, and spell Unit runtime.

Verification: read local SRD Character Creation multiclass prerequisites and
all class Core Traits Primary Ability rows; check `UBIQUITOUS_LANGUAGE.md` for
Multiclassing, Ability Score, Class, and Character Sheet; focused
shared-algebra tests and QNT proof/check as appropriate; update
checker-visible owner evidence and regenerate inventory; `pnpm
unit-profile-coverage:check`; package-local typecheck/tests; `pnpm quality` if
production code changes; `/simplify` convergence.

### Task 193 - SRDINV23 - Promote Character-Sheet Armor Class Formula Runtime

Status: `done`

Depends on: SRDINV22

Blocks: SRDINV24-SRDINV27

Research / plan:
[SRDINV21_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV21_RECURSIVE_PLANNING_REVIEW.md),
[character-sheet runtime README](/workspace/typescript/dnd/packages/character-sheet-runtime/README.md),
[character-sheet runtime](/workspace/typescript/dnd/packages/character-sheet-runtime/src/index.ts),
[armor-class-algebra.ts](/workspace/typescript/dnd/packages/shared-algebras/src/armor-class-algebra.ts),
[Playing-the-Game.md](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md),
[Character-Creation.md](/workspace/typescript/dnd/.references/srd-5.2.1/Character-Creation.md),
[Barbarian.md](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Barbarian.md),
[Monk.md](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Monk.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote character-sheet Armor Class derivation for base AC and
class-derived Unarmored Defense formulas, closing Barbarian and Monk Unarmored
Defense level-1 rows as executable character-sheet evidence. The model must
make the SRD multiclass AC rule executable: if multiple AC formulas are
available, only one is used at a time.

Out of scope: battle-runtime attack resolution, magic-item AC, spell AC
effects, non-SRD class formulas, equipment inventory workflows beyond the
minimum sheet facts needed for AC, rest recovery, Lay On Hands, and ritual
casting.

Verification: read local SRD Armor Class, Character Creation multiclass AC,
Barbarian Unarmored Defense, and Monk Unarmored Defense passages; check
`UBIQUITOUS_LANGUAGE.md` for Armor Class, Character Sheet, Stat Block, Class
Feature, and Multiclassing; QNT/spec first if the character-sheet runtime gains
or extends a proof/spec boundary; focused character-sheet runtime tests;
update package README if behavior changes; update owner evidence and
regenerate inventory; `pnpm unit-profile-coverage:check`; package-local
typecheck/tests; `pnpm quality`; `/simplify` convergence.

### Task 194 - SRDINV24 - Promote Character-Sheet Rest and Spell Slot Recovery

Status: `done`

Depends on: SRDINV22

Blocks: SRDINV25-SRDINV27

Research / plan:
[SRDINV21_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV21_RECURSIVE_PLANNING_REVIEW.md),
[character-sheet runtime README](/workspace/typescript/dnd/packages/character-sheet-runtime/README.md),
[character-sheet runtime](/workspace/typescript/dnd/packages/character-sheet-runtime/src/index.ts),
[Rules-Glossary.md](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Character-Creation.md](/workspace/typescript/dnd/.references/srd-5.2.1/Character-Creation.md),
[Wizard.md](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Wizard.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote character-sheet rest recovery for Short Rest, Long Rest, Spell
Slot recovery, and Wizard Arcane Recovery. Keep Spell Slot, Pact Slot, Hit Die,
HP restoration, feature recharge, and Arcane Recovery slot refund facts
distinct so rest recovery does not collapse separate SRD concepts into one
state field.

Out of scope: Wizard Ritual Adept spell invocation, Lay On Hands, battle-runtime
rest behavior, arbitrary long-rest feature catalog cleanup, and spell Unit
execution.

Verification: read local SRD Short Rest, Long Rest, Hit Dice, Spell Slot,
Wizard Spellcasting, and Arcane Recovery passages; check
`UBIQUITOUS_LANGUAGE.md` for Short Rest, Long Rest, Hit Die, Spell Slot, Pact
Slot, Pool, Spend, Grant, Refund, and Character Sheet; QNT/spec first if the
character-sheet runtime gains or extends a proof/spec boundary; focused
character-sheet runtime tests; update README if behavior changes; update owner
evidence and regenerate inventory; `pnpm unit-profile-coverage:check`;
package-local typecheck/tests; `pnpm quality`; `/simplify` convergence.

### Task 195 - SRDINV25 - Promote Character-Sheet Healing Resource Actions

Status: `done`

Depends on: SRDINV22

Blocks: SRDINV26-SRDINV27

Research / plan:
[SRDINV21_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV21_RECURSIVE_PLANNING_REVIEW.md),
[character-sheet runtime README](/workspace/typescript/dnd/packages/character-sheet-runtime/README.md),
[character-sheet runtime](/workspace/typescript/dnd/packages/character-sheet-runtime/src/index.ts),
[Paladin.md](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Paladin.md),
[Rules-Glossary.md](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote Lay On Hands as a character-sheet healing resource action that
spends one healing pool for HP restoration and Poisoned-condition removal. The
healing amount and condition-removal cost must stay coupled to the same pool so
the runtime cannot represent divergent resource balances.

Out of scope: higher-level Restoring Touch, battle action economy integration
beyond the sheet-owned resource action boundary, general healing spells,
non-Poisoned condition removal, rest recovery, and spell invocation.

Verification: read local SRD Lay On Hands, Bonus Action, Hit Points, Healing,
Poisoned, Long Rest, Pool/Spend/Refund terms; check `UBIQUITOUS_LANGUAGE.md`
for Pool, Spend, Hit Points, Condition, Poisoned, Bonus Action, Character
Sheet, and Class Feature; QNT/spec first if the character-sheet runtime gains
or extends a proof/spec boundary; focused character-sheet runtime tests; update
README if behavior changes; update owner evidence and regenerate inventory;
`pnpm unit-profile-coverage:check`; package-local typecheck/tests; `pnpm
quality`; `/simplify` convergence.

### Task 196 - SRDINV26 - Close Wizard Ritual Adept Invocation Ownership

Status: `done`

Depends on: SRDINV22

Blocks: SRDINV27

Research / plan:
[SRDINV21_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV21_RECURSIVE_PLANNING_REVIEW.md),
[SPELL1_SPELL_OWNERSHIP_SURFACE.md](/workspace/typescript/dnd/plans/SPELL1_SPELL_OWNERSHIP_SURFACE.md),
[character-sheet runtime README](/workspace/typescript/dnd/packages/character-sheet-runtime/README.md),
[Wizard.md](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Wizard.md),
[Spells](/workspace/typescript/dnd/.references/srd-5.2.1/Spells),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: close Wizard Ritual Adept owner evidence through a promoted
spell-access/invocation runtime boundary. Ritual casting must be modeled as
spell invocation over spellbook Spell Access and ritual-tagged Spell
Definitions; retaining the feature Unit on a CharacterBuild remains
character-creation evidence only, not execution evidence.

Out of scope: Eldritch Invocation choice evidence already closed by SRDINV18A,
general authored executable spell rows, battle-runtime spell effects, spell
Surface blockers not needed for Ritual Adept, and treating ritual casting as a
separate Spell Definition.

Verification: read local SRD Wizard Spellcasting, Ritual Adept, spellbook, and
ritual casting passages; check `UBIQUITOUS_LANGUAGE.md` for Spell Access,
Spell Definition, Spell Slot, Magic Action, Character Sheet, Class Feature,
and invocation terms used by the implementation; QNT/spec first for the
promoted invocation boundary where applicable; focused runtime/admission tests;
update owner evidence and regenerate inventory; `pnpm unit-profile-coverage:check`;
package-local typecheck/tests; `pnpm quality` if production code changes;
`/simplify` convergence.

Completed scope: added `characterSheetSpellInvocation` for spellbook ritual
invocation. Wizard Ritual Adept is admitted only from existing build spellbook
Spell Access, a ritual-tagged Surface Spell Definition, and the installed
spellbook Ritual Access feature. The runtime reports no Spell Slot cost,
does not require preparation, requires reading the spellbook, and rejects
prepared-only, non-ritual, and missing-feature cases.

Out of scope honored: no general executable spell rows, battle-runtime spell
effects, Eldritch Invocation choice changes, separate Ritual Spell Definition,
or duplicate ritual spell list was introduced.

Verification completed: RAW/source review checked local Wizard Spellcasting,
Ritual Adept, spellbook, and Rules Glossary ritual casting text plus
`UBIQUITOUS_LANGUAGE.md`; focused character-sheet runtime tests and package
typecheck passed; owner evidence and inventory/profile artifacts were
regenerated; `pnpm unit-profile-coverage:check` passed; `pnpm quality` passed.
MBT was not run because promoted battle-runtime behavior did not change.

`/simplify` round 1: retained Ritual Adept as spell invocation over existing
spellbook Spell Access and ritual-tagged Spell Definitions instead of adding
parallel ritual state.

`/simplify` round 2: no important changes found; remaining coupling is
localized to the spellbook ritual invocation projection and evidence artifacts.

### Task 197 - SRDINV27 - Recursive SRD Inventory Planning Review

Status: `done`

Depends on: SRDINV22-SRDINV26

Blocks: SRDINV28A-SRDINV28E, SRDINV29A-SRDINV33

Research / plan:
[SRDINV27_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV27_RECURSIVE_PLANNING_REVIEW.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[SRDINV_RALPH_BATCH_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md),
[ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md)

Scope: review SRDINV22-SRDINV26 promoted-runtime closure, refresh generated
inventory metrics, and either record explicit level-1 completion or append the
next concrete batch. If level-1 is closed, evaluate the remaining spell Unit
Surface/runtime rows as the next likely frontier.

Out of scope: implementation work not captured by the newly appended batch,
PHB/XPHB pressure, broad runtime rewrites, and treating catalog admission alone
as behavior support.

Verification: active-plan consistency across Ralph index, DAG table, and task
details; regenerated inventory; `pnpm unit-profile-coverage:check`; confirm
the appended result is either explicit level-1 completion with final metrics or
a concrete promoted-runtime implementation batch; `/simplify` convergence,
minimum two rounds unless the final changeset is trivial.

Completed scope: reviewed SRDINV22-SRDINV26, refreshed generated inventory, and
recorded explicit level-1 completion. The final level-1 denominator has 156
rows: 144 `catalog-installed-owner-evidence-present` rows and 12 `non-runtime`
rows. The only uncovered level-1 row was a stale Arcane Recovery evidence
reference in the character-sheet manifest; the manifest now points at an
existing rest-recovery projection helper, so Wizard Arcane Recovery closes
through SRDINV24 character-sheet owner evidence.

The appended batch is not a recursive-only continuation. The original
`SRDINV28` spell attack/save-damage runtime frontier has been split into
`SRDINV28A` generalized spell-damage invocation, `SRDINV28B` pure damage,
`SRDINV28C` spell attack damage, `SRDINV28D` rider timing, and `SRDINV28E`
Starry Wisp object-targeting decision, followed by split `SRDINV29A`-
`SRDINV32B` spell-runtime vertical slices and `SRDINV33` recursive review.

Verification completed: local SRD source review checked the selected cantrip
and level-1 spell descriptions under `.references/srd-5.2.1/Spells`, plus
`Rules-Glossary.md`, `Playing-the-Game.md`, and `UBIQUITOUS_LANGUAGE.md`;
generated inventory was refreshed; `pnpm unit-profile-coverage:check` passed;
`pnpm quality` passed. MBT was not run because SRDINV27 changed planning and
inventory evidence artifacts only, not battle-runtime behavior.

`/simplify` round 1: fixed the stale Arcane Recovery evidence reference instead
of adding duplicate inventory state or overriding generated classifications.

`/simplify` round 2: selected runtime-ready authored spell follow-up rows as
the next frontier while leaving Spell Surface blockers, installed unsupported
spell rows, missing Detect spell records, and catalog-only/dead-for-now rows
counted for SRDINV33.

`/simplify` round 3: split the spell-runtime batch by execution invariant
rather than by class list or individual spell row; no important changes found.

### Task 198 - SRDINV28A - Generalize Spell Damage Invocation Runtime

Status: `done`

Depends on: SRDINV27

Blocks: SRDINV28B-SRDINV28E, SRDINV29A-SRDINV33

Research / plan:
[SRDINV27_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV27_RECURSIVE_PLANNING_REVIEW.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[battle-subjects.ts](/workspace/typescript/dnd/packages/battle-runtime/src/battle-subjects.ts),
[battle-reducer.ts](/workspace/typescript/dnd/packages/battle-runtime/src/battle-reducer.ts),
[rule-core-spells.mbt.test.ts](/workspace/typescript/dnd/packages/battle-runtime/src/rule-core-spells.mbt.test.ts),
[Spells](/workspace/typescript/dnd/.references/srd-5.2.1/Spells),
[Rules-Glossary.md](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Context for a fresh implementer: old `SRDINV28` tried to promote Burning
Hands, Chill Touch, Guiding Bolt, Inflict Wounds, Poison Spray, Ray of
Sickness, Sacred Flame, Shocking Grasp, Starry Wisp, and Vicious Mockery in
one task. That was too broad because the existing runtime shape is narrower
than the Surface records:

- `spellAttackDamage` is currently a cantrip invocation and its support profile
  assumes the Ray of Frost shape: ranged spell attack, damage, and a mandatory
  `speedReduction` rider.
- `saveGatedDamage` is currently a cantrip invocation and assumes the Acid
  Splash shape: point-origin Sphere targets, cantrip damage, and optional half
  damage.
- `SpellInvocationRef` only allows `spellAttackDamage` and `saveGatedDamage`
  under the `cantrip` tag; spell-slot procedures do not include those damage
  shapes.
- `supportedSpellActs` discovers prepared spell-slot damage separately from
  cantrip attack/save damage, so adding individual spells without first
  generalizing the invocation model will either duplicate logic or encode
  false assumptions.

Scope: generalize the promoted battle-runtime spell-damage invocation model so
attack-roll and save-gated damage can be represented for both class cantrips
and prepared spell-slot invocations. Keep this slice about procedure shape and
resource/spend/subject plumbing, not about admitting every selected spell.
Make the model express:

- cantrip and spell-slot backed spell attack damage;
- cantrip and spell-slot backed save-gated damage;
- optional, typed post-damage riders instead of a mandatory speed rider;
- target shape metadata narrow enough to reject unsupported area/object forms;
- slot scaling and cantrip scaling as source-derived damage expressions.

Out of scope: concrete rider behavior, object targets, Chromatic Orb/Color
Spray/Entangle/Grease/Ice Knife, buffs/debuffs/protection spells, Produce
Flame held-light state, PHB/XPHB pressure, and catalog admission as behavior
support.

Verification: RAW/source review for Spell, Magic action, Spell Slot, Spell
Attack, Saving Throw, damage, cantrip scaling, and using a higher-level Spell
Slot; `UBIQUITOUS_LANGUAGE.md` check for Spell Definition, Spell Invocation,
Spell Effect, Spell Attack, Attack Roll, Saving Throw, Base Spell Level, and
Using a Higher-Level Spell Slot; focused unit tests proving old Ray of Frost,
Acid Splash, Magic Missile, healing, Mage Armor, Shield, and Ready Spell lanes
still discover/resolve; focused tests for the new generalized invocation refs;
`pnpm unit-profile-coverage:check`; `pnpm quality`; promoted battle-runtime MBT
only if the final implementation changes promoted battle-runtime behavior;
`/simplify` convergence, minimum two rounds.

### Task 199 - SRDINV28B - Promote Pure Spell Damage Runtime

Status: `done`

Depends on: SRDINV28A

Blocks: SRDINV28C-SRDINV28E, SRDINV29A-SRDINV33

Research / plan:
[SRDINV27_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV27_RECURSIVE_PLANNING_REVIEW.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[battle-reducer.ts](/workspace/typescript/dnd/packages/battle-runtime/src/battle-reducer.ts),
[Poison Spray](/workspace/typescript/dnd/packages/surface/content/poison_spray.dhall),
[Sacred Flame](/workspace/typescript/dnd/packages/surface/content/sacred_flame.dhall),
[Inflict Wounds](/workspace/typescript/dnd/packages/surface/content/inflict_wounds.dhall),
[Burning Hands](/workspace/typescript/dnd/packages/surface/content/burning_hands.dhall),
[Spells](/workspace/typescript/dnd/.references/srd-5.2.1/Spells),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: admit the simplest damage-only rows after `SRDINV28A` establishes the
shared invocation model. Start with spells whose executable behavior is damage
plus existing target/fill machinery, with no post-hit or post-fail rider:

- Poison Spray: cantrip ranged spell attack, one creature target, Poison damage
  with character-level cantrip scaling.
- Sacred Flame: cantrip one-creature Dexterity save, Radiant damage on fail,
  no damage on success; cover denial remains table/spatial agenda unless the
  runtime already has an executable cover model.
- Inflict Wounds: level-1 prepared spell, touch target, Constitution save,
  Necrotic damage on fail and half damage on success, slot scaling.
- Burning Hands only if the slice includes an executable self-origin Cone
  target-list/fact boundary; otherwise keep it blocked for the area-targeting
  task instead of weakening the model.

Out of scope: riders, condition application, Opportunity Attack denial,
healing suppression, object targets, next-attack advantage/disadvantage,
generic area geometry beyond the minimum chosen for Burning Hands, and
catalog-only support claims.

Verification: focused tests for discovery, target/fill validation, damage
roll validation, HP damage, save success/failure damage, cantrip scaling,
slot scaling, action/spell-slot spend, concentration damage follow-up where
already supported, `unit-evidence.jsonl`/claim updates for admitted rows,
`pnpm unit-profile-coverage:check`; `pnpm quality`; MBT only after runtime
behavior is complete and one promoted integrated run is justified.

### Task 200 - SRDINV28C - Promote Spell Attack Damage Runtime

Status: `done`

Depends on: SRDINV28A

Blocks: SRDINV28D-SRDINV28E, SRDINV29A-SRDINV33

Research / plan:
[SRDINV27_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV27_RECURSIVE_PLANNING_REVIEW.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[battle-reducer.ts](/workspace/typescript/dnd/packages/battle-runtime/src/battle-reducer.ts),
[Chill Touch](/workspace/typescript/dnd/packages/surface/content/chill_touch.dhall),
[Shocking Grasp](/workspace/typescript/dnd/packages/surface/content/shocking_grasp.dhall),
[Guiding Bolt](/workspace/typescript/dnd/packages/surface/content/guiding_bolt.dhall),
[Ray of Sickness](/workspace/typescript/dnd/packages/surface/content/ray_of_sickness.dhall),
[Starry Wisp](/workspace/typescript/dnd/packages/surface/content/starry_wisp.dhall),
[Spells](/workspace/typescript/dnd/.references/srd-5.2.1/Spells),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote spell attack damage independent of Ray of Frost's speed rider.
The runtime must support:

- melee spell attacks and ranged spell attacks as distinct authored attack
  kinds;
- cantrip damage scaling and level-1 slot damage scaling;
- spell attack roll holes, hit/miss resolution, critical damage dice, Shield
  reaction windows, miss-to-hit replacement integration, damage resistance/
  immunity/vulnerability, concentration damage follow-up, and zero-HP damage
  disposition as already supported for spell damage;
- damage-only admission for spells whose riders are intentionally deferred.

Recommended first admitted set: Poison Spray if not already covered by
`SRDINV28B`, Chill Touch as damage-only with the healing-suppression rider kept
unsupported until `SRDINV28D`, and any damage-only spell attack that does not
require object targets. Guiding Bolt, Shocking Grasp, Ray of Sickness, and
Starry Wisp may be partially exercised for damage shape, but must not receive
full supported evidence until their riders/object targeting are executable or
explicitly excluded.

Out of scope: rider effects, object targets, area/chain damage, smites/weapon
attack riders, and claiming full support for spells whose SRD text includes
unimplemented rider behavior unless the row is explicitly documented as a
partial/damage-only admission with checker-visible limits.

Verification: focused runtime tests for ranged and melee spell attack damage,
critical hit damage, miss no-damage behavior, Shield reaction interaction,
damage type adjustment, scaling, and action/spell-slot spend; matrix/evidence
updates must distinguish full support from rider-deferred support; `pnpm
unit-profile-coverage:check`; `pnpm quality`; MBT only after completed runtime
behavior changes.

### Task 201 - SRDINV28D - Promote Spell Rider Timing Runtime

Status: `done`

Depends on: SRDINV28B-SRDINV28C

Blocks: SRDINV29A-SRDINV33

Research / plan:
[SRDINV27_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV27_RECURSIVE_PLANNING_REVIEW.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[battle-reducer.ts](/workspace/typescript/dnd/packages/battle-runtime/src/battle-reducer.ts),
[Shocking Grasp](/workspace/typescript/dnd/packages/surface/content/shocking_grasp.dhall),
[Guiding Bolt](/workspace/typescript/dnd/packages/surface/content/guiding_bolt.dhall),
[Ray of Sickness](/workspace/typescript/dnd/packages/surface/content/ray_of_sickness.dhall),
[Vicious Mockery](/workspace/typescript/dnd/packages/surface/content/vicious_mockery.dhall),
[Chill Touch](/workspace/typescript/dnd/packages/surface/content/chill_touch.dhall),
[Spells](/workspace/typescript/dnd/.references/srd-5.2.1/Spells),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: model the simple riders that made old `SRDINV28` fail as a separate
typed runtime slice. Use SRD-specific expiration anchors rather than one shared
caster-start boundary. Cover only riders that can be encoded without broad
buff/debuff infrastructure:

- Ray of Sickness: apply Poisoned until the end of the caster's next turn.
- Shocking Grasp: deny Opportunity Attacks until the start of the target's next
  turn.
- Guiding Bolt: the next attack roll against the target before the end of the
  caster's next turn has Advantage.
- Vicious Mockery: on failed Wisdom save, Psychic damage plus Disadvantage on
  the target's next attack roll before the end of its next turn.
- Chill Touch only if healing suppression has a precise active-effect model;
  otherwise keep it damage-only or unsupported with explicit evidence.

Condition riders must preserve unrelated pre-existing conditions when the
spell effect expires. Represent condition application ownership/source in the
active-effect model or an equivalent typed composition so one expiring spell
cannot remove another source's condition. Vicious Mockery support gates must
prove the authored modifier is specifically the target's next attack roll
before the end of its next turn; do not infer attack-roll behavior from
`disadvantage` mode and `count` alone.

Out of scope: generic buff/debuff framework, Bless/Bane/Faerie Fire/Shield of
Faith, Produce Flame light state, object targets, and area/chain spell support.

Verification: tests for each distinct expiration anchor: end of caster's next
turn, start of target's next turn, target's next attack before end of target's
next turn, and next attack against target before end of caster's next turn.
Include overlapping-condition/source tests so an expiring spell-owned Poisoned
condition cannot erase another source's Poisoned condition. Add focused tests
for Vicious Mockery's attack-roll-only disadvantage. Update claims/evidence
only for spells whose complete selected behavior is executable; `pnpm
unit-profile-coverage:check`; `pnpm quality`; MBT only after complete runtime
behavior changes.

### Task 202 - SRDINV28E - Decide Starry Wisp Object Targeting

Status: `done`

Depends on: SRDINV28A-SRDINV28C

Blocks: SRDINV29A-SRDINV33

Research / plan:
[SRDINV27_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV27_RECURSIVE_PLANNING_REVIEW.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[battle-reducer.ts](/workspace/typescript/dnd/packages/battle-runtime/src/battle-reducer.ts),
[Starry Wisp](/workspace/typescript/dnd/packages/surface/content/starry_wisp.dhall),
[Chill Touch](/workspace/typescript/dnd/packages/surface/content/chill_touch.dhall),
[SRD Starry Wisp](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md),
[SRD Chill Touch](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: make the spell object/non-combatant target decision executable and
checker-visible. Current battle-runtime target facts are combatant-oriented;
do not claim Starry Wisp object targeting or Chill Touch's generic
non-combatant target eligibility as metadata if the fill path cannot select or
validate that target kind. Choose one of these outcomes and encode it in
plan/evidence:

- implement object target fill/fact support sufficient for Starry Wisp's
  "one creature or object within range" targeting, with object identity,
  range/spatial fact validation, attack roll, damage disposition, and clear
  statement of what object HP/illumination/invisibility semantics are
  executable now; include an explicit decision for whether the same target
  facts also cover Chill Touch's generic "target within reach" wording; or
- keep Starry Wisp out of supported runtime evidence and keep Chill Touch as a
  combatant-target profile subset, recording the exact object-target,
  non-combatant-target, and rider blockers in the matrix/claims.

Out of scope: broad object simulation, general illumination simulation,
Produce Flame held-light state, Fire Bolt object ignition, and inventory-wide
object support.

Verification: if object or non-combatant targets are implemented, add focused
tests for target discovery/fill validation, attack hit/miss, damage, and
rejection of unsupported target semantics. If deferred, add checker-visible
claims/evidence showing Starry Wisp remains unsupported for object targeting,
Chill Touch remains a combatant-target subset, and no support row
is accidentally admitted. In either branch run `pnpm unit-profile-coverage:check`
and `pnpm quality`; MBT only if promoted battle-runtime behavior changes.

### Task 203 - SRDINV29A - Promote Burning Hands Cone Damage Runtime

Status: `done`

Depends on: SRDINV28A-SRDINV28E

Blocks: SRDINV33

Scope: promote Burning Hands as the smallest self-origin Cone save-for-half
damage slice. Keep area membership table/caller supplied; do not add grid,
cover, LOS, or pathfinding. Verification must cover RAW, cone target fill,
Dexterity save success/failure, Fire damage, slot scaling, action/slot spend,
QNT parity if promoted behavior changes, `pnpm unit-profile-coverage:check`,
`pnpm quality`, and `/simplify`.

Closed with deterministic admission/projection, package-local runtime tests,
package-local Quint facts/tests, inventory evidence, `pnpm unit-profile-coverage:check`,
`pnpm quality`, promoted battle-runtime MBT, and two simplify/self-review passes.

### Task 204 - SRDINV29B - Promote Color Spray Cone Condition Runtime

Status: `done`

Depends on: SRDINV28A-SRDINV28E

Blocks: SRDINV33

Scope: promote Color Spray as self-origin Cone Constitution save into
spell-owned Blinded until the end of the caster's next turn. Reuse a cone fact
boundary if SRDINV29A creates one, but keep condition source ownership and
expiration tested explicitly. Do not erase unrelated Blinded sources.

Closed with deterministic admission/projection, package-local runtime tests,
package-local Quint facts/tests, inventory evidence, `pnpm unit-profile-coverage:check`,
`pnpm quality`, and source-owned condition expiration coverage.

### Task 205 - SRDINV29C - Promote Entangle Area Restraint Runtime

Status: `done`

Depends on: SRDINV28A-SRDINV28E

Blocks: SRDINV33

Completed: promoted Entangle's point-origin cube save with caster exclusion,
spell-owned Restrained until Concentration ends, Strength (Athletics) escape
against spell save DC, and inventory evidence that keeps Difficult Terrain as
table/spatial agenda rather than executable persistent ground movement cost.

### Task 206 - SRDINV29D - Promote Grease Ground Hazard Runtime

Status: `done`

Depends on: SRDINV28A-SRDINV28E

Blocks: SRDINV33

Completed: Grease remains unsupported in Unit profile evidence. The authored
surface record still captures the on-cast Dexterity save to apply Prone, but
the SRD one-minute ground hazard also requires recurring Dexterity saves for
creatures that enter the area or end turns there. Promoted battle runtime does
not yet have an active area lifecycle or table-supplied area-membership fact
boundary for those later events, so Task 206 does not claim a supported partial
runtime profile from inert area metadata.

### Task 207 - SRDINV29E - Promote Ice Knife Mixed Attack Burst Runtime

Status: `done`

Depends on: SRDINV28A-SRDINV28E

Blocks: SRDINV33

Scope: promote Ice Knife as primary ranged spell attack plus mandatory burst
save. The burst happens on hit or miss, is anchored on the primary target, and
must include that primary target in the save set. Cover Piercing hit damage,
Cold burst damage, slot scaling, and concentration damage follow-up.

Retry guidance from rejected attempt: the primary attack is a spell attack and
must support critical hits. Critical hits double only the 1d10 Piercing attack
dice on a hit; the Cold burst save damage is not part of the attack critical.

Completed with promoted battle-runtime support for Ice Knife's mixed ranged
spell attack plus mandatory primary-target-origin Emanation save, including
primary target inclusion, Cold slot scaling, zero-HP replacement dispositions,
and Concentration follow-up for damaged targets.

### Task 208 - SRDINV29F - Research Chromatic Orb Chained Attack Runtime

Status: `done`

Depends on: SRDINV28A-SRDINV28E

Blocks: SRDINV29F1

Research / plan:
[SRDINV29F_CHROMATIC_ORB_CHAINED_ATTACK_RESEARCH.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV29F_CHROMATIC_ORB_CHAINED_ATTACK_RESEARCH.md)

Scope: research Chromatic Orb as a separate state-machine problem before
implementation. It needs chosen damage type, duplicate-face damage-roll gate,
a possible new target hole after each qualifying hit, target uniqueness across
the casting, and a slot-level maximum leap count. If this cannot fit one clean
vertical slice, split it again and do not claim support.

Restore-source guidance: inspect the deleted Core/prototype implementations in
git history before designing the new promoted reducer path. Useful starting
points include `git show 3066c771:packages/core/src/features/spell-evocation.ts`,
`git show 3066c771:packages/core/src/features/spell-evocation.test.ts`,
`git show 1f192c9c:packages/surface-runtime-correction/src/runtime-holes.test.ts`,
and `git show 1f192c9c:packages/surface-runtime-correction/MBT_TO_REDUCER_GRAPH.md`.

Retry guidance from rejected attempt: metadata such as
`continueOnDuplicateDamageFaces` is not enough. The runtime must actually detect
duplicate d8 faces, open the next target hole, enforce the previous-target
30-foot spatial fact, exclude already-targeted creatures, and replay attack and
damage per leap up to the slot-level cap. Also avoid widening every prepared
`spellAttackDamage`/`saveGatedDamage` invocation ref with `damageType` unless
`spellSlotInvocationRef` and all exported helper callers are updated to produce
the same ref shape; otherwise existing prepared spell subjects regress.

Completed with research showing Chromatic Orb needs a separate chained
spell-attack replay procedure. Follow-up work is split into SRDINV29F1 QNT
replay facts, SRDINV29F2 reducer runtime, and SRDINV29F3 admission/evidence
closure; do not claim Chromatic Orb support through the existing
`spellAttackDamage` procedure.

### Task 209 - SRDINV30A - Promote Simple Scalar Buff Spell Runtime

Status: `done`

Depends on: SRDINV28A-SRDINV28E

Blocks: SRDINV33

Scope: promote False Life, Longstrider, and Shield of Faith as scalar temp HP,
Speed, and AC spell effects. Keep this separate from D20 roll modifiers,
creature-type protection, and recurring turn-start effects.

### Task 210 - SRDINV30B - Promote Roll Modifier Spell Runtime

Status: `done`

Depends on: SRDINV28A-SRDINV28E

Blocks: SRDINV33

Scope: promote Bane, Bless, and Guidance as D20 roll modifier effects. Cover
save-gated negative modifiers, unconditional positive modifiers, concentration,
skill filtering where authored, and slot-scaled target counts.

### Task 211 - SRDINV30C - Promote Protection and Charm Spell Runtime

Status: `done`

Depends on: SRDINV28A-SRDINV28E

Blocks: SRDINV33

Scope: promoted Animal Friendship and Protection from Evil and Good only for
executable creature-type-scoped charm/protection clauses. Checker-visible
blockers remain recorded for omitted possession, condition-immunity,
save-advantage, and damage-break clauses.

### Task 212 - SRDINV30D - Promote Heroism Turn-Start Runtime

Status: `done`

Depends on: SRDINV28A-SRDINV28E

Blocks: SRDINV33

Scope: promoted Heroism's Frightened immunity plus recurring target-turn-start
Temporary Hit Points as distinct runtime active effects, with known-willing
touch targeting, slot-level target scaling, Concentration cleanup, and
non-stacking Temporary Hit Points tests.

### Task 213 - SRDINV30E - Promote Faerie Fire Area Reveal Runtime

Status: `done`

Depends on: SRDINV28A-SRDINV28E

Blocks: SRDINV33

Scope: promote Faerie Fire's area save-gated attack Advantage and any
executable reveal/invisibility subset. Object outline, Dim Light, and Invisible
benefit denial must be implemented or recorded as explicit blockers.

### Task 214 - SRDINV30F - Promote Resistance Damage Reduction Runtime

Status: `ready-for-research`

Depends on: SRDINV28A-SRDINV28E

Blocks: SRDINV33

Scope: promote Resistance as chosen-damage-type reduction with once-per-turn
semantics. Do not claim support if the per-turn usage cap is not executable.

### Task 215 - SRDINV31A - Promote Divine Favor Weapon Rider Runtime

Status: `done`

Depends on: SRDINV28A-SRDINV28E

Blocks: SRDINV33

Scope: promoted Divine Favor as self-hosted extra Radiant damage on caster
weapon hits for the timed duration.

### Task 216 - SRDINV31B - Promote Hunter's Mark Runtime

Status: `done`

Depends on: SRDINV28A-SRDINV28E

Blocks: SRDINV33

Scope: promote Hunter's Mark as mark identity, extra Force damage on attack
roll hits against the mark, Concentration, and Bonus Action retargeting after
the mark drops to 0 HP. The matrix claim is intentionally
`profile-subset-supported`: SRD Wisdom (Perception or Survival) Advantage to
find the marked target and slot-scaled maximum Concentration durations remain
deferred to SRDINV33 follow-up planning.

SRDINV31 rider profile policy: keep Divine Favor and Hunter's Mark in separate
profiles because they have different executable procedure shapes. Divine Favor
is a timed self-hosted weapon-hit damage rider. Hunter's Mark is a combat mark
with Attack Roll damage and zero-HP transfer. SRDINV31C-SRDINV31F must not reuse
either profile for immediate after-hit smites, start-turn/save-to-end ongoing
lifecycles, or spell-hosted weapon attacks; those shapes require distinct
profile rows when promoted.

QNT/MBT policy: update `packages/battle-runtime/battle-runtime.qnt` whenever an
SRDINV31 task changes promoted state facts, active-effect lifecycles,
resource/turn sequencing, or cross-event damage. Deterministic
admission/projection tests are enough for catalog support gates. Add
battle-runtime MBT only for sequencing/state-space risk such as after-hit
windows, transfer timing, Concentration breaks, or recurring start-turn loops.

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

### Task 221 - SRDINV32A - Promote Produce Flame Held Light Runtime

Status: `done`

Depends on: SRDINV28A-SRDINV28E

Blocks: SRDINV32B, SRDINV33

Scope: promote Produce Flame as held illumination: Bonus Action cast, one held
flame state, Bright Light and Dim Light facts, timed duration, and ending on
recast. Keep hurl resolution out of this slice.

### Task 222 - SRDINV32B - Promote Produce Flame Hurled Attack Runtime

Status: `done`

Depends on: SRDINV32A

Blocks: SRDINV33

Scope: promote the later Magic action hurl over the held-flame state: ranged
spell attack, Fire damage, cantrip scaling, and supported target subset. Object
targeting must be executable or checker-visible unsupported.

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

### Task 225 - SRDINV29F1 - Model Chromatic Orb Chained Replay Facts

Status: `done`

Depends on: SRDINV29F

Blocks: SRDINV29F2

Research / plan:
[SRDINV29F_CHROMATIC_ORB_CHAINED_ATTACK_RESEARCH.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV29F_CHROMATIC_ORB_CHAINED_ATTACK_RESEARCH.md),
[Chromatic Orb](/workspace/typescript/dnd/packages/surface/content/chromatic_orb.dhall),
[battle-runtime.qnt](/workspace/typescript/dnd/packages/battle-runtime/battle-runtime.qnt),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: add promoted QNT procedure facts and replay-hole invariants for
Chromatic Orb's chained Spell Invocation: one damage-type choice reused by all
steps, ordered target/attack/damage steps, duplicate d8 face detection, target
uniqueness across the casting, previous-target 30-foot range facts, and
slot-level leap cap. Do not claim Surface admission or runtime support yet.

Verification: RAW trace to local SRD 5.2.1 Chromatic Orb, Attack Roll, Damage
Roll, Critical Hit, Damage Types, Target, and Using a Higher-Level Spell Slot
text; `UBIQUITOUS_LANGUAGE.md` term check; focused QNT tests/proofs for replay
facts and invariants; `pnpm quality`; MBT only if promoted runtime behavior
changes; `/simplify` convergence, minimum two rounds.

### Task 226 - SRDINV29F2 - Implement Chromatic Orb Chained Attack Runtime

Status: `done`

Depends on: SRDINV29F1

Blocks: SRDINV29F3

Research / plan:
[SRDINV29F_CHROMATIC_ORB_CHAINED_ATTACK_RESEARCH.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV29F_CHROMATIC_ORB_CHAINED_ATTACK_RESEARCH.md),
[battle-runtime reducer](/workspace/typescript/dnd/packages/battle-runtime/src/battle-reducer.ts),
[battle-runtime subjects](/workspace/typescript/dnd/packages/battle-runtime/src/battle-subjects.ts),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: implement a chained spell-attack reducer procedure for Chromatic Orb
with a dedicated damage-type fill, step-scoped target/attack/damage holes,
duplicate-face continuation, target uniqueness and previous-target range
rejection, damage-type reuse, per-step hit/miss/damage handling, Concentration
and zero-HP follow-ups, existing reaction lifecycle composition, and exactly one
Magic action and Spell Slot spend when the invocation resolves. Do not widen
`SpellInvocationRef` with the chosen damage type.

Verification: focused reducer tests for no duplicate, duplicate with exhausted
leap budget, duplicate opening a leap target hole, target uniqueness rejection,
previous-target 30-foot rejection, miss stopping the chain, Critical Hit dice
doubling, damage-type reuse, Concentration follow-up, zero-HP disposition, and
one action/slot spend; parity with SRDINV29F1 QNT facts; `pnpm quality`; Tier 1
battle-runtime MBT only after code changes are complete; `/simplify`
convergence, minimum two rounds.

### Task 227 - SRDINV29F3 - Admit Chromatic Orb Runtime Support

Status: `done`

Depends on: SRDINV29F2

Blocks: SRDINV33

Research / plan:
[SRDINV29F_CHROMATIC_ORB_CHAINED_ATTACK_RESEARCH.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV29F_CHROMATIC_ORB_CHAINED_ATTACK_RESEARCH.md),
[Chromatic Orb](/workspace/typescript/dnd/packages/surface/content/chromatic_orb.dhall),
[unit claims](/workspace/typescript/dnd/plans/unit-profile-coverage/unit-claims.jsonl),
[unit evidence](/workspace/typescript/dnd/plans/unit-profile-coverage/unit-evidence.jsonl),
[battle-runtime README](/workspace/typescript/dnd/packages/battle-runtime/README.md),
[battle-runtime architecture graph](/workspace/typescript/dnd/packages/battle-runtime/ARCHITECTURE_GRAPH.md)

Scope: parse `chromatic_orb` through the new chained spell-attack support
profile, add deterministic admission/projection evidence, update
`unit-claims.jsonl`, `unit-evidence.jsonl`, generated matrix/report artifacts,
`packages/battle-runtime/README.md`, and
`packages/battle-runtime/ARCHITECTURE_GRAPH.md`, then close Chromatic Orb as
promoted only when the complete chained procedure is executable.

Verification: deterministic admission/projection tests proving existing
`spellAttackDamage` and `saveGatedDamage` subjects are not widened by a
damage-type choice ref; `pnpm unit-profile-coverage:check`; `pnpm quality`;
Tier 1 battle-runtime MBT; `/simplify` convergence, minimum two rounds.
