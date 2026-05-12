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
      "number": 248,
      "id": "SRDINV55",
      "status": "blocked",
      "title": "Recursive SRD Inventory Planning Review"
    },
    {
      "number": 252,
      "id": "SRDINV50D1",
      "status": "done",
      "title": "Promote Command Approach Route Runtime"
    },
    {
      "number": 253,
      "id": "SRDINV50D2",
      "status": "done",
      "title": "Promote Command Flee Route Runtime"
    },
    {
      "number": 254,
      "id": "SRDINV56A",
      "status": "done",
      "title": "Promote Feather Fall Reaction Invocation Runtime"
    },
    {
      "number": 255,
      "id": "SRDINV56B",
      "status": "ready-for-implementation-after-light-research",
      "title": "Promote Feather Fall Landing Cleanup Runtime"
    },
    {
      "number": 256,
      "id": "SRDINV57",
      "status": "blocked",
      "title": "Promote Grease Difficult Terrain Movement Boundary"
    },
    {
      "number": 257,
      "id": "SRDINV58A",
      "status": "blocked",
      "title": "Promote Faerie Fire Invisible-Denial Runtime"
    },
    {
      "number": 258,
      "id": "SRDINV58B",
      "status": "blocked",
      "title": "Research Faerie Fire Object Outline and Dim Light Boundary"
    },
    {
      "number": 259,
      "id": "SRDINV59A",
      "status": "blocked",
      "title": "Promote Starry Wisp Dim Light Rider Runtime"
    },
    {
      "number": 260,
      "id": "SRDINV59B",
      "status": "blocked",
      "title": "Promote Starry Wisp Invisible-Denial Rider Runtime"
    },
    {
      "number": 261,
      "id": "SRDINV60A",
      "status": "blocked",
      "title": "Promote Protection from Evil and Good Condition Prevention"
    },
    {
      "number": 262,
      "id": "SRDINV60B",
      "status": "blocked",
      "title": "Promote Protection from Evil and Good Scoped Save Advantage"
    },
    {
      "number": 263,
      "id": "SRDINV61",
      "status": "blocked",
      "title": "Promote Animal Friendship Damage-Break Cleanup"
    },
    {
      "number": 264,
      "id": "SRDINV62",
      "status": "blocked",
      "title": "Promote Hunter's Mark Upcast Duration Maxima"
    },
    {
      "number": 265,
      "id": "SRDINV63",
      "status": "blocked",
      "title": "Research Hunter's Mark Finding-Advantage Boundary"
    },
    {
      "number": 266,
      "id": "SRDINV64",
      "status": "blocked",
      "title": "Promote Chill Touch Healing-Prevention Rider"
    },
    {
      "number": 267,
      "id": "SRDINV65",
      "status": "blocked",
      "title": "Promote Shocking Grasp Opportunity Attack Denial"
    },
    {
      "number": 268,
      "id": "SRDINV66",
      "status": "blocked",
      "title": "Recursive SRD Inventory Planning Review"
    },
    {
      "number": 269,
      "id": "SRDINV67",
      "status": "blocked",
      "title": "Promote Produce Flame Object Hurl Runtime"
    },
    {
      "number": 270,
      "id": "SRDINV68A",
      "status": "blocked",
      "title": "Promote Sleep Damage Cleanup Runtime"
    },
    {
      "number": 271,
      "id": "SRDINV68B",
      "status": "blocked",
      "title": "Promote Sleep Shake-Awake Cleanup Runtime"
    },
    {
      "number": 272,
      "id": "SRDINV69A",
      "status": "blocked",
      "title": "Promote Hellish Rebuke Reaction Trigger Runtime"
    },
    {
      "number": 273,
      "id": "SRDINV69B",
      "status": "blocked",
      "title": "Promote Hellish Rebuke Save Damage Runtime"
    },
    {
      "number": 274,
      "id": "SRDINV70A",
      "status": "blocked",
      "title": "Research Light and Illumination Runtime Boundary"
    },
    {
      "number": 275,
      "id": "SRDINV70B",
      "status": "blocked",
      "title": "Promote Light Object Illumination Runtime"
    },
    {
      "number": 276,
      "id": "SRDINV71",
      "status": "blocked",
      "title": "Research Minor Illusion Battle Boundary"
    },
    {
      "number": 277,
      "id": "SRDINV72A",
      "status": "blocked",
      "title": "Promote Bardic Inspiration Grant Runtime"
    },
    {
      "number": 278,
      "id": "SRDINV72B",
      "status": "blocked",
      "title": "Promote Bardic Inspiration Failed D20 Test Runtime"
    },
    {
      "number": 279,
      "id": "SRDINV73A",
      "status": "blocked",
      "title": "Promote Monk Martial Arts Attack Projection"
    },
    {
      "number": 280,
      "id": "SRDINV73B",
      "status": "blocked",
      "title": "Promote Monk Martial Arts Bonus Unarmed Strike"
    },
    {
      "number": 281,
      "id": "SRDINV74A",
      "status": "blocked",
      "title": "Promote Weapon Mastery Sap Runtime"
    },
    {
      "number": 282,
      "id": "SRDINV74B",
      "status": "blocked",
      "title": "Research Weapon Mastery Cleave and Topple Split"
    },
    {
      "number": 283,
      "id": "SRDINV75A",
      "status": "blocked",
      "title": "Promote Sorcerer Innate Sorcery Activation Runtime"
    },
    {
      "number": 284,
      "id": "SRDINV75B",
      "status": "blocked",
      "title": "Promote Innate Sorcery Spell DC and Attack Projection"
    },
    {
      "number": 285,
      "id": "SRDINV76A",
      "status": "blocked",
      "title": "Research Warlock Level-1 Invocation Runtime Boundary"
    },
    {
      "number": 286,
      "id": "SRDINV76B",
      "status": "blocked",
      "title": "Promote Pact of the Blade Battle Projection"
    },
    {
      "number": 287,
      "id": "SRDINV77",
      "status": "blocked",
      "title": "Promote Ranger Favored Enemy Hunter's Mark Free Casts"
    },
    {
      "number": 288,
      "id": "SRDINV78",
      "status": "blocked",
      "title": "Recursive Level-1 Battle Feature Planning Review"
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
| 164   | QMBT69 - Recursive Unit Profile Planning Review | deferred | completed baseline | none | [QMBT66 review](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT66_RECURSIVE_PLANNING_REVIEW.md), [Unit profile coverage report](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md), [ACTIVE_PLAN](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md) | Still parked by the SRD inventory frontier instruction; completed baseline is complete, but the older QMBT queue remains deferred until that frontier resumes it. |
| 248   | SRDINV55 - Recursive SRD Inventory Planning Review | blocked | SRDINV50D1, SRDINV50D2, SRDINV56A, SRDINV56B | SRDINV57, SRDINV58A, SRDINV58B, SRDINV59A, SRDINV59B, SRDINV60A, SRDINV60B, SRDINV61, SRDINV62, SRDINV63, SRDINV64, SRDINV65, SRDINV66 | [SRDINV54 research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV54_FEATHER_FALL_FALLING_RUNTIME_BOUNDARY_RESEARCH.md), [SRDINV50 research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV50_COMMAND_OPTION_RUNTIME_SPLIT_RESEARCH.md), [SRDINV48 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV48_RECURSIVE_PLANNING_REVIEW.md), [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [ACTIVE_PLAN](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Review the closed Command, movement, and Feather Fall runtime batch, refresh spell Unit metrics, and unlock the pre-seeded deferred-clause batch only after verifying the frontier is clean. |
| 252   | SRDINV50D1 - Promote Command Approach Route Runtime | done | none | SRDINV55 | [SRDINV50 research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV50_COMMAND_OPTION_RUNTIME_SPLIT_RESEARCH.md), [Command](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md), [Movement](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md), [Speed](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promoted Approach through caller-supplied shortest/direct route execution facts and caller-supplied within-5-feet evidence; no pathfinding derivation. |
| 253   | SRDINV50D2 - Promote Command Flee Route Runtime | done | none | SRDINV55 | [SRDINV50 research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV50_COMMAND_OPTION_RUNTIME_SPLIT_RESEARCH.md), [Command](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md), [Movement](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md), [Speed](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Opportunity Attacks](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote Flee only through caller-supplied fastest-available moving-away route facts and actual movement-budget execution; no route AI. |
| 254   | SRDINV56A - Promote Feather Fall Reaction Invocation Runtime | done | none | SRDINV56B, SRDINV55 | [SRDINV54 research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV54_FEATHER_FALL_FALLING_RUNTIME_BOUNDARY_RESEARCH.md), [Feather Fall](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [Falling](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Reaction](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promoted table-supplied falling-trigger Reaction invocation, up-to-five falling target admission, spell effect creation, and active descent-cap projection; no falling simulator. |
| 255   | SRDINV56B - Promote Feather Fall Landing Cleanup Runtime | ready-for-implementation-after-light-research | SRDINV56A | SRDINV55 | [SRDINV54 research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV54_FEATHER_FALL_FALLING_RUNTIME_BOUNDARY_RESEARCH.md), [Feather Fall](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [Falling](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Prone](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote table-supplied landing cleanup for Feather Fall effects, preventing fall damage and Falling-hazard Prone at the same landing boundary. |
| 256   | SRDINV57 - Promote Grease Difficult Terrain Movement Boundary | blocked | SRDINV55 | SRDINV66 | [Grease](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [Movement](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md), [SRDINV41 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV41_RECURSIVE_PLANNING_REVIEW.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote Grease's ground as caller-supplied Difficult Terrain movement-cost evidence without deriving area geometry or pathfinding. |
| 257   | SRDINV58A - Promote Faerie Fire Invisible-Denial Runtime | blocked | SRDINV55 | SRDINV58B, SRDINV66 | [Faerie Fire](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [Invisible](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote the failed-save visible target rider that denies Invisible benefits for affected creatures while the outline persists. |
| 258   | SRDINV58B - Research Faerie Fire Object Outline and Dim Light Boundary | blocked | SRDINV58A | SRDINV66 | [Faerie Fire](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [Dim Light](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Object](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Decide whether noncarried object outlines and Dim Light emission are battle-runtime facts, Surface-only facts, or explicit out-of-scope environmental projection. |
| 259   | SRDINV59A - Promote Starry Wisp Dim Light Rider Runtime | blocked | SRDINV55 | SRDINV59B, SRDINV66 | [Starry Wisp](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md), [Dim Light](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [SRDINV34 decision](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV28E_STARRY_WISP_OBJECT_TARGET_DECISION.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote Starry Wisp's hit-applied Dim Light rider as a timed target-attached effect if the existing light model can execute it without duplicating visibility state. |
| 260   | SRDINV59B - Promote Starry Wisp Invisible-Denial Rider Runtime | blocked | SRDINV59A | SRDINV66 | [Starry Wisp](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md), [Invisible](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote the hit-applied Starry Wisp rider that prevents the target from benefiting from Invisible until the spell's next-turn boundary. |
| 261   | SRDINV60A - Promote Protection from Evil and Good Condition Prevention | blocked | SRDINV55 | SRDINV60B, SRDINV66 | [Protection from Evil and Good](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-M-P.md), [Charmed](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Frightened](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Possession](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote prevention of scoped-creature possession and new Charmed/Frightened application while reusing existing creature-type and condition ownership facts. |
| 262   | SRDINV60B - Promote Protection from Evil and Good Scoped Save Advantage | blocked | SRDINV60A | SRDINV66 | [Protection from Evil and Good](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-M-P.md), [Saving Throw](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote Advantage on new saves against already-applied scoped possession, Charmed, and Frightened effects without adding parallel save-modifier state. |
| 263   | SRDINV61 - Promote Animal Friendship Damage-Break Cleanup | blocked | SRDINV55 | SRDINV66 | [Animal Friendship](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md), [Charmed](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote caster-or-ally damage cleanup for Animal Friendship's Charmed effect through the existing damage/effect ownership boundary. |
| 264   | SRDINV62 - Promote Hunter's Mark Upcast Duration Maxima | blocked | SRDINV55 | SRDINV63, SRDINV66 | [Hunter's Mark](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [Concentration](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote Hunter's Mark higher-slot duration maxima and concentration-owned expiration without changing the existing weapon-hit damage path. |
| 265   | SRDINV63 - Research Hunter's Mark Finding-Advantage Boundary | blocked | SRDINV62 | SRDINV66 | [Hunter's Mark](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [Ability Check](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Decide whether the Perception/Survival finding Advantage clause is battle-runtime roll behavior, exploration-only metadata, or a caller-supplied battle check modifier. |
| 266   | SRDINV64 - Promote Chill Touch Healing-Prevention Rider | blocked | SRDINV55 | SRDINV66 | [Chill Touch](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md), [Healing](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote Chill Touch's hit-applied no-hit-point-regain rider through the existing healing resolution boundary until the caster's next turn. |
| 267   | SRDINV65 - Promote Shocking Grasp Opportunity Attack Denial | blocked | SRDINV55 | SRDINV66 | [Shocking Grasp](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md), [Opportunity Attacks](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Reaction](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote Shocking Grasp's hit-applied Opportunity Attack prevention until the target's next-turn boundary, scoped to Opportunity Attacks rather than all Reactions. |
| 268   | SRDINV66 - Recursive SRD Inventory Planning Review | blocked | SRDINV57, SRDINV58A, SRDINV58B, SRDINV59A, SRDINV59B, SRDINV60A, SRDINV60B, SRDINV61, SRDINV62, SRDINV63, SRDINV64, SRDINV65 | SRDINV67, SRDINV68A, SRDINV68B, SRDINV69A, SRDINV69B, SRDINV70A, SRDINV70B, SRDINV71, SRDINV72A, SRDINV72B, SRDINV73A, SRDINV73B, SRDINV74A, SRDINV74B, SRDINV75A, SRDINV75B, SRDINV76A, SRDINV76B, SRDINV77, SRDINV78 | [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [UNIT_REPORT](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md), [ACTIVE_PLAN](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Review the deferred-clause batch, refresh spell Unit metrics, measure remaining level-1 battle-related gaps, and unlock the pre-seeded remaining level-1 battle feature/spell batch only after resolving or explicitly deferring any review notes. |
| 269   | SRDINV67 - Promote Produce Flame Object Hurl Runtime | blocked | SRDINV66 | SRDINV78 | [Produce Flame](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-M-P.md), [Object](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Breaking Objects](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [SRDINV34 decision](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV28E_STARRY_WISP_OBJECT_TARGET_DECISION.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote Produce Flame's creature-or-object hurl target using the existing typed object target and object damage disposition boundary, without adding object inventory state. |
| 270   | SRDINV68A - Promote Sleep Damage Cleanup Runtime | blocked | SRDINV66 | SRDINV68B, SRDINV78 | [Sleep](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md), [Damage](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [SRDINV38 research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV38_SLEEP_SAVE_LOOP_RESEARCH.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote cleanup of Sleep-owned Incapacitated/Unconscious effects when the affected target takes damage from any source. |
| 271   | SRDINV68B - Promote Sleep Shake-Awake Cleanup Runtime | blocked | SRDINV68A | SRDINV78 | [Sleep](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md), [Action](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [SRDINV38 research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV38_SLEEP_SAVE_LOOP_RESEARCH.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote the adjacent action cleanup that shakes a creature out of Sleep's effect, reusing existing action and target-adjacency fact boundaries. |
| 272   | SRDINV69A - Promote Hellish Rebuke Reaction Trigger Runtime | blocked | SRDINV66 | SRDINV69B, SRDINV78 | [Hellish Rebuke](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [Reaction](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md), [Damage](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote Hellish Rebuke's damage-taken Reaction discovery/window from a visible creature within 60 feet, without resolving damage in the trigger task. |
| 273   | SRDINV69B - Promote Hellish Rebuke Save Damage Runtime | blocked | SRDINV69A | SRDINV78 | [Hellish Rebuke](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [Saving Throw](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Damage](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote Hellish Rebuke's Dexterity save, Fire damage, half damage on success, slot scaling, and Reaction/Spell Slot spend through the existing reaction continuation boundary. |
| 274   | SRDINV70A - Research Light and Illumination Runtime Boundary | blocked | SRDINV66 | SRDINV70B, SRDINV78 | [Light](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [Bright Light](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Dim Light](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Darkness](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Decide the shared battle-runtime boundary for authored light emitters before promoting Light, Produce Flame held light, Faerie Fire/Starry Wisp light riders, or Darkvision interactions further. |
| 275   | SRDINV70B - Promote Light Object Illumination Runtime | blocked | SRDINV70A | SRDINV78 | [Light](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [Object](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Bright Light](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Dim Light](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote Light as a touched Large-or-smaller object illumination effect using the researched light boundary and caller-supplied object identity facts. |
| 276   | SRDINV71 - Research Minor Illusion Battle Boundary | blocked | SRDINV66 | SRDINV78 | [Minor Illusion](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-M-P.md), [Illusions](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Study](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Decide whether Minor Illusion has battle-runtime executable state, Surface-only authored facts, or explicit non-battle closure for sound/image creation, Study reveal, and physical-interaction reveal. |
| 277   | SRDINV72A - Promote Bardic Inspiration Grant Runtime | blocked | SRDINV66 | SRDINV72B, SRDINV78 | [Bardic Inspiration](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Bard.md), [Bonus Action](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [D20 Test](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote Bardic Inspiration's Bonus Action grant, target visibility/hearing/range facts, one-die-per-creature invariant, d6 resource count, and one-hour effect ownership. |
| 278   | SRDINV72B - Promote Bardic Inspiration Failed D20 Test Runtime | blocked | SRDINV72A | SRDINV78 | [Bardic Inspiration](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Bard.md), [D20 Test](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Attack Roll](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Saving Throw](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Ability Check](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote Bardic Inspiration die use after a failed D20 Test, including roll addition, possible failure-to-success replay, and die expenditure without duplicating roll state. |
| 279   | SRDINV73A - Promote Monk Martial Arts Attack Projection | blocked | SRDINV66 | SRDINV73B, SRDINV78 | [Martial Arts](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Monk.md), [Unarmed Strike](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Weapon Attack](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote Martial Arts weapon/unarmed eligibility, d6 damage replacement, Dexterity attack/damage option, and Grapple/Shove DC projection without duplicating loadout state. |
| 280   | SRDINV73B - Promote Monk Martial Arts Bonus Unarmed Strike | blocked | SRDINV73A | SRDINV78 | [Martial Arts](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Monk.md), [Bonus Action](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Unarmed Strike](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote Martial Arts' unconditional Bonus Action Unarmed Strike while unarmored, unshielded, and unarmed or wielding only Monk weapons. |
| 281   | SRDINV74A - Promote Weapon Mastery Sap Runtime | blocked | SRDINV66 | SRDINV74B, SRDINV78 | [Sap](/workspace/typescript/dnd/.references/srd-5.2.1/Equipment.md), [Attack Roll](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Weapon Mastery](/workspace/typescript/dnd/.references/srd-5.2.1/Equipment.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote Sap's hit-applied Disadvantage on the target's next attack roll before the attacker's next turn, gated by selected weapon mastery ownership. |
| 282   | SRDINV74B - Research Weapon Mastery Cleave and Topple Split | blocked | SRDINV74A | SRDINV78 | [Cleave and Topple](/workspace/typescript/dnd/.references/srd-5.2.1/Equipment.md), [Prone](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Weapon Mastery](/workspace/typescript/dnd/.references/srd-5.2.1/Equipment.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Split Cleave extra-attack and Topple save-gated Prone into implementable runtime tasks, or document the missing Surface/runtime boundary for the current mastery records. |
| 283   | SRDINV75A - Promote Sorcerer Innate Sorcery Activation Runtime | blocked | SRDINV66 | SRDINV75B, SRDINV78 | [Innate Sorcery](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Sorcerer.md), [Bonus Action](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Long Rest](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote Innate Sorcery activation as a Bonus Action, two-use Long Rest resource, and one-minute active effect without yet wiring spell DC/attack projections. |
| 284   | SRDINV75B - Promote Innate Sorcery Spell DC and Attack Projection | blocked | SRDINV75A | SRDINV78 | [Innate Sorcery](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Sorcerer.md), [Spell Attack](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Saving Throw](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote active Innate Sorcery's +1 Sorcerer spell save DC and Advantage on Sorcerer spell attack rolls through existing spell invocation projection. |
| 285   | SRDINV76A - Research Warlock Level-1 Invocation Runtime Boundary | blocked | SRDINV66 | SRDINV76B, SRDINV78 | [Eldritch Invocations](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Warlock.md), [Pact Magic](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Warlock.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Classify level-1-legal Warlock invocation options into character-creation-only, spell-access, and battle-runtime tasks before promoting any one option as representative support. |
| 286   | SRDINV76B - Promote Pact of the Blade Battle Projection | blocked | SRDINV76A | SRDINV78 | [Pact of the Blade](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Warlock.md), [Weapon Attack](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Damage Types](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote Pact of the Blade's bonded weapon battle projection: Charisma attack/damage option, selectable Necrotic/Psychic/Radiant/normal damage type, proficiency, and focus facts without generic item conjuration simulation. |
| 287   | SRDINV77 - Promote Ranger Favored Enemy Hunter's Mark Free Casts | blocked | SRDINV66 | SRDINV78 | [Favored Enemy](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Ranger.md), [Hunter's Mark](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [Long Rest](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote Favored Enemy as always-prepared Hunter's Mark plus two no-slot casts per Long Rest that reuse the existing Hunter's Mark runtime procedure. |
| 288   | SRDINV78 - Recursive Level-1 Battle Feature Planning Review | blocked | SRDINV67, SRDINV68A, SRDINV68B, SRDINV69A, SRDINV69B, SRDINV70A, SRDINV70B, SRDINV71, SRDINV72A, SRDINV72B, SRDINV73A, SRDINV73B, SRDINV74A, SRDINV74B, SRDINV75A, SRDINV75B, SRDINV76A, SRDINV76B, SRDINV77 | none | [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [UNIT_REPORT](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md), [ACTIVE_PLAN](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Review the remaining spell/class-feature/weapon-mastery batch, refresh level-1 battle-related metrics, and decide whether the next queue is closure, cleanup, or final acceptance evidence. |

## Task Details
### Task 164 - QMBT69 - Recursive Unit Profile Planning Review

Status: `deferred`

Depends on: completed baseline

Blocks: none

Research / plan:
[QMBT66_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT66_RECURSIVE_PLANNING_REVIEW.md),
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md),
[ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md)

Scope: deferred while the SRD inventory frontier runs. completed baseline is complete; when
resumed, review QMBT67-completed baseline findings, update the PRD and plan docs, and append
the next coherent widening or cleanup batch unless the Unit profile matrix lane
is explicitly complete. AC/base-formula work is a strong candidate because
Barbarian and Monk Unarmored Defense have repeatedly been deferred for
one-formula-at-a-time semantics, but QMBT69 must re-check the refreshed matrix
and QMBT67-completed baseline discoveries before selecting the next batch.

Out of scope: implementation work not captured by the new task batch.

Verification: RAW/source review for QMBT67-completed baseline findings and any appended
rule slices; active-plan consistency check across Ralph index, DAG table, and
task details; `pnpm unit-profile-coverage:check` if matrix docs or generated
artifacts change; `/simplify` convergence, minimum two rounds unless the final
changeset is trivial.

### Task 248 - SRDINV55 - Recursive SRD Inventory Planning Review

Status: `blocked`

Depends on: SRDINV50D1, SRDINV50D2, SRDINV56A, SRDINV56B

Blocks: SRDINV57, SRDINV58A, SRDINV58B, SRDINV59A, SRDINV59B, SRDINV60A, SRDINV60B, SRDINV61, SRDINV62, SRDINV63, SRDINV64, SRDINV65, SRDINV66

Research / plan:
[SRDINV54_FEATHER_FALL_FALLING_RUNTIME_BOUNDARY_RESEARCH.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV54_FEATHER_FALL_FALLING_RUNTIME_BOUNDARY_RESEARCH.md),
[SRDINV50_COMMAND_OPTION_RUNTIME_SPLIT_RESEARCH.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV50_COMMAND_OPTION_RUNTIME_SPLIT_RESEARCH.md),
[SRDINV48_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV48_RECURSIVE_PLANNING_REVIEW.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: review the closed Command, movement, and Feather Fall runtime batch,
refresh spell Unit metrics, and unlock SRDINV57, SRDINV58A, SRDINV58B, SRDINV59A, SRDINV59B, SRDINV60A, SRDINV60B, SRDINV61, SRDINV62, SRDINV63, SRDINV64, SRDINV65, SRDINV66 only after verifying
that support claims, deferred mechanics, and inventory pressure are honest.

Out of scope: implementation work not captured by the newly appended batch and
treating catalog admission alone as behavior support.

Verification: RAW/source review for any appended rule slices plus
`UBIQUITOUS_LANGUAGE.md` check, confirming all modeled rules trace to specific
SRD text; active-plan consistency across Ralph index, DAG table, and task
details; regenerated inventory with `pnpm unit-profile-coverage:check --write`
when evidence or inventory artifacts change; confirm the appended result is
Ralph-sized concrete work; `/simplify` convergence, minimum two rounds unless
the final changeset is trivial.

### Task 252 - SRDINV50D1 - Promote Command Approach Route Runtime

Status: `done`

Depends on: none

Blocks: SRDINV55

Research / plan:
[SRDINV50_COMMAND_OPTION_RUNTIME_SPLIT_RESEARCH.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV50_COMMAND_OPTION_RUNTIME_SPLIT_RESEARCH.md),
[Command](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md),
[Movement](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md),
[Speed](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote Approach through caller-supplied shortest/direct route execution
facts. Runtime consumes a supplied movement result and caller/table proximity
evidence for whether the target moved within 5 feet of the caster; end the turn
only when that predicate is true.

Out of scope: automatic shortest/direct route derivation, map collision and
terrain pathfinding, generic route choice AI, and Flee behavior.

Verification: RAW/source review for Command Approach, Movement, Speed, and
turn-ending clauses; focused tests for route fact consumption, Movement spend,
proximity-gated end-turn behavior, and no duplicate route state; package-local
Quint updates before runtime divergence; `pnpm unit-profile-coverage:check
--write` if evidence changes; `pnpm quality`; `/simplify` convergence for
significant changes; MBT only if integrated movement sequencing changes require
it.

### Task 253 - SRDINV50D2 - Promote Command Flee Route Runtime

Status: `done`

Depends on: none

Blocks: SRDINV55

Research / plan:
[SRDINV50_COMMAND_OPTION_RUNTIME_SPLIT_RESEARCH.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV50_COMMAND_OPTION_RUNTIME_SPLIT_RESEARCH.md),
[Command](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md),
[Movement](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md),
[Speed](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Opportunity Attacks](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote Flee through caller-supplied fastest-available moving-away route
facts and the existing Movement budget owner. Opportunity Attack eligibility
must derive from actual movement through the existing movement/reaction
boundary, not from route metadata.

Out of scope: automatic fastest route derivation, route AI, map pathfinding,
and inventing non-RAW movement modes for "fastest available means."

Verification: RAW/source review for Command Flee, Movement, Speed, Opportunity
Attacks, and turn-ending clauses; focused tests for route fact consumption,
Movement spend, full movement obligation, turn end, and Opportunity Attack
derivation from actual movement; package-local Quint updates before runtime
divergence; `pnpm unit-profile-coverage:check --write` if evidence changes;
`pnpm quality`; `/simplify` convergence for significant changes; MBT only if
integrated movement/reaction sequencing changes require it.

### Task 254 - SRDINV56A - Promote Feather Fall Reaction Invocation Runtime

Status: `done`

Depends on: none

Blocks: SRDINV56B, SRDINV55

Research / plan:
[SRDINV54_FEATHER_FALL_FALLING_RUNTIME_BOUNDARY_RESEARCH.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV54_FEATHER_FALL_FALLING_RUNTIME_BOUNDARY_RESEARCH.md),
[Feather Fall](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[Falling](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Reaction](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promoted Feather Fall as a table-supplied falling-trigger Reaction
invocation with up-to-five falling target admission, Spell Slot and Reaction
spend, per-target spell effects, and active descent-cap projection.

Out of scope: fall-distance derivation, falling hazard simulation, map
elevation, and landing cleanup, which is SRDINV56B.

Verification: RAW/source review for Feather Fall, Falling, Reaction, Target,
Movement, and Spell Effect; focused tests for trigger facts, target cap,
invalid non-falling targets, resource spend, effect creation, and descent-cap
projection; package-local Quint updates before runtime divergence; `pnpm
unit-profile-coverage:check --write` if evidence changes; `pnpm quality`;
`/simplify` convergence for significant changes; MBT only if integrated
reaction sequencing changes require it.

### Task 255 - SRDINV56B - Promote Feather Fall Landing Cleanup Runtime

Status: `ready-for-implementation-after-light-research`

Depends on: SRDINV56A

Blocks: SRDINV55

Research / plan:
[SRDINV54_FEATHER_FALL_FALLING_RUNTIME_BOUNDARY_RESEARCH.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV54_FEATHER_FALL_FALLING_RUNTIME_BOUNDARY_RESEARCH.md),
[Feather Fall](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[Falling](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Prone](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote table-supplied landing cleanup for Feather Fall effects. Landing
must clear the affected target's effect and prevent both fall damage and the
Falling hazard's Prone outcome at that same landing boundary.

Out of scope: deriving when landing occurs, calculating fall damage, and
general falling simulation.

Verification: RAW/source review for Feather Fall landing, Falling, fall damage,
and Prone clauses; focused tests for landing cleanup, fall-damage prevention,
Prone prevention, unaffected falling creatures, and stale landing facts;
package-local Quint updates before runtime divergence; `pnpm
unit-profile-coverage:check --write` if evidence changes; `pnpm quality`;
`/simplify` convergence for significant changes; MBT only if integrated hazard
sequencing changes require it.

### Task 256 - SRDINV57 - Promote Grease Difficult Terrain Movement Boundary

Status: `blocked`

Depends on: SRDINV55

Blocks: SRDINV66

Research / plan:
[Grease](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[Movement](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md),
[SRDINV41_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV41_RECURSIVE_PLANNING_REVIEW.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote Grease's ground as caller-supplied Difficult Terrain
movement-cost evidence wired into the Movement budget owner.

Out of scope: automatic area membership, terrain pathfinding, and non-Grease
hazard generalization.

Verification: RAW/source review for Grease, Difficult Terrain, and Movement;
focused tests for movement-cost application from supplied Grease area facts,
cleanup at spell end, and no duplicate area geometry; package-local Quint
updates before runtime divergence; `pnpm unit-profile-coverage:check --write`
if evidence changes; `pnpm quality`; `/simplify` convergence for significant
changes; MBT only if integrated movement sequencing changes require it.

### Task 257 - SRDINV58A - Promote Faerie Fire Invisible-Denial Runtime

Status: `blocked`

Depends on: SRDINV55

Blocks: SRDINV58B, SRDINV66

Research / plan:
[Faerie Fire](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[Invisible](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote the failed-save Faerie Fire rider that prevents affected
creatures from benefiting from Invisible while outlined.

Out of scope: noncarried object outlines, light emission, and automatic area
membership.

Verification: RAW/source review for Faerie Fire and Invisible; focused tests
for save failure/success, Invisible benefit denial, concentration cleanup, and
no duplicate visibility state; package-local Quint updates before runtime
divergence; `pnpm unit-profile-coverage:check --write` if evidence changes;
`pnpm quality`; `/simplify` convergence for significant changes; MBT only if
visibility/attack sequencing changes require it.

### Task 258 - SRDINV58B - Research Faerie Fire Object Outline and Dim Light Boundary

Status: `blocked`

Depends on: SRDINV58A

Blocks: SRDINV66

Research / plan:
[Faerie Fire](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[Dim Light](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Object](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: decide whether object outlines and Dim Light emission are executable
battle-runtime facts, Surface-only facts, or explicit environmental projection
outside this battle runtime.

Out of scope: implementing runtime behavior in this research task.

Verification: RAW/source review for Faerie Fire, Object, Dim Light, visibility,
and area vocabulary; active-plan consistency if follow-up tasks are appended;
`/simplify` convergence if the plan changes are significant; no MBT.

### Task 259 - SRDINV59A - Promote Starry Wisp Dim Light Rider Runtime

Status: `blocked`

Depends on: SRDINV55

Blocks: SRDINV59B, SRDINV66

Research / plan:
[Starry Wisp](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md),
[Dim Light](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[SRDINV28E_STARRY_WISP_OBJECT_TARGET_DECISION.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV28E_STARRY_WISP_OBJECT_TARGET_DECISION.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote Starry Wisp's hit-applied Dim Light rider as a timed
target-attached effect if the current light/visibility model can execute it
without duplicating environmental state.

Out of scope: generic illumination simulation and object-target changes already
owned by the earlier object-target decision.

Verification: RAW/source review for Starry Wisp and Dim Light; focused tests
for hit application, duration, cleanup, and interaction with existing light
projection; package-local Quint updates before runtime divergence; `pnpm
unit-profile-coverage:check --write` if evidence changes; `pnpm quality`;
`/simplify` convergence for significant changes; MBT only if attack/visibility
sequencing changes require it.

### Task 260 - SRDINV59B - Promote Starry Wisp Invisible-Denial Rider Runtime

Status: `blocked`

Depends on: SRDINV59A

Blocks: SRDINV66

Research / plan:
[Starry Wisp](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md),
[Invisible](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote the hit-applied Starry Wisp rider that prevents the target from
benefiting from Invisible until the spell's next-turn boundary.

Out of scope: Faerie Fire's area save and object outline behavior.

Verification: RAW/source review for Starry Wisp and Invisible; focused tests
for hit application, Invisible benefit denial, next-turn cleanup, and no broad
condition removal; package-local Quint updates before runtime divergence; `pnpm
unit-profile-coverage:check --write` if evidence changes; `pnpm quality`;
`/simplify` convergence for significant changes; MBT only if attack/visibility
sequencing changes require it.

### Task 261 - SRDINV60A - Promote Protection from Evil and Good Condition Prevention

Status: `blocked`

Depends on: SRDINV55

Blocks: SRDINV60B, SRDINV66

Research / plan:
[Protection from Evil and Good](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-M-P.md),
[Charmed](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Frightened](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Possession](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote prevention of scoped-creature possession and new Charmed or
Frightened application while reusing existing creature-type and condition
ownership facts.

Out of scope: existing-effect save Advantage, attack Disadvantage already
covered by SRDINV30C, and social disposition behavior.

Verification: RAW/source review for Protection from Evil and Good, Charmed,
Frightened, Possession, and creature types; focused tests for scoped prevention,
unscoped effect pass-through, concentration cleanup, and no parallel condition
state; package-local Quint updates before runtime divergence; `pnpm
unit-profile-coverage:check --write` if evidence changes; `pnpm quality`;
`/simplify` convergence for significant changes; MBT only if integrated
condition sequencing changes require it.

### Task 262 - SRDINV60B - Promote Protection from Evil and Good Scoped Save Advantage

Status: `blocked`

Depends on: SRDINV60A

Blocks: SRDINV66

Research / plan:
[Protection from Evil and Good](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-M-P.md),
[Saving Throw](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote Advantage on new saves against already-applied scoped
possession, Charmed, and Frightened effects using the existing roll-modifier
boundary.

Out of scope: preventing new conditions, which is SRDINV60A, and broad save
Advantage unrelated to the protected effect.

Verification: RAW/source review for Protection from Evil and Good and Saving
Throw; focused tests for scoped existing effects, unscoped effects, stale
effects, concentration cleanup, and no duplicate save-modifier state;
package-local Quint updates before runtime divergence; `pnpm
unit-profile-coverage:check --write` if evidence changes; `pnpm quality`;
`/simplify` convergence for significant changes; MBT only if integrated roll
sequencing changes require it.

### Task 263 - SRDINV61 - Promote Animal Friendship Damage-Break Cleanup

Status: `blocked`

Depends on: SRDINV55

Blocks: SRDINV66

Research / plan:
[Animal Friendship](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md),
[Charmed](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote caster-or-ally damage cleanup for Animal Friendship's Charmed
effect through the existing damage/effect ownership boundary.

Out of scope: friendly disposition, target knowledge, Beast-target admission
already supported, and generic charm social memory.

Verification: RAW/source review for Animal Friendship, Charmed, damage, and
ally/caster wording; focused tests for caster damage cleanup, ally damage
cleanup, unrelated damage pass-through, and no duplicate relationship state;
package-local Quint updates before runtime divergence; `pnpm
unit-profile-coverage:check --write` if evidence changes; `pnpm quality`;
`/simplify` convergence for significant changes; MBT only if integrated damage
cleanup sequencing changes require it.

### Task 264 - SRDINV62 - Promote Hunter's Mark Upcast Duration Maxima

Status: `blocked`

Depends on: SRDINV55

Blocks: SRDINV63, SRDINV66

Research / plan:
[Hunter's Mark](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[Concentration](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote Hunter's Mark higher-slot duration maxima and
Concentration-owned expiration without changing the existing weapon-hit damage
path.

Out of scope: finding-check Advantage and retargeting behavior beyond existing
support.

Verification: RAW/source review for Hunter's Mark, upcasting, duration, and
Concentration; focused tests for slot-level duration boundaries, concentration
cleanup, existing damage behavior preservation, and evidence regeneration;
package-local Quint updates before runtime divergence; `pnpm
unit-profile-coverage:check --write` if evidence changes; `pnpm quality`;
`/simplify` convergence for significant changes; MBT only if integrated
duration sequencing changes require it.

### Task 265 - SRDINV63 - Research Hunter's Mark Finding-Advantage Boundary

Status: `blocked`

Depends on: SRDINV62

Blocks: SRDINV66

Research / plan:
[Hunter's Mark](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[Ability Check](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: decide whether the finding Advantage clause is battle-runtime roll
behavior, exploration-only metadata, or a caller-supplied battle check modifier
for Perception/Survival-style checks.

Out of scope: implementing runtime behavior in this research task.

Verification: RAW/source review for Hunter's Mark and Ability Check terms;
inspect existing roll-modifier boundaries; active-plan consistency if follow-up
tasks are appended; `/simplify` convergence if the plan changes are
significant; no MBT.

### Task 266 - SRDINV64 - Promote Chill Touch Healing-Prevention Rider

Status: `blocked`

Depends on: SRDINV55

Blocks: SRDINV66

Research / plan:
[Chill Touch](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-A-D.md),
[Healing](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote Chill Touch's hit-applied no-hit-point-regain rider through the
existing healing resolution boundary until the caster's next-turn boundary.

Out of scope: object targeting and the damage-only spell attack support already
owned by earlier profile work.

Verification: RAW/source review for Chill Touch, Healing, Hit Points, and
duration wording; focused tests for hit application, healing prevention, failed
attack pass-through, next-turn cleanup, and no duplicate HP state;
package-local Quint updates before runtime divergence; `pnpm
unit-profile-coverage:check --write` if evidence changes; `pnpm quality`;
`/simplify` convergence for significant changes; MBT only if integrated healing
sequencing changes require it.

### Task 267 - SRDINV65 - Promote Shocking Grasp Opportunity Attack Denial

Status: `blocked`

Depends on: SRDINV55

Blocks: SRDINV66

Research / plan:
[Shocking Grasp](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md),
[Opportunity Attacks](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Reaction](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote Shocking Grasp's hit-applied Opportunity Attack prevention until
the target's next-turn boundary, scoped to Opportunity Attacks rather than all
Reactions.

Out of scope: generic Reaction lockout and damage-only spell attack support
already owned by earlier profile work.

Verification: RAW/source review for Shocking Grasp, Opportunity Attacks,
Reaction, and duration wording; focused tests for hit application, Opportunity
Attack denial, non-Opportunity Reaction pass-through, failed attack pass-through,
and cleanup; package-local Quint updates before runtime divergence; `pnpm
unit-profile-coverage:check --write` if evidence changes; `pnpm quality`;
`/simplify` convergence for significant changes; MBT only if integrated
reaction sequencing changes require it.

### Task 268 - SRDINV66 - Recursive SRD Inventory Planning Review

Status: `blocked`

Depends on: SRDINV57, SRDINV58A, SRDINV58B, SRDINV59A, SRDINV59B, SRDINV60A, SRDINV60B, SRDINV61, SRDINV62, SRDINV63, SRDINV64, SRDINV65

Blocks: SRDINV67, SRDINV68A, SRDINV68B, SRDINV69A, SRDINV69B, SRDINV70A, SRDINV70B, SRDINV71, SRDINV72A, SRDINV72B, SRDINV73A, SRDINV73B, SRDINV74A, SRDINV74B, SRDINV75A, SRDINV75B, SRDINV76A, SRDINV76B, SRDINV77, SRDINV78

Research / plan:
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md),
[ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: review SRDINV57, SRDINV58A, SRDINV58B, SRDINV59A, SRDINV59B, SRDINV60A, SRDINV60B, SRDINV61, SRDINV62, SRDINV63, SRDINV64, SRDINV65, refresh spell Unit metrics, measure remaining
level-1 battle-related gaps, and unlock the pre-seeded remaining level-1
battle feature/spell batch only after resolving or explicitly deferring any
reasonable review notes.

Out of scope: implementation work not captured by the newly appended batch and
claiming full level-1 battle support from catalog admission alone.

Verification: RAW/source review for any appended rule slices plus
`UBIQUITOUS_LANGUAGE.md` check; active-plan consistency across Ralph index, DAG
table, and task details; regenerated inventory with `pnpm
unit-profile-coverage:check --write` when evidence or inventory artifacts
change; confirm remaining gaps are measured against battle-related level-1
feature/spell behavior; `/simplify` convergence, minimum two rounds unless the
final changeset is trivial.

### Task 269 - SRDINV67 - Promote Produce Flame Object Hurl Runtime

Status: `blocked`

Depends on: SRDINV66

Blocks: SRDINV78

Research / plan:
[Produce Flame](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-M-P.md),
[Object](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Breaking Objects](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[SRDINV34 decision](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV28E_STARRY_WISP_OBJECT_TARGET_DECISION.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote Produce Flame's hurl target as creature-or-object execution,
using the existing typed object target and object damage disposition boundary
from the prior Starry Wisp object-target decision. Preserve the held-flame gate
and avoid adding object inventory or environmental-light state.

Out of scope: general object inventory, ignition/heat beyond the spell text,
and Produce Flame's held-light rider, which belongs with the shared light
boundary.

Verification: RAW/source review for Produce Flame, Object, and object damage
wording; focused tests for creature target parity, object target acceptance,
held-state gating, miss behavior, and no object-state duplication; package-local
Quint updates before runtime divergence; `pnpm unit-profile-coverage:check
--write` if evidence changes; `pnpm quality`; `/simplify` convergence for
significant changes; MBT only if integrated target or damage sequencing changes
require it.

### Task 270 - SRDINV68A - Promote Sleep Damage Cleanup Runtime

Status: `blocked`

Depends on: SRDINV66

Blocks: SRDINV68B, SRDINV78

Research / plan:
[Sleep](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md),
[Damage](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[SRDINV38 research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV38_SLEEP_SAVE_LOOP_RESEARCH.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote cleanup of Sleep-owned Incapacitated/Unconscious effects when an
affected target takes damage from any source. Route through the existing damage
commit boundary so attack, spell, and other damage paths cannot diverge.

Out of scope: the adjacent shake-awake action, concentration-like expiration
that Sleep does not have, and generic condition cleanup unrelated to Sleep
ownership.

Verification: RAW/source review for Sleep damage-ending wording and Damage;
focused tests for attack damage, spell damage, non-damage events, unrelated
Unconscious/Incapacitated preservation, and idempotent cleanup; package-local
Quint updates before runtime divergence; `pnpm unit-profile-coverage:check
--write` if evidence changes; `pnpm quality`; `/simplify` convergence for
significant changes; MBT only if shared damage sequencing changes require it.

### Task 271 - SRDINV68B - Promote Sleep Shake-Awake Cleanup Runtime

Status: `blocked`

Depends on: SRDINV68A

Blocks: SRDINV78

Research / plan:
[Sleep](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md),
[Action](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[SRDINV38 research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV38_SLEEP_SAVE_LOOP_RESEARCH.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote the action by a creature within 5 feet that shakes an affected
target out of Sleep. Use caller-supplied adjacency facts and the existing action
resource boundary, then reuse the Sleep-owned cleanup helper introduced by
SRDINV68A.

Out of scope: deriving grid adjacency/pathfinding, waking from non-Sleep
Unconscious effects, and broad Help/Search action modeling.

Verification: RAW/source review for Sleep and Action wording; focused tests for
adjacent actor success, non-adjacent rejection, action spend, Sleep-owned effect
cleanup, unrelated condition preservation, and repeated wake attempts;
package-local Quint updates before runtime divergence; `pnpm
unit-profile-coverage:check --write` if evidence changes; `pnpm quality`;
`/simplify` convergence for significant changes; MBT only if action sequencing
changes require it.

### Task 272 - SRDINV69A - Promote Hellish Rebuke Reaction Trigger Runtime

Status: `blocked`

Depends on: SRDINV66

Blocks: SRDINV69B, SRDINV78

Research / plan:
[Hellish Rebuke](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[Reaction](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md),
[Damage](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote Hellish Rebuke's Reaction discovery/window when a creature with
the spell available takes damage from a visible creature within 60 feet. Record
the attacker/defender/slot continuation facts needed by the resolution task
without resolving the saving throw or damage.

Out of scope: Dexterity save and Fire damage resolution, Counterspell-like
reaction competition, and deriving line of sight or range from map geometry.

Verification: RAW/source review for Hellish Rebuke, Reaction, and Damage;
focused tests for damage-trigger offer, invisible attacker rejection,
out-of-range rejection, no-reaction-resource rejection, spell-resource gating,
and continuation payload shape; package-local Quint updates before runtime
divergence; `pnpm unit-profile-coverage:check --write` if evidence changes;
`pnpm quality`; `/simplify` convergence for significant changes; MBT only if
reaction discovery sequencing changes require it.

### Task 273 - SRDINV69B - Promote Hellish Rebuke Save Damage Runtime

Status: `blocked`

Depends on: SRDINV69A

Blocks: SRDINV78

Research / plan:
[Hellish Rebuke](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[Saving Throw](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Damage](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote Hellish Rebuke's Dexterity save, Fire damage, half damage on
success, slot scaling, and Reaction/Spell Slot spend from the continuation
created by SRDINV69A.

Out of scope: new reaction discovery rules, object damage, and any damage type
or saving throw not named by Hellish Rebuke.

Verification: RAW/source review for Hellish Rebuke damage/save/upcast wording;
focused tests for failed save full damage, successful save half damage, slot
level scaling, reaction and slot spend, invalid continuation rejection, and no
damage on canceled continuation; package-local Quint updates before runtime
divergence; `pnpm unit-profile-coverage:check --write` if evidence changes;
`pnpm quality`; `/simplify` convergence for significant changes; MBT only if
integrated reaction-resolution sequencing changes require it.

### Task 274 - SRDINV70A - Research Light and Illumination Runtime Boundary

Status: `blocked`

Depends on: SRDINV66

Blocks: SRDINV70B, SRDINV78

Research / plan:
[Light](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[Bright Light](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Dim Light](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Darkness](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: decide the shared runtime boundary for authored light emitters before
promoting Light, Produce Flame held light, Faerie Fire/Starry Wisp light riders,
or Darkvision interactions further. Classify what belongs in battle-runtime
state, what remains Surface/display metadata, and what requires caller-supplied
visibility facts.

Out of scope: implementing Light, general map illumination/path tracing, and
rewriting existing visibility gates before the boundary is documented.

Verification: RAW/source review for Light, Bright Light, Dim Light, Darkness,
Darkvision if used, and `UBIQUITOUS_LANGUAGE.md`; produce a short research note
under `plans/unit-profile-coverage/`; active-plan consistency if new tasks are
split from the decision; `pnpm quality`; `/simplify` convergence only if code
or substantial plan structure changes.

### Task 275 - SRDINV70B - Promote Light Object Illumination Runtime

Status: `blocked`

Depends on: SRDINV70A

Blocks: SRDINV78

Research / plan:
[Light](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[Object](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Bright Light](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Dim Light](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote Light as a touched Large-or-smaller object illumination effect
using the researched light boundary and caller-supplied object identity and
worn/carried facts. Preserve duration and ownership so recasting/expiration
cannot leave stale illumination.

Out of scope: object inventory, color UI, map lighting algorithms, and light
from other spells unless required by the shared boundary.

Verification: RAW/source review for Light, Object, Bright Light, and Dim Light;
focused tests for valid object application, too-large/worn/carried rejection,
duration cleanup, recast/replacement behavior, and no duplicated visibility
state; package-local Quint updates before runtime divergence; `pnpm
unit-profile-coverage:check --write` if evidence changes; `pnpm quality`;
`/simplify` convergence for significant changes; MBT only if turn/timing
sequencing changes require it.

### Task 276 - SRDINV71 - Research Minor Illusion Battle Boundary

Status: `blocked`

Depends on: SRDINV66

Blocks: SRDINV78

Research / plan:
[Minor Illusion](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-M-P.md),
[Illusions](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Study](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: decide whether Minor Illusion has battle-runtime executable state,
Surface-only authored facts, or explicit non-battle closure for sound/image
creation, Study reveal, and physical-interaction reveal. If executable, split
implementation tasks by image/sound and reveal pathway.

Out of scope: implementing the illusion model in the research task and adding a
general perception/Investigation subsystem without a typed battle boundary.

Verification: RAW/source review for Minor Illusion, Illusions, Study, and
`UBIQUITOUS_LANGUAGE.md`; produce a short research note under
`plans/unit-profile-coverage/`; active-plan consistency if follow-up tasks are
created; `pnpm quality`; `/simplify` convergence only if code or substantial
plan structure changes.

### Task 277 - SRDINV72A - Promote Bardic Inspiration Grant Runtime

Status: `blocked`

Depends on: SRDINV66

Blocks: SRDINV72B, SRDINV78

Research / plan:
[Bardic Inspiration](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Bard.md),
[Bonus Action](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[D20 Test](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote Bardic Inspiration's Bonus Action grant to another creature
within 60 feet who can see or hear the Bard. Model one die per creature,
one-hour effect ownership, and the Bard's d6 resource count derived from
Charisma modifier with the RAW minimum.

Out of scope: spending the die after a failed D20 Test, later-level die size,
and deriving line of sight/hearing/range from map geometry.

Verification: RAW/source review for Bardic Inspiration, Bonus Action, and D20
Test; focused tests for grant success, visibility/hearing/range rejection,
bonus-action spend, one-die-per-target replacement/rejection invariant, resource
count minimum, and duration ownership; package-local Quint updates before
runtime divergence; `pnpm unit-profile-coverage:check --write` if evidence
changes; `pnpm quality`; `/simplify` convergence for significant changes; MBT
only if action/resource sequencing changes require it.

### Task 278 - SRDINV72B - Promote Bardic Inspiration Failed D20 Test Runtime

Status: `blocked`

Depends on: SRDINV72A

Blocks: SRDINV78

Research / plan:
[Bardic Inspiration](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Bard.md),
[D20 Test](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Attack Roll](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Saving Throw](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Ability Check](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote Bardic Inspiration die use after a failed D20 Test. Reuse the
existing roll/result representation so the die can be added, failure can become
success, and the inspiration effect is expended without duplicating roll state.

Out of scope: using the die before knowing failure, reactions to non-D20 Tests,
later-level Bardic Inspiration variants, and generic roll-history storage.

Verification: RAW/source review for Bardic Inspiration and D20 Test variants;
focused tests for attack roll, saving throw, and ability check failures,
failure-to-success replay, still-failed outcome, die expenditure, no use on
success, and no double spend; package-local Quint updates before runtime
divergence; `pnpm unit-profile-coverage:check --write` if evidence changes;
`pnpm quality`; `/simplify` convergence for significant changes; MBT only if
shared D20 Test resolution sequencing changes require it.

### Task 279 - SRDINV73A - Promote Monk Martial Arts Attack Projection

Status: `blocked`

Depends on: SRDINV66

Blocks: SRDINV73B, SRDINV78

Research / plan:
[Martial Arts](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Monk.md),
[Unarmed Strike](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Weapon Attack](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote Martial Arts' attack projection while the Monk is unarmored,
unshielded, and unarmed or wielding only Monk weapons. Include d6 damage
replacement, Dexterity attack/damage choice for Unarmed Strikes and Monk
weapons, and Dexterity-based Grapple/Shove DC projection.

Out of scope: the Bonus Action Unarmed Strike, later Martial Arts die scaling,
and duplicating equipment/loadout facts already represented elsewhere.

Verification: RAW/source review for Martial Arts, Unarmed Strike, and Weapon
Attack; focused tests for eligible/uneligible loadouts, d6 replacement, Dex vs
Str attack/damage choice, Monk weapon qualification, Grapple/Shove DC
projection, armor/shield rejection, and no duplicated loadout state;
package-local Quint updates before runtime divergence; `pnpm
unit-profile-coverage:check --write` if evidence changes; `pnpm quality`;
`/simplify` convergence for significant changes; MBT only if attack projection
sequencing changes require it.

### Task 280 - SRDINV73B - Promote Monk Martial Arts Bonus Unarmed Strike

Status: `blocked`

Depends on: SRDINV73A

Blocks: SRDINV78

Research / plan:
[Martial Arts](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Monk.md),
[Bonus Action](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Unarmed Strike](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote Martial Arts' Bonus Action Unarmed Strike while the same
unarmored, unshielded, unarmed-or-Monk-weapon eligibility gate holds. Reuse the
attack projection from SRDINV73A and the existing Bonus Action resource.

Out of scope: adding an Attack-action prerequisite not present in the SRD
5.2.1 text, Flurry of Blows, and later-level Monk features.

Verification: RAW/source review for Martial Arts, Bonus Action, and Unarmed
Strike; focused tests for eligible bonus strike, armor/shield/loadout rejection,
bonus-action spend, attack projection reuse, and no Attack-action prerequisite;
package-local Quint updates before runtime divergence; `pnpm
unit-profile-coverage:check --write` if evidence changes; `pnpm quality`;
`/simplify` convergence for significant changes; MBT only if action sequencing
changes require it.

### Task 281 - SRDINV74A - Promote Weapon Mastery Sap Runtime

Status: `blocked`

Depends on: SRDINV66

Blocks: SRDINV74B, SRDINV78

Research / plan:
[Sap](/workspace/typescript/dnd/.references/srd-5.2.1/Equipment.md),
[Attack Roll](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Weapon Mastery](/workspace/typescript/dnd/.references/srd-5.2.1/Equipment.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote Sap's hit-applied Disadvantage on the target's next attack roll
before the attacker's next turn, gated by selected weapon mastery ownership and
the weapon's Sap property.

Out of scope: other mastery properties, mastery selection UI, and any
Disadvantage beyond the single next attack roll before the attacker's next turn.

Verification: RAW/source review for Sap and Weapon Mastery; focused tests for
hit application, miss pass-through, next attack Disadvantage consumption,
start-of-attacker-turn cleanup, mastery ownership gating, and non-Sap weapon
rejection; package-local Quint updates before runtime divergence; `pnpm
unit-profile-coverage:check --write` if evidence changes; `pnpm quality`;
`/simplify` convergence for significant changes; MBT only if turn cleanup or
attack modifier sequencing changes require it.

### Task 282 - SRDINV74B - Research Weapon Mastery Cleave and Topple Split

Status: `blocked`

Depends on: SRDINV74A

Blocks: SRDINV78

Research / plan:
[Cleave and Topple](/workspace/typescript/dnd/.references/srd-5.2.1/Equipment.md),
[Prone](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Weapon Mastery](/workspace/typescript/dnd/.references/srd-5.2.1/Equipment.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: split Cleave and Topple into implementable runtime tasks or document the
missing Surface/runtime boundary for current mastery records. Cleave likely
needs once-per-turn extra attack state and adjacent second-target facts; Topple
likely needs a save-gated Prone application keyed to weapon mastery DC.

Out of scope: implementing Cleave or Topple in this research task and
promoting every mastery property as one broad task.

Verification: RAW/source review for Cleave, Topple, Prone, and Weapon Mastery;
produce a short research note under `plans/unit-profile-coverage/`; active-plan
consistency if follow-up tasks are appended; `pnpm quality`; `/simplify`
convergence only if code or substantial plan structure changes.

### Task 283 - SRDINV75A - Promote Sorcerer Innate Sorcery Activation Runtime

Status: `blocked`

Depends on: SRDINV66

Blocks: SRDINV75B, SRDINV78

Research / plan:
[Innate Sorcery](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Sorcerer.md),
[Bonus Action](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Long Rest](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote Innate Sorcery activation as a Bonus Action, two-use Long Rest
resource, and one-minute active effect. Keep spell DC/attack projection out of
this task so activation/resource ownership is accepted first.

Out of scope: spell save DC increase, spell attack Advantage, later Sorcerer
features, and rest recovery beyond the resource reset already used by
character/class resources.

Verification: RAW/source review for Innate Sorcery, Bonus Action, and Long
Rest; focused tests for activation, bonus-action spend, resource spend, resource
exhaustion rejection, one-minute duration, expiration cleanup, and Long Rest
reset if the resource owner is touched; package-local Quint updates before
runtime divergence; `pnpm unit-profile-coverage:check --write` if evidence
changes; `pnpm quality`; `/simplify` convergence for significant changes; MBT
only if turn/duration sequencing changes require it.

### Task 284 - SRDINV75B - Promote Innate Sorcery Spell DC and Attack Projection

Status: `blocked`

Depends on: SRDINV75A

Blocks: SRDINV78

Research / plan:
[Innate Sorcery](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Sorcerer.md),
[Spell Attack](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Saving Throw](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote active Innate Sorcery's +1 Sorcerer spell save DC and Advantage
on Sorcerer spell attack rolls through the existing spell invocation projection.
The Sorcerer-spell gate must be typed or otherwise executable, not remembered by
downstream callers.

Out of scope: activation/resource handling already owned by SRDINV75A,
non-Sorcerer spell modifiers, and metamagic or later-level Sorcerer features.

Verification: RAW/source review for Innate Sorcery, Spell Attack, and Saving
Throw; focused tests for active/inactive DC projection, Sorcerer vs non-Sorcerer
spell gates, spell attack Advantage, save-DC effect on target saves, expiration
removal, and no duplicate modifier state; package-local Quint updates before
runtime divergence; `pnpm unit-profile-coverage:check --write` if evidence
changes; `pnpm quality`; `/simplify` convergence for significant changes; MBT
only if shared spell invocation sequencing changes require it.

### Task 285 - SRDINV76A - Research Warlock Level-1 Invocation Runtime Boundary

Status: `blocked`

Depends on: SRDINV66

Blocks: SRDINV76B, SRDINV78

Research / plan:
[Eldritch Invocations](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Warlock.md),
[Pact Magic](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Warlock.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: classify level-1-legal Warlock invocation options into
character-creation-only, spell-access, and battle-runtime tasks before promoting
any option as representative support. At SRD level 1, Armor of Shadows and Pact
of the Blade/Chain/Tome are candidates; invocations with level 2 prerequisites
must not be counted as level-1 coverage.

Out of scope: implementing invocation options in the research task and treating
all invocations as one runtime feature.

Verification: RAW/source review for Eldritch Invocations, Warlock level
prerequisites, Pact Magic, and `UBIQUITOUS_LANGUAGE.md`; produce a short
research note under `plans/unit-profile-coverage/`; active-plan consistency if
follow-up tasks are appended; `pnpm quality`; `/simplify` convergence only if
code or substantial plan structure changes.

### Task 286 - SRDINV76B - Promote Pact of the Blade Battle Projection

Status: `blocked`

Depends on: SRDINV76A

Blocks: SRDINV78

Research / plan:
[Pact of the Blade](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Warlock.md),
[Weapon Attack](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Damage Types](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote Pact of the Blade's bonded weapon battle projection: Charisma
attack/damage option, selectable Necrotic/Psychic/Radiant/normal damage type,
proficiency, and spellcasting-focus facts. Keep the conjured/bonded weapon
identity boundary typed and avoid generic item lifecycle simulation unless the
existing inventory model already owns it.

Out of scope: Pact of the Chain/Tome, Armor of Shadows, general item
conjuration, and invocations with level 2 prerequisites.

Verification: RAW/source review for Pact of the Blade, Weapon Attack, and
Damage Types; focused tests for bonded weapon gating, Charisma attack/damage
choice, normal and alternate damage type selection, proficiency projection,
focus projection if represented in battle, and non-bonded weapon pass-through;
package-local Quint updates before runtime divergence; `pnpm
unit-profile-coverage:check --write` if evidence changes; `pnpm quality`;
`/simplify` convergence for significant changes; MBT only if attack projection
sequencing changes require it.

### Task 287 - SRDINV77 - Promote Ranger Favored Enemy Hunter's Mark Free Casts

Status: `blocked`

Depends on: SRDINV66

Blocks: SRDINV78

Research / plan:
[Favored Enemy](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Ranger.md),
[Hunter's Mark](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[Long Rest](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote Favored Enemy as always-prepared Hunter's Mark plus two no-slot
casts per Long Rest that reuse the existing Hunter's Mark runtime procedure and
concentration/effect ownership. Model slotless casts as a class resource, not a
parallel copy of spell-slot state.

Out of scope: Hunter's Mark deferred clauses owned by SRDINV62-SRDINV63,
Ranger spell-list admission already handled elsewhere, and later Favored Enemy
scaling.

Verification: RAW/source review for Favored Enemy, Hunter's Mark, and Long
Rest; focused tests for prepared/access projection, slotless cast spend,
fallback to normal slot cast when free uses are exhausted if supported, Long
Rest reset, concentration/effect reuse, and no duplicate spell-slot accounting;
package-local Quint updates before runtime divergence; `pnpm
unit-profile-coverage:check --write` if evidence changes; `pnpm quality`;
`/simplify` convergence for significant changes; MBT only if spell-cast
resource sequencing changes require it.

### Task 288 - SRDINV78 - Recursive Level-1 Battle Feature Planning Review

Status: `blocked`

Depends on: SRDINV67, SRDINV68A, SRDINV68B, SRDINV69A, SRDINV69B, SRDINV70A, SRDINV70B, SRDINV71, SRDINV72A, SRDINV72B, SRDINV73A, SRDINV73B, SRDINV74A, SRDINV74B, SRDINV75A, SRDINV75B, SRDINV76A, SRDINV76B, SRDINV77

Blocks: none

Research / plan:
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md),
[ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: review SRDINV67, SRDINV68A, SRDINV68B, SRDINV69A, SRDINV69B, SRDINV70A, SRDINV70B, SRDINV71, SRDINV72A, SRDINV72B, SRDINV73A, SRDINV73B, SRDINV74A, SRDINV74B, SRDINV75A, SRDINV75B, SRDINV76A, SRDINV76B, SRDINV77, refresh level-1 battle-related feature/spell
metrics, calculate the remaining acceptance gap for "all battle-related level-1
features, including spells, can be used in battle," and decide whether the next
queue is final closure, cleanup, or another concrete implementation batch.

Out of scope: claiming 100% support from catalog/profile admission alone and
recursively inventing tasks before the implemented batch has been reviewed.

Verification: RAW/source review for any newly appended slices plus
`UBIQUITOUS_LANGUAGE.md`; active-plan consistency across Ralph index, DAG table,
and task details; regenerate inventory with `pnpm
unit-profile-coverage:check --write` when evidence or inventory artifacts
change; explicitly list remaining unsupported/profile-subset-supported
battle-related level-1 rows with reason and owner; `/simplify` convergence,
minimum two rounds unless the final changeset is trivial.
