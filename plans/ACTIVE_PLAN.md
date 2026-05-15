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
      "number": 277,
      "id": "SRDINV72A",
      "status": "done",
      "title": "Promote Bardic Inspiration Grant Runtime"
    },
    {
      "number": 278,
      "id": "SRDINV72B",
      "status": "done",
      "title": "Promote Bardic Inspiration Failed D20 Test Runtime"
    },
    {
      "number": 279,
      "id": "SRDINV73A",
      "status": "done",
      "title": "Promote Monk Martial Arts Attack Projection"
    },
    {
      "number": 280,
      "id": "SRDINV73B",
      "status": "done",
      "title": "Promote Monk Martial Arts Bonus Unarmed Strike"
    },
    {
      "number": 281,
      "id": "SRDINV74A",
      "status": "done",
      "title": "Promote Weapon Mastery Sap Runtime"
    },
    {
      "number": 282,
      "id": "SRDINV74B",
      "status": "done",
      "title": "Research Weapon Mastery Cleave and Topple Split"
    },
    {
      "number": 283,
      "id": "SRDINV75A",
      "status": "done",
      "title": "Promote Sorcerer Innate Sorcery Activation Runtime"
    },
    {
      "number": 284,
      "id": "SRDINV75B",
      "status": "done",
      "title": "Promote Innate Sorcery Spell DC and Attack Projection"
    },
    {
      "number": 285,
      "id": "SRDINV76A",
      "status": "done",
      "title": "Research Warlock Level-1 Invocation Runtime Boundary"
    },
    {
      "number": 286,
      "id": "SRDINV76B",
      "status": "done",
      "title": "Promote Pact of the Blade Battle Projection"
    },
    {
      "number": 287,
      "id": "SRDINV77",
      "status": "done",
      "title": "Promote Ranger Favored Enemy Hunter's Mark Free Casts"
    },
    {
      "number": 288,
      "id": "SRDINV78",
      "status": "done",
      "title": "Recursive Level-1 Battle Feature Planning Review"
    },
    {
      "number": 289,
      "id": "SRDINV58C",
      "status": "done",
      "title": "Promote Faerie Fire Object Outline Runtime"
    },
    {
      "number": 290,
      "id": "SRDINV74C",
      "status": "done",
      "title": "Promote Weapon Mastery Topple Runtime"
    },
    {
      "number": 291,
      "id": "SRDINV74D",
      "status": "done",
      "title": "Promote Weapon Mastery Cleave Runtime"
    },
    {
      "number": 292,
      "id": "SRDINV76C",
      "status": "done",
      "title": "Promote Armor of Shadows Spell Access"
    },
    {
      "number": 293,
      "id": "SRDINV76D",
      "status": "done",
      "title": "Promote Eldritch Mind Concentration Save Advantage"
    },
    {
      "number": 294,
      "id": "SRDINV76E",
      "status": "done",
      "title": "Research Pact of the Chain Familiar Boundary"
    },
    {
      "number": 295,
      "id": "SRDINV76F",
      "status": "done",
      "title": "Research Pact of the Tome Spell Access Boundary"
    },
    {
      "number": 296,
      "id": "SRDINV79",
      "status": "done",
      "title": "Promote Starry Wisp Object Invisible-Benefit Projection"
    },
    {
      "number": 297,
      "id": "SRDINV80A",
      "status": "done",
      "title": "Widen Hideous Laughter Spell Definition Surface"
    },
    {
      "number": 298,
      "id": "SRDINV80B",
      "status": "done",
      "title": "Widen Fog Cloud Spell Definition Surface"
    },
    {
      "number": 299,
      "id": "SRDINV80C",
      "status": "done",
      "title": "Widen Spare the Dying Stable Lifecycle Surface"
    },
    {
      "number": 300,
      "id": "SRDINV80D",
      "status": "done",
      "title": "Widen Sanctuary Targeting Interdiction Surface"
    },
    {
      "number": 301,
      "id": "SRDINV80E",
      "status": "done",
      "title": "Widen Shillelagh Weapon Override Surface"
    },
    {
      "number": 302,
      "id": "SRDINV80F",
      "status": "done",
      "title": "Widen Fire Bolt and Sorcerous Burst Cantrip Surface"
    },
    {
      "number": 303,
      "id": "SRDINV80G",
      "status": "done",
      "title": "Widen Hex Curse Spell Definition Surface"
    },
    {
      "number": 304,
      "id": "SRDINV81",
      "status": "done",
      "title": "Promote Pact of the Chain Find Familiar Access"
    },
    {
      "number": 305,
      "id": "SRDINV82",
      "status": "done",
      "title": "Promote Pact of the Tome Book of Shadows Access"
    },
    {
      "number": 306,
      "id": "SRDINV83",
      "status": "done",
      "title": "Recursive Level-1 Battle Feature Planning Review"
    },
    {
      "number": 307,
      "id": "SRDINV84A",
      "status": "done",
      "title": "Promote Fire Bolt Object Runtime"
    },
    {
      "number": 308,
      "id": "SRDINV84B",
      "status": "done",
      "title": "Promote Sorcerous Burst Runtime"
    },
    {
      "number": 309,
      "id": "SRDINV84C",
      "status": "done",
      "title": "Promote Spare the Dying Stable Runtime"
    },
    {
      "number": 310,
      "id": "SRDINV84D",
      "status": "done",
      "title": "Promote Hex Curse Runtime"
    },
    {
      "number": 311,
      "id": "SRDINV84E",
      "status": "done",
      "title": "Promote Fog Cloud Obscurement Runtime"
    },
    {
      "number": 312,
      "id": "SRDINV84F",
      "status": "done",
      "title": "Promote Hideous Laughter Repeat-Save Runtime"
    },
    {
      "number": 313,
      "id": "SRDINV84G",
      "status": "done",
      "title": "Promote Sanctuary Targeting Interdiction Runtime"
    },
    {
      "number": 314,
      "id": "SRDINV84H",
      "status": "done",
      "title": "Promote Shillelagh Weapon Override Runtime"
    },
    {
      "number": 315,
      "id": "SRDINV84I",
      "status": "done",
      "title": "Research Find Familiar Companion Runtime Split"
    },
    {
      "number": 316,
      "id": "SRDINV85",
      "status": "done",
      "title": "Recursive Level-1 Battle Feature Planning Review"
    },
    {
      "number": 317,
      "id": "SRDINV84I1",
      "status": "done",
      "title": "Promote Find Familiar Form Catalog Boundary"
    },
    {
      "number": 318,
      "id": "SRDINV84I2",
      "status": "done",
      "title": "Promote Find Familiar Lifecycle and Replacement"
    },
    {
      "number": 319,
      "id": "SRDINV84I3",
      "status": "done",
      "title": "Promote Familiar Turn and No-Attack Action Gate"
    },
    {
      "number": 320,
      "id": "SRDINV84I4",
      "status": "done",
      "title": "Promote Telepathic Connection and Touch-Spell Delivery"
    },
    {
      "number": 321,
      "id": "SRDINV84I5",
      "status": "done",
      "title": "Promote Pact of the Chain Familiar Reaction Attack"
    },
    {
      "number": 322,
      "id": "SRDINV86",
      "status": "done",
      "title": "Recursive Level-1 Battle Feature Planning Review"
    },
    {
      "number": 323,
      "id": "SRDINV87A",
      "status": "ready-for-implementation-after-light-research",
      "title": "Promote Produce Flame Held-Light Runtime"
    },
    {
      "number": 324,
      "id": "SRDINV87B",
      "status": "ready-for-implementation-after-light-research",
      "title": "Promote Faerie Fire Dim Light Emission Runtime"
    },
    {
      "number": 325,
      "id": "SRDINV87C",
      "status": "ready-for-implementation-after-light-research",
      "title": "Promote Hunter's Mark Finding Advantage Runtime"
    },
    {
      "number": 326,
      "id": "SRDINV87D",
      "status": "ready-for-implementation-after-light-research",
      "title": "Promote Sleep Non-Sleeper Auto-Success Runtime"
    },
    {
      "number": 327,
      "id": "SRDINV87E",
      "status": "ready-for-research",
      "title": "Recursive Level-1 Battle Coverage Planning Review"
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

| Order | Task                                                               | Status             | Depends on                                                                                                                                                                               | Blocks                                                                                                              | Research / plan                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Next action                                                                                                                                                                                                                                                                                                                                                                                  |
| ----- | ------------------------------------------------------------------ | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 164   | QMBT69 - Recursive Unit Profile Planning Review                    | deferred           | completed baseline                                                                                                                                                                       | none                                                                                                                | [QMBT66 review](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT66_RECURSIVE_PLANNING_REVIEW.md), [Unit profile coverage report](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md), [ACTIVE_PLAN](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Still parked by the SRD inventory frontier instruction; completed baseline is complete, but the older QMBT queue remains deferred until that frontier resumes it.                                                                                                                                                                                                                            |
| 277   | SRDINV72A - Promote Bardic Inspiration Grant Runtime               | done               | completed baseline                                                                                                                                                                       | SRDINV72B, SRDINV78                                                                                                 | [Bardic Inspiration](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Bard.md), [Bonus Action](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [D20 Test](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Completed: promoted Bardic Inspiration's Bonus Action grant, target visibility/hearing/range facts, one-die-per-creature invariant, d6 Charisma-derived resource count, and one-hour effect ownership.                                                                                                                                                                                       |
| 278   | SRDINV72B - Promote Bardic Inspiration Failed D20 Test Runtime     | done               | SRDINV72A                                                                                                                                                                                | SRDINV78                                                                                                            | [Bardic Inspiration](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Bard.md), [D20 Test](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Attack Roll](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Saving Throw](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Ability Check](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                                                | Completed: promoted Bardic Inspiration die use after an already-failed attack roll, Saving Throw, or Ability Check, including roll addition, possible failure-to-success replay, die expenditure, success rejection, and double-spend rejection.                                                                                                                                             |
| 279   | SRDINV73A - Promote Monk Martial Arts Attack Projection            | done               | completed baseline                                                                                                                                                                       | SRDINV73B, SRDINV78                                                                                                 | [Martial Arts](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Monk.md), [Unarmed Strike](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Weapon Attack](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Completed: promoted Martial Arts weapon/unarmed eligibility, level-1 d6 damage replacement, Dexterity attack/damage option, and Grapple/Shove DC projection without duplicating loadout state.                                                                                                                                                                                               |
| 280   | SRDINV73B - Promote Monk Martial Arts Bonus Unarmed Strike         | done               | SRDINV73A                                                                                                                                                                                | SRDINV78                                                                                                            | [Martial Arts](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Monk.md), [Bonus Action](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Unarmed Strike](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Completed: promoted Martial Arts' Bonus Action Unarmed Strike while unarmored, unshielded, and unarmed or wielding only Monk weapons, reusing SRDINV73A's attack projection and Bonus Action spending without an Attack-action prerequisite.                                                                                                                                                 |
| 281   | SRDINV74A - Promote Weapon Mastery Sap Runtime                     | done               | completed baseline                                                                                                                                                                       | SRDINV74B, SRDINV78                                                                                                 | [Sap](/workspace/typescript/dnd/.references/srd-5.2.1/Equipment.md), [Attack Roll](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Weapon Mastery](/workspace/typescript/dnd/.references/srd-5.2.1/Equipment.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Completed: promoted Sap's selected-weapon mastery gate, hit-applied Disadvantage on the target's next attack roll, consumption on that attack roll, and cleanup at the start of the attacker's next turn.                                                                                                                                                                                    |
| 282   | SRDINV74B - Research Weapon Mastery Cleave and Topple Split        | done               | SRDINV74A                                                                                                                                                                                | SRDINV74C, SRDINV74D                                                                                                | [Cleave and Topple research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV74B_CLEAVE_TOPPLE_SPLIT_RESEARCH.md), [Cleave and Topple](/workspace/typescript/dnd/.references/srd-5.2.1/Equipment.md), [Prone](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Weapon Mastery](/workspace/typescript/dnd/.references/srd-5.2.1/Equipment.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Completed: current Surface records already model Cleave and Topple; follow-up runtime work is split into SRDINV74C Topple and SRDINV74D Cleave.                                                                                                                                                                                                                                              |
| 283   | SRDINV75A - Promote Sorcerer Innate Sorcery Activation Runtime     | done               | completed baseline                                                                                                                                                                       | SRDINV75B, SRDINV78                                                                                                 | [Innate Sorcery](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Sorcerer.md), [Bonus Action](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Long Rest](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Completed: promoted Innate Sorcery activation as a Bonus Action, two-use Long Rest resource spend, one-minute active occurrence, exhausted-use rejection, Sorcerer ownership gate, expiration cleanup, and profile evidence without yet wiring spell DC/attack projections.                                                                                                                  |
| 284   | SRDINV75B - Promote Innate Sorcery Spell DC and Attack Projection  | done               | SRDINV75A                                                                                                                                                                                | SRDINV78                                                                                                            | [Innate Sorcery](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Sorcerer.md), [Spell Attack](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Saving Throw](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Promote active Innate Sorcery's +1 Sorcerer spell save DC and Advantage on Sorcerer spell attack rolls through existing spell invocation projection.                                                                                                                                                                                                                                         |
| 285   | SRDINV76A - Research Warlock Level-1 Invocation Runtime Boundary   | done               | completed baseline                                                                                                                                                                       | SRDINV76B, SRDINV76C, SRDINV76D, SRDINV76E, SRDINV76F, SRDINV78                                                     | [SRDINV76A research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV76A_WARLOCK_LEVEL_1_INVOCATION_BOUNDARY_RESEARCH.md), [Eldritch Invocations](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Warlock.md), [Pact Magic](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Warlock.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Completed: level-1-legal invocations split into Pact of the Blade, Armor of Shadows, Eldritch Mind, Pact of the Chain, and Pact of the Tome follow-up surfaces; level-2+ prerequisite invocations are not level-1 coverage.                                                                                                                                                                  |
| 286   | SRDINV76B - Promote Pact of the Blade Battle Projection            | done               | SRDINV76A                                                                                                                                                                                | SRDINV78                                                                                                            | [SRDINV76A research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV76A_WARLOCK_LEVEL_1_INVOCATION_BOUNDARY_RESEARCH.md), [Pact of the Blade](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Warlock.md), [Weapon Attack](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Damage Types](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                                                                        | Promote Pact of the Blade's bonded weapon battle projection only: Charisma attack/damage option, selectable Necrotic/Psychic/Radiant/normal damage type, proficiency, and focus facts without generic item conjuration simulation.                                                                                                                                                           |
| 287   | SRDINV77 - Promote Ranger Favored Enemy Hunter's Mark Free Casts   | done               | completed baseline                                                                                                                                                                       | SRDINV78                                                                                                            | [Favored Enemy](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Ranger.md), [Hunter's Mark](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [Long Rest](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Completed: promoted Favored Enemy as always-prepared Hunter's Mark, two level-1 no-slot casts per Long Rest, class-resource spending/rest persistence, and reuse of Hunter's Mark concentration/effect ownership without duplicate Spell Slot accounting.                                                                                                                                    |
| 288   | SRDINV78 - Recursive Level-1 Battle Feature Planning Review        | done               | SRDINV58C, SRDINV72A, SRDINV72B, SRDINV73A, SRDINV73B, SRDINV74A, SRDINV74C, SRDINV74D, SRDINV75A, SRDINV75B, SRDINV76A, SRDINV76B, SRDINV76C, SRDINV76D, SRDINV76E, SRDINV76F, SRDINV77 | SRDINV79, SRDINV80A, SRDINV80B, SRDINV80C, SRDINV80D, SRDINV80E, SRDINV80F, SRDINV80G, SRDINV81, SRDINV82, SRDINV83 | [SRDINV78 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV78_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md), [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [UNIT_REPORT](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md), [ACTIVE_PLAN](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md), [SRDINV76A research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV76A_WARLOCK_LEVEL_1_INVOCATION_BOUNDARY_RESEARCH.md), [Pact of the Chain research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV76E_PACT_OF_THE_CHAIN_FAMILIAR_BOUNDARY_RESEARCH.md), [Pact of the Tome research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV76F_PACT_OF_THE_TOME_SPELL_ACCESS_BOUNDARY_RESEARCH.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Completed: refreshed metrics, recorded the 83-row battle-readiness gap, accounted for Starry Wisp's object-target Invisible-benefit blocker, and appended SRDINV79-SRDINV83 as the next concrete batch.                                                                                                                                                                                      |
| 289   | SRDINV58C - Promote Faerie Fire Object Outline Runtime             | done               | completed baseline                                                                                                                                                                       | SRDINV78                                                                                                            | [SRDINV58B research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV58B_FAERIE_FIRE_OBJECT_LIGHT_BOUNDARY_RESEARCH.md), [Faerie Fire](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [Object](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Target](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                                                                                     | Completed: promoted caller-supplied Faerie Fire object ids, concentration-owned object outline cleanup, object-target attack Advantage from supplied sight facts, and object Invisible-benefit denial without adding object inventory, geometry, or visibility state.                                                                                                                        |
| 290   | SRDINV74C - Promote Weapon Mastery Topple Runtime                  | done               | SRDINV74B                                                                                                                                                                                | SRDINV78                                                                                                            | [Cleave and Topple research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV74B_CLEAVE_TOPPLE_SPLIT_RESEARCH.md), [Topple](/workspace/typescript/dnd/.references/srd-5.2.1/Equipment.md), [Prone](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Weapon Mastery](/workspace/typescript/dnd/.references/srd-5.2.1/Equipment.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Completed: promoted Topple as an optional selected-weapon mastery rider gated on weapon hit, selected mastery ownership, authored Topple weapon property, and `weaponMasteryTopple` support; failed Constitution saves apply Prone and success or decline is a no-op.                                                                                                                        |
| 291   | SRDINV74D - Promote Weapon Mastery Cleave Runtime                  | done               | SRDINV74B                                                                                                                                                                                | SRDINV78                                                                                                            | [Cleave and Topple research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV74B_CLEAVE_TOPPLE_SPLIT_RESEARCH.md), [Cleave](/workspace/typescript/dnd/.references/srd-5.2.1/Equipment.md), [Weapon Mastery](/workspace/typescript/dnd/.references/srd-5.2.1/Equipment.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Completed: promoted Cleave as an optional once-per-turn selected-weapon mastery rider using caller/table-supplied second-target adjacency/reach facts, same-weapon extra attack damage without a positive ability modifier, negative ability modifier preservation, and selected-weapon/support-profile gates.                                                                               |
| 292   | SRDINV76C - Promote Armor of Shadows Spell Access                  | done               | SRDINV76A                                                                                                                                                                                | SRDINV78                                                                                                            | [SRDINV76A research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV76A_WARLOCK_LEVEL_1_INVOCATION_BOUNDARY_RESEARCH.md), [Armor of Shadows](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Warlock.md), [Mage Armor](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-M-P.md), [Pact Magic](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Warlock.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                                                                    | Promote selected Armor of Shadows as self-only Mage Armor Spell Access that spends no Spell Slot and reuses the existing Mage Armor persistent armor spell procedure.                                                                                                                                                                                                                        |
| 293   | SRDINV76D - Promote Eldritch Mind Concentration Save Advantage     | done               | SRDINV76A                                                                                                                                                                                | SRDINV78                                                                                                            | [SRDINV76A research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV76A_WARLOCK_LEVEL_1_INVOCATION_BOUNDARY_RESEARCH.md), [Eldritch Mind](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Warlock.md), [Concentration](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Saving Throw](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                                                                            | Completed: promoted selected Eldritch Mind invocation ownership into battle state and projects Advantage only on damage-triggered Concentration maintenance Saving Throw holes, leaving ordinary Constitution Saving Throws and other Saving Throws unaffected.                                                                                                                              |
| 294   | SRDINV76E - Research Pact of the Chain Familiar Boundary           | done               | SRDINV76A                                                                                                                                                                                | SRDINV78                                                                                                            | [SRDINV76E research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV76E_PACT_OF_THE_CHAIN_FAMILIAR_BOUNDARY_RESEARCH.md), [SRDINV76A research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV76A_WARLOCK_LEVEL_1_INVOCATION_BOUNDARY_RESEARCH.md), [Pact of the Chain](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Warlock.md), [Find Familiar](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [Magic Action](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                        | Completed: split Pact of the Chain into Find Familiar Spell Access plus companion runtime ownership; recommended no-slot Magic-action access, form references, and a later atomic Warlock attack-forgo plus familiar Reaction attack procedure without duplicating familiar state.                                                                                                           |
| 295   | SRDINV76F - Research Pact of the Tome Spell Access Boundary        | done               | SRDINV76A                                                                                                                                                                                | SRDINV78                                                                                                            | [SRDINV76F research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV76F_PACT_OF_THE_TOME_SPELL_ACCESS_BOUNDARY_RESEARCH.md), [SRDINV76A research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV76A_WARLOCK_LEVEL_1_INVOCATION_BOUNDARY_RESEARCH.md), [Pact of the Tome](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Warlock.md), [Ritual](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Spellcasting Focus](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                | Completed: split Pact of the Tome into conditional Book of Shadows Spell Access plus future component/focus legality; selected spells stay in one Book of Shadows access source and effective prepared Warlock access is derived only while the book is on the Warlock's person.                                                                                                             |
| 296   | SRDINV79 - Promote Starry Wisp Object Invisible-Benefit Projection | done               | SRDINV78                                                                                                                                                                                 | SRDINV83                                                                                                            | [SRDINV78 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV78_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md), [Starry Wisp](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md), [Object](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Invisible](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                                                                                         | Completed: promoted Starry Wisp object-hit Invisible-benefit denial through a typed object Dim Light reveal emitter, with caster-next-turn expiry and no object inventory, visibility, line-of-sight, cover, or map-light state.                                                                                                                                                             |
| 297   | SRDINV80A - Widen Hideous Laughter Spell Definition Surface        | done               | SRDINV78                                                                                                                                                                                 | SRDINV83                                                                                                            | [SRDINV78 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV78_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md), [Hideous Laughter](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [Prone](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Completed: authored Hideous Laughter Surface facts for the initial Wisdom save, end-turn repeat save, damage-triggered repeat save with Advantage, Prone and Incapacitated application, Prone self-end suppression, and slot-scaled additional targets; runtime execution remains owner-evidence work tracked by the generated inventory rows.                                               |
| 298   | SRDINV80B - Widen Fog Cloud Spell Definition Surface               | done               | SRDINV78                                                                                                                                                                                 | SRDINV83                                                                                                            | [SRDINV78 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV78_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md), [Fog Cloud](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [Heavily Obscured](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Completed: authored and installed Fog Cloud Surface facts for the point-origin slot-scaled fog Sphere, passive Heavily Obscured projection, Concentration duration, and strong-wind dispersal early end; promoted battle-runtime execution remains owner-evidence work tracked by generated inventory rows.                                                                                  |
| 299   | SRDINV80C - Widen Spare the Dying Stable Lifecycle Surface         | done               | SRDINV78                                                                                                                                                                                 | SRDINV83                                                                                                            | [SRDINV78 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV78_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md), [Spare the Dying](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md), [Stable](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Completed: authored and installed Spare the Dying Surface facts for zero-Hit-Point not-dead creature targeting, Stable lifecycle application, and character-level range scaling; promoted battle-runtime execution remains owner-evidence work tracked by generated inventory rows.                                                                                                          |
| 300   | SRDINV80D - Widen Sanctuary Targeting Interdiction Surface         | done               | SRDINV78                                                                                                                                                                                 | SRDINV83                                                                                                            | [SRDINV78 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV78_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md), [Sanctuary](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md), [Target](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Completed: authored and installed Sanctuary Surface facts for the warded creature attachment, Wisdom-save interdiction when targeted by attack rolls or damaging spells, choose-new-target-or-lose outcome, area-effect exclusion, and warded-creature attack/spell/damage early end; promoted battle-runtime execution remains owner-evidence work tracked by the generated inventory rows. |
| 301   | SRDINV80E - Widen Shillelagh Weapon Override Surface               | done               | SRDINV78                                                                                                                                                                                 | SRDINV83                                                                                                            | [SRDINV78 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV78_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md), [Shillelagh](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md), [Weapon Attack](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Completed: authored and installed Shillelagh Surface facts for the held Club or Quarterstaff attachment, spellcasting ability attack/damage option, level-scaled damage die, Force-or-normal damage choice, and recast/let-go early end; promoted battle-runtime execution remains owner-evidence work tracked by the generated inventory rows.                                              |
| 302   | SRDINV80F - Widen Fire Bolt and Sorcerous Burst Cantrip Surface    | done               | SRDINV78                                                                                                                                                                                 | SRDINV83                                                                                                            | [SRDINV78 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV78_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md), [Fire Bolt](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [Sorcerous Burst](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md), [Object](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                                                                            | Completed: authored Fire Bolt's creature-or-object target and unattended flammable-object ignition Surface facts, authored and installed Sorcerous Burst's chosen damage type, capped exploding d8 amount, creature-or-object target branch, and cantrip scaling; promoted battle-runtime execution remains owner-evidence work tracked by generated inventory rows.                         |
| 303   | SRDINV80G - Widen Hex Curse Spell Definition Surface               | done               | SRDINV78                                                                                                                                                                                 | SRDINV83                                                                                                            | [SRDINV78 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV78_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md), [Hex](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [Ability Check](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Completed: authored and installed Hex Surface facts for cursed-target marking, chosen-ability Ability Check Disadvantage, attack-hit Necrotic damage, later-turn Bonus Action retargeting after the target drops to 0 Hit Points, and slot-scaled Concentration duration; promoted battle-runtime execution remains owner-evidence work tracked by generated inventory rows.                 |
| 304   | SRDINV81 - Promote Pact of the Chain Find Familiar Access          | done               | SRDINV76E, SRDINV78                                                                                                                                                                      | SRDINV83                                                                                                            | [Pact of the Chain research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV76E_PACT_OF_THE_CHAIN_FAMILIAR_BOUNDARY_RESEARCH.md), [Pact of the Chain](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Warlock.md), [Find Familiar](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [Magic Action](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                                                       | Completed: promoted selected Pact of the Chain into Find Familiar Spell Access with Magic-action no-slot invocation mode, named-form plus CR-0-Beast eligibility, Pact special forms, and no companion lifecycle execution.                                                                                                                                                                  |
| 305   | SRDINV82 - Promote Pact of the Tome Book of Shadows Access         | done               | SRDINV76F, SRDINV78                                                                                                                                                                      | SRDINV83                                                                                                            | [Pact of the Tome research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV76F_PACT_OF_THE_TOME_SPELL_ACCESS_BOUNDARY_RESEARCH.md), [Pact of the Tome](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Warlock.md), [Ritual](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Spellcasting Focus](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                                                                | Completed: promoted selected Pact of the Tome into one Book of Shadows Spell Access source with exactly three cantrips, two level-1 Ritual spells, book-on-person conditional preparation, Warlock-spell projection, ordinary Ritual invocation where supported, and no duplicate prepared-list state.                                                                                        |
| 306   | SRDINV83 - Recursive Level-1 Battle Feature Planning Review        | done               | SRDINV79, SRDINV80A, SRDINV80B, SRDINV80C, SRDINV80D, SRDINV80E, SRDINV80F, SRDINV80G, SRDINV81, SRDINV82                                                                                | SRDINV84A, SRDINV84B, SRDINV84C, SRDINV84D, SRDINV84E, SRDINV84F, SRDINV84G, SRDINV84H, SRDINV84I, SRDINV85         | [SRDINV83 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV83_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md), [SRDINV78 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV78_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md), [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [UNIT_REPORT](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md), [ACTIVE_PLAN](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                              | Completed: reviewed SRDINV79-SRDINV82, refreshed readiness at 286/367 (77.9%), closed Surface-widening drift, identified 16 installed spell-list rows needing battle-runtime owner evidence, and appended SRDINV84A-I plus SRDINV85.                                                                                                                                                        |
| 307   | SRDINV84A - Promote Fire Bolt Object Runtime                      | done               | SRDINV83                                                                                                                                                                                 | SRDINV85                                                                                                            | [SRDINV83 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV83_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md), [Fire Bolt](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [Object](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Attack Roll](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                                 | Completed: promoted Fire Bolt's creature-or-object ranged spell attack through the existing object target boundary, including Fire damage, cantrip scaling, caller-supplied object damage facts, missing ignition-fact rejection, and unattended flammable-object ignition/no-ignition outcomes.                                                                                              |
| 308   | SRDINV84B - Promote Sorcerous Burst Runtime                       | done               | SRDINV83                                                                                                                                                                                 | SRDINV85                                                                                                            | [SRDINV83 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV83_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md), [Sorcerous Burst](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md), [Object](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Attack Roll](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                      | Completed: promoted Sorcerous Burst's ranged spell attack with cast-time Acid/Cold/Fire/Lightning/Poison/Psychic/Thunder damage type choice, creature-or-object target branch, cantrip scaling, capped exploding d8 validation, caller-supplied object damage facts, and object Poison/Psychic damage immunity.                                                                              |
| 309   | SRDINV84C - Promote Spare the Dying Stable Runtime                 | done               | SRDINV83                                                                                                                                                                                 | SRDINV85                                                                                                            | [SRDINV83 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV83_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md), [Spare the Dying](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md), [Stable](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Completed: promoted Spare the Dying's zero-Hit-Point non-dead Character Build target admission, Stable lifecycle application, no-dead-target rejection, Magic action spending, and character-level range scaling without implementing a broader death-saving-throw subsystem.                                                                                                                        |
| 310   | SRDINV84D - Promote Hex Curse Runtime                             | done               | SRDINV83                                                                                                                                                                                 | SRDINV85                                                                                                            | [SRDINV83 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV83_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md), [Hex](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [Ability Check](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Attack Roll](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                          | Completed: promoted Hex's Bonus Action curse, chosen-ability Ability Check Disadvantage, attack-hit Necrotic damage rider, later-turn Bonus Action retarget after the target drops to 0 Hit Points, and slot-scaled Concentration duration.                                                                                                                                                  |
| 311   | SRDINV84E - Promote Fog Cloud Obscurement Runtime                  | done               | SRDINV83                                                                                                                                                                                 | SRDINV85                                                                                                            | [SRDINV83 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV83_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md), [Fog Cloud](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [Heavily Obscured](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Area of Effect](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                              | Completed: promoted Fog Cloud's caller-supplied fog-area occurrence with Heavily Obscured projection, slot-scaled Sphere radius, one-hour Concentration duration cleanup, Spell Slot spending, and table-supplied strong-wind dispersal without adding map illumination or area membership derivation.                                                                                                                                                    |
| 312   | SRDINV84F - Promote Hideous Laughter Repeat-Save Runtime           | done | SRDINV83                                                                                                                                                                                 | SRDINV85                                                                                                            | [SRDINV83 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV83_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md), [Hideous Laughter](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [Prone](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Incapacitated](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                  | Promote Hideous Laughter's initial Wisdom save, Prone and Incapacitated lifecycle, end-turn repeat save, damage-triggered repeat save with Advantage, Prone self-end suppression, and slot-scaled additional targets.                                                                                                                                                                      |
| 313   | SRDINV84G - Promote Sanctuary Targeting Interdiction Runtime       | done | SRDINV83                                                                                                                                                                                 | SRDINV85                                                                                                            | [SRDINV83 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV83_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md), [Sanctuary](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md), [Target](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Saving Throw](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                      | Completed: promoted Sanctuary's warded-creature effect, Wisdom-save targeting interdiction for direct attack rolls and damaging spells, choose-new-target-or-lose outcome, area-effect exclusion, early end on warded attack/spell/damage, and unit-profile owner evidence.                                                                                                                     |
| 314   | SRDINV84H - Promote Shillelagh Weapon Override Runtime             | done | SRDINV83                                                                                                                                                                                 | SRDINV85                                                                                                            | [SRDINV83 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV83_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md), [Shillelagh](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md), [Weapon Attack](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Completed: promoted Shillelagh's held Club or Quarterstaff gate, attached held-weapon identity, spellcasting ability attack and damage projection, level-scaled damage die, Force-or-normal damage choice, recast replacement, and let-go cleanup using caller-supplied held/wielded facts.                                                                                                                                              |
| 315   | SRDINV84I - Research Find Familiar Companion Runtime Split         | done               | SRDINV83                                                                                                                                                                                 | SRDINV85                                                                                                            | [SRDINV84I research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV84I_FIND_FAMILIAR_COMPANION_RUNTIME_SPLIT_RESEARCH.md), [SRDINV83 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV83_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md), [Find Familiar](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [Pact of the Chain research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV76E_PACT_OF_THE_CHAIN_FAMILIAR_BOUNDARY_RESEARCH.md), [Reaction](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                             | Completed: split Find Familiar companion runtime into form catalog, lifecycle/replacement, independent turn/action ownership, telepathy/touch-spell delivery, and Pact of the Chain Reaction attack follow-up boundaries; do not treat the current inline placeholder as runtime support evidence.                              |
| 316   | SRDINV85 - Recursive Level-1 Battle Feature Planning Review        | done               | SRDINV84A, SRDINV84B, SRDINV84C, SRDINV84D, SRDINV84E, SRDINV84F, SRDINV84G, SRDINV84H, SRDINV84I                                                                                       | SRDINV84I1, SRDINV84I2, SRDINV84I3, SRDINV84I4, SRDINV84I5, SRDINV86                                                | [SRDINV85 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV85_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md), [SRDINV84I research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV84I_FIND_FAMILIAR_COMPANION_RUNTIME_SPLIT_RESEARCH.md), [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [UNIT_REPORT](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md), [ACTIVE_PLAN](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                 | Completed: reviewed SRDINV84A-I, closed Spare the Dying evidence drift, refreshed readiness at 297/367 (80.9%), identified Find Familiar as the lone installed spell-list owner-evidence gap, and appended SRDINV84I1-I5 plus SRDINV86.                                                                                                                                                   |
| 317   | SRDINV84I1 - Promote Find Familiar Form Catalog Boundary           | done | SRDINV84I, SRDINV85                                                                                                                                                                      | SRDINV84I2, SRDINV86                                                                                               | [SRDINV84I research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV84I_FIND_FAMILIAR_COMPANION_RUNTIME_SPLIT_RESEARCH.md), [SRDINV85 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV85_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md), [Find Familiar](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [Pact of the Chain](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Warlock.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                       | Completed: replaced runtime use of the inline placeholder with typed familiar form references, normal named forms, CR 0 Beast eligibility, invocation-time Celestial/Fey/Fiend type override, and Pact of the Chain special-form references where SRD Stat Blocks exist.                                                                                                                                 |
| 318   | SRDINV84I2 - Promote Find Familiar Lifecycle and Replacement       | done               | SRDINV84I1                                                                                                                                                                               | SRDINV84I3, SRDINV84I4, SRDINV86                                                                                   | [SRDINV84I research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV84I_FIND_FAMILIAR_COMPANION_RUNTIME_SPLIT_RESEARCH.md), [SRDINV85 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV85_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md), [Find Familiar](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                  | Completed: Find Familiar now has companion-owned lifecycle state, one familiar per caster, atomic recast form/type replacement, 0-HP disappearance, temporary/permanent dismissal, Magic-action reappearance, and item-drop boundary events without deriving map or inventory state.                                                                                                                |
| 319   | SRDINV84I3 - Promote Familiar Turn and No-Attack Action Gate       | done | SRDINV84I2                                                                                                                                                                               | SRDINV84I4, SRDINV84I5, SRDINV86                                                                                   | [SRDINV84I research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV84I_FIND_FAMILIAR_COMPANION_RUNTIME_SPLIT_RESEARCH.md), [SRDINV85 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV85_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md), [Find Familiar](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [Action](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Initiative](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                           | Completed: present familiars are allied combatants with their own Initiative turn, action, Reaction, and Movement resources; supported non-attack actions remain available, while ordinary Find Familiar attacks and Opportunity Attacks are rejected.                                                                                                                                                                                                       |
| 320   | SRDINV84I4 - Promote Telepathic Connection and Touch-Spell Delivery | done            | SRDINV84I2, SRDINV84I3                                                                                                                                                                   | SRDINV86                                                                                                           | [SRDINV84I research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV84I_FIND_FAMILIAR_COMPANION_RUNTIME_SPLIT_RESEARCH.md), [SRDINV85 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV85_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md), [Find Familiar](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [Telepathy](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Reaction](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                             | Completed: promoted the 100-foot telepathic communication projection without shared-language requirement, caster Bonus Action shared senses until the start of the caster's next turn, and Touch-range spell delivery through a present familiar with atomic familiar Reaction spend. |
| 321   | SRDINV84I5 - Promote Pact of the Chain Familiar Reaction Attack    | done            | SRDINV84I2, SRDINV84I3                                                                                                                                                                   | SRDINV86                                                                                                           | [SRDINV84I research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV84I_FIND_FAMILIAR_COMPANION_RUNTIME_SPLIT_RESEARCH.md), [SRDINV85 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV85_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md), [Pact of the Chain](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Warlock.md), [Find Familiar](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [Reaction](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                         | Completed: Pact of the Chain now requires selected Pact access, a present owned familiar, one owner Attack-action attack to forgo, familiar Reaction availability, and a supported familiar Stat Block action attack; resolution spends the owner attack and familiar Reaction atomically through the shared Stat Block attack path.                                                                                                                                                                             |
| 322   | SRDINV86 - Recursive Level-1 Battle Feature Planning Review        | done | SRDINV84I1, SRDINV84I2, SRDINV84I3, SRDINV84I4, SRDINV84I5                                                                                                                               | SRDINV87A                                                                                                           | [SRDINV86 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV86_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md), [SRDINV85 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV85_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md), [SRDINV84I research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV84I_FIND_FAMILIAR_COMPANION_RUNTIME_SPLIT_RESEARCH.md), [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [UNIT_REPORT](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md), [ACTIVE_PLAN](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                      | Completed: reviewed SRDINV84I1-I5, added missing Find Familiar deterministic evidence, refreshed inventory artifacts, recorded remaining subset/unsupported battle-adjacent rows with owners, and closed the Find Familiar runtime lane.                                                                      |
| 323   | SRDINV87A - Promote Produce Flame Held-Light Runtime               | ready-for-implementation-after-light-research | SRDINV86                                                                                                                                                                                  | SRDINV87E                                                                                                           | [SRDINV70A research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV70A_LIGHT_ILLUMINATION_RUNTIME_BOUNDARY_RESEARCH.md), [Produce Flame](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-M-P.md), [Light](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [UNIT_REPORT](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote Produce Flame's held flame as source-owned Bright/Dim Light emitter facts, with recast/hurl/end cleanup and no illuminated-area or map illumination derivation. |
| 324   | SRDINV87B - Promote Faerie Fire Dim Light Emission Runtime         | ready-for-implementation-after-light-research | SRDINV86                                                                                                                                                                                  | SRDINV87E                                                                                                           | [SRDINV58B research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV58B_FAERIE_FIRE_OBJECT_LIGHT_BOUNDARY_RESEARCH.md), [SRDINV70A research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV70A_LIGHT_ILLUMINATION_RUNTIME_BOUNDARY_RESEARCH.md), [Faerie Fire](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [UNIT_REPORT](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote Faerie Fire's affected-creature/object Dim Light emission as concentration-owned emitter facts attached to the existing outline effects, without deriving visibility, color rendering, or map illumination. |
| 325   | SRDINV87C - Promote Hunter's Mark Finding Advantage Runtime        | ready-for-implementation-after-light-research | SRDINV86                                                                                                                                                                                  | SRDINV87E                                                                                                           | [Hunter's Mark](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [Favored Enemy](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Ranger.md), [UNIT_REPORT](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote the caller-supplied Wisdom (Perception or Survival) Advantage roll mode to find the marked target for Hunter's Mark and Ranger Favored Enemy, reusing existing mark ownership and avoiding generic exploration search state. |
| 326   | SRDINV87D - Promote Sleep Non-Sleeper Auto-Success Runtime         | ready-for-implementation-after-light-research | SRDINV86                                                                                                                                                                                  | SRDINV87E                                                                                                           | [Sleep](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md), [SRDINV38 research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV38_SLEEP_SAVE_LOOP_RESEARCH.md), [UNIT_REPORT](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Promote an executable non-sleeper fact for Sleep so creatures that do not sleep automatically succeed on Sleep saves, alongside the existing Exhaustion-immunity automatic-success path. |
| 327   | SRDINV87E - Recursive Level-1 Battle Coverage Planning Review      | ready-for-research | SRDINV87A, SRDINV87B, SRDINV87C, SRDINV87D                                                                                                                                               | next concrete batch unless accepted battle coverage is 100%                                                        | [SRDINV86 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV86_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md), [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [UNIT_REPORT](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md), [ACTIVE_PLAN](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Recompute the user's default acceptance metric: level-1 character creation content loads, battle-relevant units are available, and supported units are usable through promoted battle-runtime paths; append the next runnable batch unless that metric is genuinely complete or every remainder is owner-accepted non-battle/non-runtime. |

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

### Task 277 - SRDINV72A - Promote Bardic Inspiration Grant Runtime

Status: `done`

Depends on: completed baseline

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

Status: `done`

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

Completed: promoted Bardic Inspiration die use after an already-failed attack
roll, Saving Throw, or Ability Check, including roll addition, possible
failure-to-success replay, die expenditure, success rejection, invalid die-roll
rejection, and double-spend rejection. Later-level die sizes remain tracked by
SRDINV78.

### Task 279 - SRDINV73A - Promote Monk Martial Arts Attack Projection

Status: `done`

Depends on: completed baseline

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

Completed: promoted Martial Arts attack projection through the Unit feature
profile, character battle build projection, promoted Quint facts, and focused
runtime tests. The supported subset covers unarmored/unshielded loadout
eligibility, Monk weapon qualification, level-1 d6 damage replacement,
Dexterity-vs-Strength attack and damage choice, and Grapple/Shove save DC
projection. Bonus Action Unarmed Strike is completed by SRDINV73B; later
Martial Arts die scaling remains SRDINV78.

### Task 280 - SRDINV73B - Promote Monk Martial Arts Bonus Unarmed Strike

Status: `done`

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

Completed: promoted Martial Arts' Bonus Action Unarmed Strike while unarmored,
unshielded, and unarmed or wielding only Monk weapons, reusing SRDINV73A's
attack projection and Bonus Action spending without an Attack-action
prerequisite.

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

Status: `done`

Depends on: completed baseline

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

Completed: promoted Sap's selected-weapon mastery gate, hit-applied
Disadvantage on the target's next attack roll, consumption on that attack roll,
and cleanup at the start of the attacker's next turn. Runtime evidence includes
focused battle-runtime and character-battle-runtime tests plus package-local
Quint facts; coverage artifacts record `unit-feature.weapon-mastery-sap`.

### Task 282 - SRDINV74B - Research Weapon Mastery Cleave and Topple Split

Status: `done`

Depends on: SRDINV74A

Blocks: SRDINV74C, SRDINV74D

Research / plan:
[Cleave and Topple research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV74B_CLEAVE_TOPPLE_SPLIT_RESEARCH.md),
[Cleave and Topple](/workspace/typescript/dnd/.references/srd-5.2.1/Equipment.md),
[Prone](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Weapon Mastery](/workspace/typescript/dnd/.references/srd-5.2.1/Equipment.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Completed: reviewed Cleave, Topple, Prone, Weapon Mastery, and current Surface
mechanics. Current Surface records already represent both mastery properties;
the missing work is runtime/catalog/support-profile/QNT/test/evidence
promotion, split into SRDINV74C for Topple and SRDINV74D for Cleave.

Out of scope: implementing Cleave or Topple in this research task and
promoting every mastery property as one broad task.

Verification: completed RAW/source review for Cleave, Topple, Prone, and
Weapon Mastery; produced
`plans/unit-profile-coverage/SRDINV74B_CLEAVE_TOPPLE_SPLIT_RESEARCH.md`;
updated active-plan index, DAG, and task details for SRDINV74C/SRDINV74D;
`pnpm quality`; `/simplify` convergence recorded in the research note.

### Task 283 - SRDINV75A - Promote Sorcerer Innate Sorcery Activation Runtime

Status: `done`

Depends on: completed baseline

Blocks: SRDINV75B, SRDINV78

Research / plan:
[Innate Sorcery](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Sorcerer.md),
[Bonus Action](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Long Rest](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Completed: promoted Innate Sorcery activation as a Bonus Action, two-use Long
Rest resource spend, one-minute active occurrence, exhausted-use rejection,
Sorcerer ownership gate, expiration cleanup, and profile evidence without yet
wiring spell DC/attack projections.

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

Status: `done`

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

Status: `done`

Depends on: completed baseline

Blocks: SRDINV76B, SRDINV76C, SRDINV76D, SRDINV76E, SRDINV76F, SRDINV78

Research / plan:
[SRDINV76A research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV76A_WARLOCK_LEVEL_1_INVOCATION_BOUNDARY_RESEARCH.md),
[Eldritch Invocations](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Warlock.md),
[Pact Magic](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Warlock.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Completed: classified level-1-legal Warlock invocation options into
spell-access, battle-runtime, companion-boundary, and character-creation/spell
access tasks before promoting any one option as representative support. At SRD
level 1, Armor of Shadows, Eldritch Mind, Pact of the Blade, Pact of the Chain,
and Pact of the Tome are legal options; invocations with level 2 prerequisites
must not be counted as level-1 coverage.

Out of scope: implementing invocation options in the research task and treating
all invocations as one runtime feature.

Verification: RAW/source review for Eldritch Invocations, Warlock level
prerequisites, Pact Magic, and `UBIQUITOUS_LANGUAGE.md`; produce a short
research note under `plans/unit-profile-coverage/`; active-plan consistency if
follow-up tasks are appended; `pnpm quality`; `/simplify` convergence only if
code or substantial plan structure changes.

### Task 286 - SRDINV76B - Promote Pact of the Blade Battle Projection

Status: `done`

Depends on: SRDINV76A

Blocks: SRDINV78

Research / plan:
[SRDINV76A research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV76A_WARLOCK_LEVEL_1_INVOCATION_BOUNDARY_RESEARCH.md),
[Pact of the Blade](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Warlock.md),
[Weapon Attack](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Damage Types](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote Pact of the Blade's bonded weapon battle projection only:
selected `pact_of_the_blade` invocation ownership, bonded Simple or Martial
Melee weapon eligibility, proficiency, spellcasting-focus fact if represented
in battle, Charisma attack/damage option, selectable
Necrotic/Psychic/Radiant/normal damage type, and bond lifecycle gates only to
the extent the runtime owns those timing and identity facts. Keep the
conjured/bonded weapon identity boundary typed and avoid generic item lifecycle
simulation unless the existing inventory model already owns it.

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

Status: `done`

Depends on: completed baseline

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

Out of scope: Hunter's Mark base spell behavior covered by SRDINV62/SRDINV63,
any later ability-check roll-mode work routed through SRDINV66, Ranger
spell-list admission already handled elsewhere, and later Favored Enemy scaling.

Verification: RAW/source review for Favored Enemy, Hunter's Mark, and Long
Rest; focused tests for prepared/access projection, slotless cast spend,
fallback to normal slot cast when free uses are exhausted if supported, Long
Rest reset, concentration/effect reuse, and no duplicate spell-slot accounting;
package-local Quint updates before runtime divergence; `pnpm
unit-profile-coverage:check --write` if evidence changes; `pnpm quality`;
`/simplify` convergence for significant changes; MBT only if spell-cast
resource sequencing changes require it.

### Task 288 - SRDINV78 - Recursive Level-1 Battle Feature Planning Review

Status: `done`

Depends on: SRDINV58C, SRDINV72A, SRDINV72B, SRDINV73A, SRDINV73B, SRDINV74A, SRDINV74C, SRDINV74D, SRDINV75A, SRDINV75B, SRDINV76A, SRDINV76B, SRDINV76C, SRDINV76D, SRDINV76E, SRDINV76F, SRDINV77

Blocks: SRDINV79, SRDINV80A, SRDINV80B, SRDINV80C, SRDINV80D, SRDINV80E,
SRDINV80F, SRDINV80G, SRDINV81, SRDINV82, SRDINV83

Research / plan:
[SRDINV78 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV78_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md),
[ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md),
[SRDINV76A research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV76A_WARLOCK_LEVEL_1_INVOCATION_BOUNDARY_RESEARCH.md),
[Pact of the Chain research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV76E_PACT_OF_THE_CHAIN_FAMILIAR_BOUNDARY_RESEARCH.md),
[Pact of the Tome research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV76F_PACT_OF_THE_TOME_SPELL_ACCESS_BOUNDARY_RESEARCH.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: review SRDINV58C, SRDINV59A, SRDINV59B, SRDINV67, SRDINV68A, SRDINV68B,
SRDINV69A, SRDINV69B, SRDINV70A, SRDINV70B, SRDINV71, SRDINV72A, SRDINV72B,
SRDINV73A, SRDINV73B, SRDINV74A, SRDINV74C, SRDINV74D, SRDINV75A, SRDINV75B,
SRDINV76A, SRDINV76B, SRDINV76C, SRDINV76D, SRDINV76E, SRDINV76F, SRDINV77,
refresh level-1 battle-related feature/spell metrics, explicitly account for
the remaining Starry Wisp object-target
Invisible-condition benefit projection gap, calculate the remaining acceptance
gap for "all battle-related level-1 features, including spells, can be used in
battle," and decide whether the next queue is final closure, cleanup, or
another concrete implementation batch.

Out of scope: claiming 100% support from catalog/profile admission alone and
recursively inventing tasks before the implemented batch has been reviewed.

Verification: RAW/source review for any newly appended slices plus
`UBIQUITOUS_LANGUAGE.md`; active-plan consistency across Ralph index, DAG table,
and task details; regenerate inventory with `pnpm
unit-profile-coverage:check --write` when evidence or inventory artifacts
change; explicitly list remaining unsupported/profile-subset-supported
battle-related level-1 rows with reason and owner; `/simplify` convergence,
minimum two rounds unless the final changeset is trivial.

Completed: produced
`plans/unit-profile-coverage/SRDINV78_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md`,
refreshed generated inventory metrics, recorded the remaining 83-row
battle-readiness gap, explicitly kept Starry Wisp object-target
Invisible-benefit denial as a blocker, and appended SRDINV79-SRDINV83 as the
next concrete batch.

### Task 289 - SRDINV58C - Promote Faerie Fire Object Outline Runtime

Status: `done`

Depends on: completed baseline

Blocks: SRDINV78

Research / plan:
[SRDINV58B_FAERIE_FIRE_OBJECT_LIGHT_BOUNDARY_RESEARCH.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV58B_FAERIE_FIRE_OBJECT_LIGHT_BOUNDARY_RESEARCH.md),
[Faerie Fire](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[Object](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Target](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote Faerie Fire's noncreature object outline branch through
caller-supplied object ids for objects in the Cube and caller-supplied object
sight facts for object-target attack rolls. Store or project only the
concentration-owned object outline facts needed to grant attack-roll Advantage
against affected objects and deny Invisible-condition benefits for those
objects.

Out of scope: deriving object membership from area geometry, adding object
inventory or location state, deriving object visibility/cover/line of sight,
and implementing Dim Light or Lightly Obscured propagation. Dim Light remains
owned by SRDINV70A/SRDINV59A.

Verification: RAW/source review for Faerie Fire, Object, Target, attack-roll
Advantage, and Invisible wording; focused tests for object-id admission, object
attack Advantage with supplied sight facts, concentration cleanup, no creature
regression, and no duplicated object inventory or visibility state;
package-local Quint updates before runtime divergence; `pnpm
unit-profile-coverage:check --write` if evidence changes; `pnpm quality`;
`/simplify` convergence for significant changes; MBT only if object-target
attack sequencing changes require it.

Completed: promoted caller-supplied Faerie Fire object ids through the
save-gated area fill; stored concentration-owned object outlines; consumed
caller-supplied object sight facts to grant object-target spell attack
Advantage; cleaned object outlines when Concentration ends; and kept object
inventory, geometry, visibility, cover, line of sight, and Dim Light propagation
outside this runtime slice.

### Task 290 - SRDINV74C - Promote Weapon Mastery Topple Runtime

Status: `done`

Depends on: SRDINV74B

Blocks: SRDINV78

Research / plan:
[SRDINV74B Cleave and Topple split research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV74B_CLEAVE_TOPPLE_SPLIT_RESEARCH.md),
[Topple](/workspace/typescript/dnd/.references/srd-5.2.1/Equipment.md),
[Prone](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Weapon Mastery](/workspace/typescript/dnd/.references/srd-5.2.1/Equipment.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote Topple as an optional selected-weapon mastery rider. Gate the
rider on weapon hit, selected weapon mastery ownership, the attacked weapon's
authored Topple Mastery Property, and a `weaponMasteryTopple` support profile.
Derive the Constitution save DC from 8 plus the attack ability modifier plus
the attacker's Proficiency Bonus, then apply Prone on failed save and no effect
on success.

Out of scope: generic weapon or creature save DC storage, Cleave's extra attack
and once-per-turn state, and Prone movement/crawl/righting behavior beyond the
condition effects needed by promoted attack-roll mode tests.

Completed: promoted Topple as an optional selected-weapon mastery rider, with
runtime and package-local Quint gates for weapon hit, selected weapon mastery
ownership, authored Topple Mastery Property, and `weaponMasteryTopple` support.
The runtime derives the Constitution save DC from 8 plus the attack ability
modifier plus the attacker's Proficiency Bonus, applies Prone on failed save,
and treats success or rider decline as no effect. Focused coverage includes
selected-weapon gates, optional rider choice, DC derivation, failed-save Prone
application, successful-save no-op, missing selected mastery rejection, missing
Topple support rejection, and character-battle selected-weapon projection.

### Task 291 - SRDINV74D - Promote Weapon Mastery Cleave Runtime

Status: `done`

Depends on: SRDINV74B

Blocks: SRDINV78

Research / plan:
[SRDINV74B Cleave and Topple split research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV74B_CLEAVE_TOPPLE_SPLIT_RESEARCH.md),
[Cleave](/workspace/typescript/dnd/.references/srd-5.2.1/Equipment.md),
[Weapon Mastery](/workspace/typescript/dnd/.references/srd-5.2.1/Equipment.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote Cleave as an optional once-per-turn selected-weapon mastery
rider. Gate the rider on a hit with a melee attack roll using the selected
Cleave weapon, selected weapon mastery ownership, the weapon's authored Cleave
Mastery Property, and a `weaponMasteryCleave` support profile. Require
caller/table-supplied second-target eligibility facts that the second creature
is within 5 feet of the first target and within the attacker's reach. Resolve
the same-weapon second attack and apply weapon damage on hit without adding a
positive ability modifier, while preserving a negative ability modifier.

Out of scope: deriving adjacency, reach, line of sight, cover, or target
identity from a grid or map; conflating Cleave with Extra Attack, Light/Nick
extra attacks, Bonus Actions, or Multiattack; and Topple's save-gated Prone
behavior.

Completed: promoted Cleave as an optional once-per-turn selected-weapon mastery
rider. The runtime gates the rider on a hit with a melee attack roll using the
selected Cleave weapon, selected weapon mastery ownership, the weapon's authored
Cleave Mastery Property, and a `weaponMasteryCleave` support profile. The
second attack uses caller/table-supplied adjacency/reach facts and applies
same-weapon damage without a positive ability modifier while preserving negative
ability modifiers.

Verification: RAW/source review for Cleave, Weapon Mastery, Attack Roll, melee
attack, weapon damage, and Reach; package-local Quint update before runtime
divergence; focused tests for selected-weapon gate, melee-hit-only gate,
optional rider choice, caller-supplied second-target eligibility rejection,
same-weapon second attack, second-hit damage without positive ability modifier,
negative ability modifier preservation, once-per-turn enforcement, missing
selected mastery rejection, missing Cleave support rejection, and
character-battle selected-weapon projection; `pnpm
unit-profile-coverage:check --write` if evidence changes; `pnpm quality`;
`/simplify` convergence for significant changes; MBT only if attack sequencing
changes require it.

### Task 292 - SRDINV76C - Promote Armor of Shadows Spell Access

Status: `done`

Depends on: SRDINV76A

Blocks: SRDINV78

Research / plan:
[SRDINV76A research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV76A_WARLOCK_LEVEL_1_INVOCATION_BOUNDARY_RESEARCH.md),
[Armor of Shadows](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Warlock.md),
[Mage Armor](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-M-P.md),
[Pact Magic](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Warlock.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote selected `armor_of_shadows` invocation ownership into Warlock
Spell Access for Mage Armor. Expose self-targeted Mage Armor Spell Invocation
that spends no Spell Slot, rejects non-self targets and armored self targets,
and reuses the existing Mage Armor persistent armor procedure and early end on
donning armor.

Out of scope: changing Mage Armor's AC formula or duration semantics, generic
no-slot spell access for all invocations, level-2 Fiendish Vigor, and other
prerequisite spell-access invocations.

Verification: RAW/source review for Armor of Shadows, Mage Armor, Pact Magic,
Spell Access, and Spell Invocation terms; focused tests for selected
invocation ownership, self-only targeting, no-slot spend, armored-target
rejection, existing Mage Armor effect reuse, and no duplicate Mage Armor state;
package-local Quint updates if the spell invocation resource model changes;
character-battle projection tests; `pnpm unit-profile-coverage:check --write`
if evidence changes; `pnpm quality`; `/simplify` convergence for significant
changes; MBT only if spell-cast sequencing changes require it.

### Task 293 - SRDINV76D - Promote Eldritch Mind Concentration Save Advantage

Status: `done`

Depends on: SRDINV76A

Blocks: SRDINV78

Research / plan:
[SRDINV76A research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV76A_WARLOCK_LEVEL_1_INVOCATION_BOUNDARY_RESEARCH.md),
[Eldritch Mind](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Warlock.md),
[Concentration](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Saving Throw](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote selected `eldritch_mind` invocation ownership into battle
runtime. Apply Advantage only to Constitution Saving Throws made to maintain
Concentration after the caster takes damage.

Out of scope: generic Constitution Saving Throw Advantage, ordinary Saving
Throws that are not Concentration maintenance saves, changing Concentration
break triggers, and level-2+ invocation spell or cantrip modifiers.

Verification: RAW/source review for Eldritch Mind, Concentration, and Saving
Throw; focused tests for selected invocation ownership, Concentration
maintenance save Advantage, ordinary Constitution Saving Throw pass-through,
other Saving Throw pass-through, and no change to Concentration break trigger
timing; package-local Quint updates before runtime divergence;
character-battle projection tests; `pnpm unit-profile-coverage:check --write`
if evidence changes; `pnpm quality`; `/simplify` convergence for significant
changes; MBT only if Concentration save sequencing changes require it.

### Task 294 - SRDINV76E - Research Pact of the Chain Familiar Boundary

Status: `done`

Depends on: SRDINV76A

Blocks: SRDINV78

Research / plan:
[SRDINV76E research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV76E_PACT_OF_THE_CHAIN_FAMILIAR_BOUNDARY_RESEARCH.md),
[SRDINV76A research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV76A_WARLOCK_LEVEL_1_INVOCATION_BOUNDARY_RESEARCH.md),
[Pact of the Chain](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Warlock.md),
[Find Familiar](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[Magic Action](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Completed: decided that selected `pact_of_the_chain` projects Find Familiar
Spell Access with a Magic-action, no-Spell-Slot invocation mode and form
eligibility override, while familiar identity, chosen form stats, Initiative,
actions, Reaction, disappearance, dismissal, and one-familiar replacement
belong to a companion runtime owner. The familiar attack exception should be a
later atomic companion-command procedure that spends one Warlock Attack-action
attack opportunity and the familiar's Reaction together.

Verification: RAW/source review for Pact of the Chain, Find Familiar, Magic
Action, Attack action, Reaction, and companion vocabulary; produce a short
research note under `plans/unit-profile-coverage/`; active-plan consistency if
follow-up tasks are appended; `pnpm quality`; `/simplify` convergence only if
code or substantial plan structure changes.

### Task 295 - SRDINV76F - Research Pact of the Tome Spell Access Boundary

Status: `done`

Depends on: SRDINV76A

Blocks: SRDINV78

Research / plan:
[SRDINV76F research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV76F_PACT_OF_THE_TOME_SPELL_ACCESS_BOUNDARY_RESEARCH.md),
[SRDINV76A research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV76A_WARLOCK_LEVEL_1_INVOCATION_BOUNDARY_RESEARCH.md),
[Pact of the Tome](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Warlock.md),
[Ritual](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Spellcasting Focus](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: completed research decided how Book of Shadows selection records grant
three cantrips and two level-1 Ritual spells from any class as prepared Warlock
spells while the book is on the Warlock's person. Model the book-on-person
Spell Access condition without duplicating selected spell lists, and keep the
Book of Shadows Spellcasting Focus fact attached to the same access source for
future component legality.

Out of scope: implementing Book of Shadows runtime behavior in the research
task, copying selected spell lists into parallel battle state, and treating one
selected spell as representative support for Pact of the Tome.

Verification: completed RAW/source review for Pact of the Tome, Ritual, Spell
Access, prepared spells, and Spellcasting Focus terms; produced
`plans/unit-profile-coverage/SRDINV76F_PACT_OF_THE_TOME_SPELL_ACCESS_BOUNDARY_RESEARCH.md`;
active-plan consistency updated; `pnpm quality`.

### Task 296 - SRDINV79 - Promote Starry Wisp Object Invisible-Benefit Projection

Status: `done`

Depends on: SRDINV78

Blocks: SRDINV83

Research / plan:
[SRDINV78 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV78_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md),
[Starry Wisp](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md),
[Object](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Invisible](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote Starry Wisp's hit-applied object-target Invisible-condition
benefit denial through the existing caller-supplied object target boundary.
Reuse the Starry Wisp object target, object damage disposition, and object
Dim Light emitter facts already promoted by earlier tasks.

Out of scope: adding object inventory, object visibility, map illumination,
line of sight, cover derivation, or generic object condition state beyond the
projection needed to deny Invisible benefits for the hit object until the end
of the caster's next turn.

Verification: completed RAW/source review for Starry Wisp, Object, Target, and
Invisible; package-local Quint and runtime parity updated for object-hit
Invisible-benefit denial, miss non-application, expiration at end of the
caster's next turn, coexistence with object Dim Light emitters, and no object
inventory/visibility state; refreshed unit-profile coverage evidence; `pnpm
quality`.

### Task 297 - SRDINV80A - Widen Hideous Laughter Spell Definition Surface

Status: `done`

Depends on: SRDINV78

Blocks: SRDINV83

Research / plan:
[SRDINV78 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV78_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md),
[Hideous Laughter](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[Prone](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: widen Surface Spell Definition facts for Hideous Laughter's initial
Wisdom save, end-turn repeat save, damage-triggered repeat save with Advantage,
Prone and Incapacitated application, target inability to end Prone on itself,
and slot-scaled additional targets.

Out of scope: implementing the battle runtime procedure before the Surface
shape exists, generic multi-trigger save loops unrelated to this spell, and
deriving target selection geometry from maps.

Verification: RAW/source review for Hideous Laughter, Prone, Incapacitated,
Saving Throw, and damage-triggered repeat saves; Surface parser/schema tests;
content regeneration for Dhall changes; `pnpm unit-profile-coverage:check
--write`; `pnpm quality`; `/simplify` convergence. Completed with Hideous
Laughter catalog admission and unsupported-profile inventory evidence; promoted
battle-runtime execution remains outside this task.

### Task 298 - SRDINV80B - Widen Fog Cloud Spell Definition Surface

Status: `done`

Depends on: SRDINV78

Blocks: SRDINV83

Research / plan:
[SRDINV78 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV78_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md),
[Fog Cloud](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[Heavily Obscured](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: widen Surface Spell Definition facts for Fog Cloud's point-origin fog
Sphere, Heavily Obscured projection, Concentration duration, slot-scaled area
radius, and strong-wind dispersal.

Out of scope: map illumination, line of sight, pathfinding, automatic area
membership, and implementing the battle runtime procedure before the Surface
shape exists.

Verification: RAW/source review for Fog Cloud, Heavily Obscured, Area of
Effect, Concentration, and higher-level slot scaling; Surface parser/schema
tests; content regeneration if Dhall changes; `pnpm
unit-profile-coverage:check --write`; `pnpm quality`; `/simplify`
convergence. Completed with Fog Cloud catalog admission and
unsupported-profile inventory evidence; promoted battle-runtime execution
remains outside this task. Verification ran `pnpm --dir packages/surface exec
vitest run src/surface/unit-catalog.test.ts`, `pnpm --dir packages/surface exec
tsc --noEmit`, `pnpm unit-profile-coverage:check --write`, `pnpm
unit-profile-coverage:check`, and `pnpm quality`. Simplify-style review ran two
rounds and converged with no follow-up code changes.

### Task 299 - SRDINV80C - Widen Spare the Dying Stable Lifecycle Surface

Status: `done`

Depends on: SRDINV78

Blocks: SRDINV83

Research / plan:
[SRDINV78 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV78_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md),
[Spare the Dying](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md),
[Stable](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: widen Surface Spell Definition facts for Spare the Dying's zero-Hit
Point creature target, Stable application, and character-level range scaling.

Out of scope: implementing a complete death saving throw subsystem, automatic
0-HP detection outside caller-supplied target facts, and battle runtime
promotion before the Surface shape exists.

Verification: RAW/source review for Spare the Dying, Stable, Hit Points, Death
Saving Throw, and cantrip range scaling; Surface parser/schema tests; content
regeneration if Dhall changes; `pnpm unit-profile-coverage:check --write`;
`pnpm quality`; `/simplify` convergence. Completed with Spare the Dying catalog
admission and unsupported-profile inventory evidence; promoted battle-runtime
execution remains outside this task.

### Task 300 - SRDINV80D - Widen Sanctuary Targeting Interdiction Surface

Status: `done`

Depends on: SRDINV78

Blocks: SRDINV83

Research / plan:
[SRDINV78 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV78_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md),
[Sanctuary](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md),
[Target](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Completed: authored and installed Sanctuary Surface Spell Definition facts for
the warded creature attachment, Wisdom-save interdiction for attack rolls and
damaging spells, choose-new-target-or-lose outcome, area-effect exclusion, and
early end when the warded creature makes an attack roll, casts a spell, or deals
damage.

Out of scope: implementing the battle runtime procedure before the Surface
shape exists, generic target-redirection framework work beyond this spell's
shape, and deriving area membership or target legality from maps.

Verification: RAW/source review for Sanctuary, Target, Attack Roll, Saving
Throw, spell target rules, and area-effect wording; Surface parser/schema
tests; content regeneration if Dhall changes; `pnpm
unit-profile-coverage:check --write`; `pnpm quality`; `/simplify`
convergence.

### Task 301 - SRDINV80E - Widen Shillelagh Weapon Override Surface

Status: `done`

Depends on: SRDINV78

Blocks: SRDINV83

Research / plan:
[SRDINV78 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV78_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md),
[Shillelagh](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md),
[Weapon Attack](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: widen Surface Spell Definition facts for Shillelagh's held Club or
Quarterstaff target, spellcasting ability attack and damage option,
level-scaled damage die, Force-or-normal damage choice, and early end on recast
or when the caster lets go of the weapon.

Out of scope: generic item lifecycle simulation, weapon inventory ownership
beyond caller-supplied held/wielded facts, and battle runtime promotion before
the Surface shape exists.

Verification: RAW/source review for Shillelagh, Weapon Attack, Damage Type,
Holding/Wielding vocabulary, and cantrip damage scaling; Surface parser/schema
tests; content regeneration if Dhall changes; `pnpm
unit-profile-coverage:check --write`; `pnpm quality`; `/simplify`
convergence.

Completed: authored and installed Shillelagh Surface facts for the held Club or
Quarterstaff attachment, spellcasting ability attack/damage option, level-scaled
damage die, Force-or-normal damage choice, and recast/let-go early end; promoted
battle-runtime execution remains owner-evidence work tracked by the generated
inventory rows.

### Task 302 - SRDINV80F - Widen Fire Bolt and Sorcerous Burst Cantrip Surface

Status: `done`

Depends on: SRDINV78

Blocks: SRDINV83

Research / plan:
[SRDINV78 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV78_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md),
[Fire Bolt](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[Sorcerous Burst](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md),
[Object](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: widen Surface Spell Definition facts for Fire Bolt's creature-or-object
ranged spell attack and unattended flammable-object ignition, plus Sorcerous
Burst's cast-time damage type choice, exploding d8 loop capped by spellcasting
ability modifier, creature-or-object target branch, and cantrip damage scaling.

Out of scope: implementing battle runtime procedures before the Surface shapes
exist, generic object inventory, automatic flammability derivation, and
unbounded recursive damage loops.

Verification: RAW/source review for Fire Bolt, Sorcerous Burst, Object,
Breaking Objects, Damage Types, Spell Attack, and cantrip scaling; Surface
parser/schema tests; content regeneration if Dhall changes; `pnpm
unit-profile-coverage:check --write`; `pnpm quality`; `/simplify`
convergence.

Completed: authored Fire Bolt's creature-or-object target and unattended
flammable-object ignition Surface facts, authored and installed Sorcerous
Burst's chosen damage type, capped exploding d8 amount, creature-or-object
target branch, and cantrip scaling; promoted battle-runtime execution remains
owner-evidence work tracked by generated inventory rows.

### Task 303 - SRDINV80G - Widen Hex Curse Spell Definition Surface

Status: `done`

Depends on: SRDINV78

Blocks: SRDINV83

Research / plan:
[SRDINV78 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV78_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md),
[Hex](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[Ability Check](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: widen Surface Spell Definition facts for Hex's cursed target,
spellcasting-ability selected Ability Check Disadvantage, attack-hit bonus
Necrotic damage, Bonus Action retargeting after the target drops to 0 Hit
Points, and slot-scaled Concentration duration.

Completed: authored and installed Hex Surface facts for cursed-target marking,
chosen-ability Ability Check Disadvantage, attack-hit Necrotic damage,
later-turn Bonus Action retargeting after the target drops to 0 Hit Points, and
slot-scaled Concentration duration. Promoted battle-runtime execution remains
owner-evidence work tracked by generated inventory rows.

Out of scope: implementing the battle runtime procedure before the Surface
shape exists, generic curse state for unrelated spells, and automatic target
death detection outside the existing combatant HP boundary.

Verification: RAW/source review for Hex, Ability Check, Attack Roll, Damage
Type, Bonus Action, Concentration, and higher-level slot duration scaling;
Surface parser/schema tests; content regeneration if Dhall changes; `pnpm
unit-profile-coverage:check --write`; `pnpm quality`; `/simplify`
convergence.

### Task 304 - SRDINV81 - Promote Pact of the Chain Find Familiar Access

Status: `done`

Depends on: SRDINV76E, SRDINV78

Blocks: SRDINV83

Research / plan:
[Pact of the Chain research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV76E_PACT_OF_THE_CHAIN_FAMILIAR_BOUNDARY_RESEARCH.md),
[Pact of the Chain](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Warlock.md),
[Find Familiar](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[Magic Action](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote selected Pact of the Chain into Find Familiar Spell Access with
a Magic-action, no-Spell-Slot invocation mode and typed form eligibility
references for normal Find Familiar forms plus Pact of the Chain special forms.
Keep familiar creation behind the future companion runtime boundary.

Completed: selected Pact of the Chain now projects canonical Find Familiar
Spell Access with Magic-action, no-Spell-Slot invocation mode. Eligibility
keeps named normal forms, the SRD "another CR 0 Beast" predicate, and Pact
special forms distinct so no fake form id can be selected as a resolved form.
The promoted battle runtime still withholds Find Familiar battle acts until the
future companion lifecycle boundary exists.

Out of scope: generic companion lifecycle, familiar Initiative, turns, HP,
actions, Reaction, disappearance, dismissal, touch-spell delivery, one-familiar
replacement, and the Pact of the Chain familiar Reaction attack exception.

Verification: RAW/source review for Pact of the Chain, Find Familiar, Magic
Action, Spell Access, and companion vocabulary; focused access/projection tests;
package-local Quint updates if the invocation resource model changes;
`pnpm unit-profile-coverage:check --write` if evidence changes; `pnpm quality`;
`/simplify` convergence; MBT only if spell-cast sequencing changes require it.

### Task 305 - SRDINV82 - Promote Pact of the Tome Book of Shadows Access

Status: `done`

Depends on: SRDINV76F, SRDINV78

Blocks: SRDINV83

Research / plan:
[Pact of the Tome research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV76F_PACT_OF_THE_TOME_SPELL_ACCESS_BOUNDARY_RESEARCH.md),
[Pact of the Tome](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Warlock.md),
[Ritual](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Spellcasting Focus](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote selected Pact of the Tome into one Book of Shadows Spell Access
source with exactly three cantrips and two level-1 Ritual Spell Definition
selections from class spell lists, already-prepared rejection, book-on-person
conditional prepared access, Warlock-spell projection, ordinary Ritual casting
where supported, and a Spellcasting Focus permission attached to the same
source.

Out of scope: implementing unsupported selected Spell Definitions, copying
selected spells into ordinary prepared-spell lists, generic inventory or
hand-occupancy state, and broad component-legality runtime support.

Verification: completed RAW/source review for Pact of the Tome, Ritual,
prepared spells, Spell Access, and Spellcasting Focus; focused
access/projection tests and sheet Ritual invocation tests passed. Broad
battle-runtime package testing was stopped after reproducing unrelated existing
Burning Hands and rule-core MBT failures already recorded by the task review.

### Task 306 - SRDINV83 - Recursive Level-1 Battle Feature Planning Review

Status: `done`

Depends on: SRDINV79, SRDINV80A, SRDINV80B, SRDINV80C, SRDINV80D, SRDINV80E,
SRDINV80F, SRDINV80G, SRDINV81, SRDINV82

Blocks: SRDINV84A, SRDINV84B, SRDINV84C, SRDINV84D, SRDINV84E, SRDINV84F,
SRDINV84G, SRDINV84H, SRDINV84I, SRDINV85

Research / plan:
[SRDINV83 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV83_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md),
[SRDINV78 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV78_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md),
[ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: review SRDINV79-SRDINV82, refresh level-1 battle-readiness metrics,
close evidence-only drift where appropriate, explicitly list remaining
unsupported/profile-subset-supported battle-related level-1 rows with owner and
reason, and decide whether the next queue is final closure, cleanup, or another
concrete implementation batch.

Out of scope: claiming 100% support from catalog/profile admission alone and
starting another recursive-only continuation without reviewing the implemented
batch.

Verification: completed RAW/source review for the appended SRDINV84A-I slices
plus `UBIQUITOUS_LANGUAGE.md`; active-plan consistency updated across Ralph
index, DAG table, and task details; `pnpm unit-profile-coverage:check --write`
passed with no generated artifact drift; `/simplify` converged after three
planning-review rounds.

Completed: reviewed SRDINV79-SRDINV82, refreshed battle readiness at 286/367
(77.9%), closed Surface-widening drift, confirmed 16 installed spell-list rows
still require battle-runtime owner evidence, and appended SRDINV84A-I plus
SRDINV85.

### Task 307 - SRDINV84A - Promote Fire Bolt Object Runtime

Status: `done`

Depends on: SRDINV83

Blocks: SRDINV85

Research / plan:
[SRDINV83 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV83_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md),
[Fire Bolt](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[Object](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Attack Roll](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote Fire Bolt's creature-or-object ranged spell attack through the
existing object target boundary, including Fire damage, cantrip scaling,
caller-supplied object damage facts, and unattended flammable-object ignition.

Out of scope: generic object inventory, automatic flammability derivation, map
fire simulation, and changes to other object-target spells except shared helper
work needed to keep the implementation non-duplicative.

Verification: RAW/source review for Fire Bolt, Object, Attack Roll, Damage
Type, and cantrip scaling plus `UBIQUITOUS_LANGUAGE.md`; package-local Quint
and runtime parity for object hit/miss, ignition/no-ignition, and cantrip
scaling; `pnpm unit-profile-coverage:check --write`; `pnpm quality`;
`/simplify` convergence. Battle MBT only if the spell invocation reducer
sequencing changes.

Completed: promoted Fire Bolt's creature-or-object ranged spell attack through
the existing object target boundary, including Fire damage, cantrip scaling,
caller-supplied object damage facts, missing ignition-fact rejection, and
unattended flammable-object ignition/no-ignition outcomes.

### Task 308 - SRDINV84B - Promote Sorcerous Burst Runtime

Status: `done`

Depends on: SRDINV83

Blocks: SRDINV85

Research / plan:
[SRDINV83 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV83_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md),
[Sorcerous Burst](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md),
[Object](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Attack Roll](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote Sorcerous Burst's ranged spell attack, cast-time damage type
choice, exploding d8 damage loop capped by spellcasting ability modifier,
creature-or-object target branch, caller-supplied object damage facts, and
cantrip scaling.

Out of scope: unbounded recursive damage loops, random damage rolling beyond
the existing deterministic test/projection boundary, and generic object
inventory.

Verification: RAW/source review for Sorcerous Burst, Object, Attack Roll,
Damage Type, and cantrip scaling plus `UBIQUITOUS_LANGUAGE.md`; package-local
Quint and runtime parity for chosen damage types, capped exploding d8 behavior,
object/creature targets, and scaling; `pnpm unit-profile-coverage:check
--write`; `pnpm quality`; `/simplify` convergence. Battle MBT only if the
spell invocation reducer sequencing changes.

Completed: promoted Sorcerous Burst's ranged spell attack with cast-time
Acid/Cold/Fire/Lightning/Poison/Psychic/Thunder damage type choice,
creature-or-object target branch, cantrip scaling, capped exploding d8
validation, caller-supplied object damage facts, and object Poison/Psychic
damage immunity.

### Task 309 - SRDINV84C - Promote Spare the Dying Stable Runtime

Status: `done`

Depends on: SRDINV83

Blocks: SRDINV85

Research / plan:
[SRDINV83 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV83_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md),
[Spare the Dying](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md),
[Stable](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote Spare the Dying's zero-Hit-Point not-dead target admission,
Stable lifecycle application, dead-target rejection, and character-level range
scaling.

Out of scope: implementing a complete death-saving-throw subsystem,
automatically deriving target dying state outside combatant Hit Points, and
long-duration 1d4-hour Stable recovery timing unless the current runtime
already owns that clock.

Verification: RAW/source review for Spare the Dying, Stable, Hit Points, Death
Saving Throw, and cantrip range scaling plus `UBIQUITOUS_LANGUAGE.md`;
package-local Quint and runtime parity for target admission/rejection, Stable
application, and scaling; `pnpm unit-profile-coverage:check --write`; `pnpm
quality`; `/simplify` convergence. Completed with promoted battle-runtime
support for Spare the Dying target admission/rejection, Stable application, and
character-level range scaling.

### Task 310 - SRDINV84D - Promote Hex Curse Runtime

Status: `done`

Depends on: SRDINV83

Blocks: SRDINV85

Research / plan:
[SRDINV83 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV83_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md),
[Hex](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[Ability Check](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Attack Roll](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote Hex's Bonus Action curse, chosen-ability Ability Check
Disadvantage, attack-hit Necrotic damage rider, later-turn Bonus Action
retarget after the target drops to 0 Hit Points, and slot-scaled Concentration
duration.

Out of scope: generic curse state for unrelated spells, automatic target-death
detection beyond the combatant HP boundary, and exploration tracking for
finding the cursed target beyond the chosen-ability Ability Check roll mode.

Verification: RAW/source review for Hex, Ability Check, Attack Roll, Damage
Type, Bonus Action, Concentration, and higher-level slot duration scaling plus
`UBIQUITOUS_LANGUAGE.md`; package-local Quint and runtime parity for damage
rider, ability-check roll mode, retargeting, cleanup, and duration scaling;
`pnpm unit-profile-coverage:check --write`; `pnpm quality`; `/simplify`
convergence. Battle MBT only if the attack or concentration reducer sequencing
changes. Completed with promoted battle-runtime support for Hex's Bonus Action
curse, chosen-ability Ability Check Disadvantage, attack-hit Necrotic damage
rider, later-turn Bonus Action retarget after the target drops to 0 Hit Points,
and slot-scaled Concentration duration.

### Task 311 - SRDINV84E - Promote Fog Cloud Obscurement Runtime

Status: `done`

Depends on: SRDINV83

Blocks: SRDINV85

Research / plan:
[SRDINV83 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV83_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md),
[Fog Cloud](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[Heavily Obscured](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Area of Effect](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote a caller-supplied fog-area occurrence with Heavily Obscured
projection, slot-scaled radius facts, Concentration duration, and table-supplied
strong-wind dispersal.

Out of scope: map illumination, line of sight, automatic area membership,
pathfinding, and deriving wind from environmental simulation.

Verification: RAW/source review for Fog Cloud, Heavily Obscured, Area of
Effect, Concentration, and higher-level slot scaling plus
`UBIQUITOUS_LANGUAGE.md`; package-local Quint and runtime parity for area
creation, radius scaling, concentration cleanup, and strong-wind dispersal;
`pnpm unit-profile-coverage:check --write`; `pnpm quality`; `/simplify`
convergence. Completed with promoted battle-runtime support for caller-supplied
fog area identity, Heavily Obscured area projection, slot-scaled Sphere radius,
one-hour Concentration cleanup, Spell Slot spending, and table-supplied
strong-wind dispersal.

### Task 312 - SRDINV84F - Promote Hideous Laughter Repeat-Save Runtime

Status: `done`

Depends on: SRDINV83

Blocks: SRDINV85

Research / plan:
[SRDINV83 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV83_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md),
[Hideous Laughter](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[Prone](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Incapacitated](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote Hideous Laughter's initial Wisdom save, Prone and Incapacitated
lifecycle, end-turn repeat save, damage-triggered repeat save with Advantage,
Prone self-end suppression, and slot-scaled additional targets.

Out of scope: generic multi-trigger save framework work not needed by this
spell, target-selection geometry, and laughter capability modeling unless an
existing executable fact already owns that distinction.

Verification: RAW/source review for Hideous Laughter, Prone, Incapacitated,
Saving Throw, damage-triggered repeat saves, Concentration, and higher-level
target scaling plus `UBIQUITOUS_LANGUAGE.md`; package-local Quint and runtime
parity for initial save, repeat-save triggers, damage-triggered Advantage,
condition cleanup, and scaling; `pnpm unit-profile-coverage:check --write`;
`pnpm quality`; `/simplify` convergence. Battle MBT only if turn/damage
trigger sequencing changes.

### Task 313 - SRDINV84G - Promote Sanctuary Targeting Interdiction Runtime

Status: `done`

Depends on: SRDINV83

Blocks: SRDINV85

Research / plan:
[SRDINV83 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV83_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md),
[Sanctuary](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md),
[Target](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Saving Throw](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Completed: promoted Sanctuary's warded-creature effect, Wisdom-save targeting
interdiction for direct attack rolls and damaging spells, choose-new-target or
lose outcome, area-effect exclusion, early end when the warded creature makes an
attack roll, casts a spell, or deals damage, and unit-profile owner evidence.

Out of scope: generic target-redirection framework work beyond this spell's
procedure, map-derived area membership, and protection from non-targeted area
effects.

Verification: RAW/source review for Sanctuary, Target, Attack Roll, Saving
Throw, spell target rules, area-effect wording, and Bonus Action plus
`UBIQUITOUS_LANGUAGE.md`; package-local Quint and runtime parity for
interdiction success/failure, target replacement/loss outcome, area exclusion,
and early-end triggers; `pnpm unit-profile-coverage:check --write`; `pnpm
quality`; `/simplify` convergence. Battle MBT only if targeting-window
sequencing changes.

### Task 314 - SRDINV84H - Promote Shillelagh Weapon Override Runtime

Status: `done`

Depends on: SRDINV83

Blocks: SRDINV85

Research / plan:
[SRDINV83 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV83_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md),
[Shillelagh](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md),
[Weapon Attack](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote Shillelagh's held Club or Quarterstaff target gate,
spellcasting ability attack and damage option, level-scaled damage die,
Force-or-normal damage choice, and early end on recast or when the caster lets
go of the weapon.

Out of scope: generic item inventory, automatic hand occupancy, item
conjuration, and unrelated weapon override mechanics.

Verification: RAW/source review for Shillelagh, Weapon Attack, Damage Type,
Holding/Wielding vocabulary, and cantrip damage scaling plus
`UBIQUITOUS_LANGUAGE.md`; package-local Quint and runtime parity for target
gate, attack/damage projection, damage type choice, scaling, recast replacement,
and let-go cleanup; `pnpm unit-profile-coverage:check --write`; `pnpm
quality`; `/simplify` convergence.

Completed: promoted Shillelagh's held Club or Quarterstaff gate, attached
held-weapon identity, spellcasting ability attack and damage projection,
level-scaled damage die, Force-or-normal damage choice, recast replacement, and
let-go cleanup using caller-supplied held/wielded facts.

### Task 315 - SRDINV84I - Research Find Familiar Companion Runtime Split

Status: `done`

Depends on: SRDINV83

Blocks: SRDINV85

Research / plan:
[SRDINV84I research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV84I_FIND_FAMILIAR_COMPANION_RUNTIME_SPLIT_RESEARCH.md),
[SRDINV83 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV83_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md),
[Find Familiar](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[Pact of the Chain research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV76E_PACT_OF_THE_CHAIN_FAMILIAR_BOUNDARY_RESEARCH.md),
[Reaction](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: research and split the companion runtime boundary for Find Familiar:
normal named forms plus CR 0 Beast eligibility, caster-chosen Celestial/Fey/Fiend
type, one-familiar lifecycle and replacement, familiar Initiative and turns,
telepathy/sensory sharing, touch-spell delivery, dismissal, disappearance, item
drop, and Pact of the Chain's attack exception.

Out of scope: implementing companion runtime before the ownership boundary is
split, generic summon/pet architecture for non-Find-Familiar spells, and
treating Pact of the Chain Spell Access as familiar lifecycle support.

Verification: RAW/source review for Find Familiar, Pact of the Chain, Reaction,
Magic Action, companion vocabulary, and Spell Access plus
`UBIQUITOUS_LANGUAGE.md`; create a task-specific research file if the split is
nontrivial; active-plan consistency updates; `pnpm unit-profile-coverage:check
--write` only if evidence artifacts change; `/simplify` convergence. No battle
MBT for research-only work.

Completed: split Find Familiar companion runtime into form catalog, lifecycle
and replacement, independent familiar turn/action ownership, telepathy and
touch-spell delivery, and Pact of the Chain Reaction attack follow-up
boundaries. Future runtime work must not treat the current Surface inline
placeholder as promoted support evidence; familiar state belongs to a
companion owner, not Spell Access or Warlock invocation state.

### Task 316 - SRDINV85 - Recursive Level-1 Battle Feature Planning Review

Status: `done`

Depends on: SRDINV84A, SRDINV84B, SRDINV84C, SRDINV84D, SRDINV84E, SRDINV84F,
SRDINV84G, SRDINV84H, SRDINV84I

Blocks: SRDINV84I1, SRDINV84I2, SRDINV84I3, SRDINV84I4, SRDINV84I5, SRDINV86

Research / plan:
[SRDINV85 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV85_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md),
[SRDINV83 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV83_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md),
[ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: review SRDINV84A-I, refresh level-1 battle-readiness metrics, close
evidence-only drift where appropriate, explicitly list remaining
unsupported/profile-subset-supported battle-related level-1 rows with owner and
reason, and decide whether the next queue is final closure, cleanup, or another
concrete implementation batch.

Out of scope: claiming 100% support from catalog/profile admission alone and
starting another recursive-only continuation without reviewing the implemented
batch.

Verification: RAW/source review for any newly appended slices plus
`UBIQUITOUS_LANGUAGE.md`; active-plan consistency across Ralph index, DAG
table, and task details; `pnpm unit-profile-coverage:check --write` when
evidence or inventory artifacts change; `/simplify` convergence, minimum two
rounds unless the final changeset is trivial.

Completed: reviewed SRDINV84A-I, closed Spare the Dying evidence drift,
refreshed level-1 battle readiness at 297/367 (80.9%), identified Find
Familiar as the lone installed spell-list owner-evidence gap, and appended
SRDINV84I1-I5 plus SRDINV86 as the next concrete batch.

### Task 317 - SRDINV84I1 - Promote Find Familiar Form Catalog Boundary

Status: `done`

Depends on: SRDINV84I, SRDINV85

Blocks: SRDINV84I2, SRDINV86

Research / plan:
[SRDINV84I research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV84I_FIND_FAMILIAR_COMPANION_RUNTIME_SPLIT_RESEARCH.md),
[SRDINV85 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV85_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md),
[Find Familiar](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[Pact of the Chain](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Warlock.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: completed by replacing runtime use of the inline placeholder with typed familiar form
references. Define normal named forms and CR 0 Beast eligibility against the
Stat Block/monster catalog boundary. Include the Celestial/Fey/Fiend Creature
Type override as invocation input. Keep Pact of the Chain special forms as
additional references where their SRD Stat Blocks exist.

Out of scope: creating a familiar in battle state, companion turns/actions,
Reaction, dismissal, item-drop execution, and generic summon or pet
architecture for other spells.

Verification: RAW/source review for Find Familiar form choice, CR 0 Beast
eligibility, Pact of the Chain special forms, Creature Type vocabulary, and
`UBIQUITOUS_LANGUAGE.md`; package-local Quint updates before runtime
divergence; focused tests for form resolution, type override, unsupported form
rejection, and no support from the inline placeholder; `pnpm
unit-profile-coverage:check --write` if evidence changes; `pnpm quality`;
`/simplify` convergence for significant changes; MBT only if runtime
sequencing changes require it.

### Task 318 - SRDINV84I2 - Promote Find Familiar Lifecycle and Replacement

Status: `done`

Depends on: SRDINV84I1

Blocks: SRDINV84I3, SRDINV84I4, SRDINV86

Research / plan:
[SRDINV84I research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV84I_FIND_FAMILIAR_COMPANION_RUNTIME_SPLIT_RESEARCH.md),
[SRDINV85 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV85_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md),
[Find Familiar](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: completed by casting Find Familiar into companion-owned familiar state with owner link,
chosen form reference, Creature Type override, unoccupied-space placement facts,
and caller-supplied Initiative. Enforce one familiar per caster; implement
atomic recast form replacement, 0-HP disappearance, temporary dismissal,
permanent dismissal as active-record removal, Magic-action reappearance within
30 feet, and item-drop boundary events.

Out of scope: telepathy, shared senses, touch-spell delivery, Pact of the Chain
attack exception, deriving unoccupied spaces, carrying inventory, and movement
geometry.

Verification: RAW/source review for Find Familiar lifecycle, dismissal,
replacement, 0-HP disappearance, and `UBIQUITOUS_LANGUAGE.md`; package-local
Quint updates before runtime divergence; focused tests for cast, replacement,
one-familiar invariant, temporary/permanent dismissal, reappearance, item-drop
event emission, and no map/inventory derivation; `pnpm
unit-profile-coverage:check --write` if evidence changes; `pnpm quality`;
`/simplify` convergence for significant changes; MBT only if companion
lifecycle sequencing changes require it.

### Task 319 - SRDINV84I3 - Promote Familiar Turn and No-Attack Action Gate

Status: `done`

Depends on: SRDINV84I2

Blocks: SRDINV84I4, SRDINV84I5, SRDINV86

Research / plan:
[SRDINV84I research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV84I_FIND_FAMILIAR_COMPANION_RUNTIME_SPLIT_RESEARCH.md),
[SRDINV85 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV85_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md),
[Find Familiar](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[Action](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Initiative](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Completed: present familiars are allied combatants with their own Initiative
turn, action, Reaction, and Movement resources. Supported non-attack actions
remain available, while ordinary Find Familiar attacks and Opportunity Attacks
are rejected.

Out of scope: Pact of the Chain's forgo-one-attack exception, generic command
AI, automatic behavior from "obeys your commands", and map-derived target
legality.

Verification: RAW/source review for Find Familiar combat participation,
Action, Initiative, Reaction, and `UBIQUITOUS_LANGUAGE.md`; package-local Quint
updates before runtime divergence; focused tests for familiar turn ownership,
action/Reaction resources, non-attack action allowance, ordinary attack
rejection, and no caster-resource leakage; `pnpm
unit-profile-coverage:check --write` if evidence changes; `pnpm quality`;
`/simplify` convergence for significant changes; MBT only if turn/action
sequencing changes require it.

### Task 320 - SRDINV84I4 - Promote Telepathic Connection and Touch-Spell Delivery

Status: `done`

Depends on: SRDINV84I2, SRDINV84I3

Blocks: SRDINV86

Research / plan:
[SRDINV84I research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV84I_FIND_FAMILIAR_COMPANION_RUNTIME_SPLIT_RESEARCH.md),
[SRDINV85 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV85_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md),
[Find Familiar](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[Telepathy](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Reaction](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: project the 100-foot telepathic communication fact without requiring
shared language. Implement the caster Bonus Action that shares the familiar's
sight, hearing, and special-sense benefits until the start of the caster's next
turn. Implement Touch-range spell delivery as one spell-invocation procedure
that requires a present familiar within 100 feet and atomically spends the
familiar's Reaction when the caster casts the Touch spell.

Out of scope: full perception, map visibility, sensory rendering, delivering
non-Touch spells, and caller protocols where the caster cast and familiar
Reaction spend can diverge.

Verification: RAW/source review for Find Familiar telepathy, shared senses,
Touch spell delivery, Reaction, and `UBIQUITOUS_LANGUAGE.md`; package-local
Quint updates before runtime divergence; focused tests for range gates,
Bonus Action sharing duration, Touch-only delivery, familiar Reaction spend,
atomic cast/delivery failure, and no map-visibility derivation; `pnpm
unit-profile-coverage:check --write` if evidence changes; `pnpm quality`;
`/simplify` convergence for significant changes; MBT only if spell/Reaction
sequencing changes require it.

Completed: battle-runtime now owns the telepathy projection, shared-senses
Bonus Action effect, and Touch spell delivery wrapper for Find Familiar; unit
profile evidence records SRDINV84I4 as qnt-proof and completed-runtime-parity.

### Task 321 - SRDINV84I5 - Promote Pact of the Chain Familiar Reaction Attack

Status: `done`

Depends on: SRDINV84I2, SRDINV84I3

Blocks: SRDINV86

Research / plan:
[SRDINV84I research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV84I_FIND_FAMILIAR_COMPANION_RUNTIME_SPLIT_RESEARCH.md),
[SRDINV85 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV85_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md),
[Pact of the Chain](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Warlock.md),
[Find Familiar](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[Reaction](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: completed by requiring selected Pact of the Chain, a present owned
familiar, and a supported familiar attack option from the chosen form. While
resolving the Warlock's Attack action, the runtime atomically forgoes one of
the Warlock's own Attack-action attacks and spends the familiar's Reaction,
then resolves the familiar's attack through the existing Stat Block attack
machinery.

Out of scope: ordinary Find Familiar attacks, non-Pact familiars attacking,
generic command AI, and unsupported familiar form attacks.

Verification: RAW/source review for Pact of the Chain's attack exception, Find
Familiar attack prohibition, Reaction, Attack action, and
`UBIQUITOUS_LANGUAGE.md`; package-local Quint updates before runtime
divergence; focused tests for Pact gate, present familiar ownership, forgo-one
attack accounting, familiar Reaction spend, supported attack resolution,
ordinary attack rejection, and non-Pact rejection; `pnpm
unit-profile-coverage:check --write` if evidence changes; `pnpm quality`;
`/simplify` convergence for significant changes; MBT only if attack/Reaction
sequencing changes require it.

### Task 322 - SRDINV86 - Recursive Level-1 Battle Feature Planning Review

Status: `done`

Depends on: SRDINV84I1, SRDINV84I2, SRDINV84I3, SRDINV84I4, SRDINV84I5

Blocks: none

Research / plan:
[SRDINV85 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV85_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md),
[SRDINV86 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV86_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md),
[SRDINV84I research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV84I_FIND_FAMILIAR_COMPANION_RUNTIME_SPLIT_RESEARCH.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md),
[ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: review SRDINV84I1-I5, refresh level-1 battle-readiness metrics, close
evidence-only drift where appropriate, explicitly list remaining
unsupported/profile-subset-supported battle-related level-1 rows with owner and
reason, and decide whether the lane can close or needs another concrete batch.

Out of scope: claiming 100% support from catalog/profile admission alone and
starting another recursive-only continuation without reviewing the implemented
batch.

Completed: reviewed SRDINV84I1-I5, closed the remaining Find Familiar
owner-evidence drift by adding deterministic admission/projection evidence,
refreshed `SRD_UNIT_INVENTORY.md`, `srd-unit-inventory.json`,
`UNIT_REPORT.md`, and `unit-matrix.json`, and closed the Find Familiar runtime
lane. The next batch resumes ordinary level-1 runtime closure work against
remaining subset-supported rows, starting with light-emitter, finding-advantage,
and Sleep automatic-success slices.

Verification: RAW/source review for Find Familiar, Pact of the Chain, Action,
Attack action, Bonus Action, Initiative, Magic Action, Reaction, and Telepathy
plus `UBIQUITOUS_LANGUAGE.md`; active-plan consistency across Ralph index, DAG
table, and task details; `pnpm unit-profile-coverage:check --write`;
`/simplify` convergence recorded in the SRDINV86 review.

### Task 323 - SRDINV87A - Promote Produce Flame Held-Light Runtime

Status: `ready-for-implementation-after-light-research`

Depends on: SRDINV86

Blocks: SRDINV87E

Research / plan:
[SRDINV70A research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV70A_LIGHT_ILLUMINATION_RUNTIME_BOUNDARY_RESEARCH.md),
[Produce Flame](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-M-P.md),
[Light](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote Produce Flame's held flame as a source-owned Bright Light
20-foot radius plus Dim Light 20 additional feet emitter while the held-flame
state is active. Reuse the existing Light emitter fact shape where possible
instead of adding a parallel light-source state. Ensure the emitter ends when
the flame is hurled, dismissed/expired, or replaced by a new held flame, and
that the hurl attack path cannot leave stale light facts.

Out of scope: map illumination rendering, opaque-cover suppression,
illuminated-area projection, Darkvision-adjusted sight, colored-light
presentation, object targeting beyond the already promoted hurl branch, and
generic light-source architecture beyond the facts needed by Produce Flame.

Verification: RAW/source review for Produce Flame's held flame light text,
Light emitter vocabulary, and `UBIQUITOUS_LANGUAGE.md`; package-local Quint
updates before runtime divergence; focused runtime tests for held-light emitter
facts, recast/replacement, hurl cleanup, expiration cleanup, and no stale
emitter facts; `pnpm unit-profile-coverage:check --write` if evidence changes;
`pnpm quality`; `/simplify` convergence, minimum two rounds unless the final
changeset is trivial. MBT only if active-effect sequencing changes require it.

### Task 324 - SRDINV87B - Promote Faerie Fire Dim Light Emission Runtime

Status: `ready-for-implementation-after-light-research`

Depends on: SRDINV86

Blocks: SRDINV87E

Research / plan:
[SRDINV58B research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV58B_FAERIE_FIRE_OBJECT_LIGHT_BOUNDARY_RESEARCH.md),
[SRDINV70A research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV70A_LIGHT_ILLUMINATION_RUNTIME_BOUNDARY_RESEARCH.md),
[Faerie Fire](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote Faerie Fire's affected-creature and affected-object Dim Light
emission as concentration-owned emitter facts attached to existing outline
effects. Reuse the shared Light emitter fact shape where possible; the outline
and light-source facts should clean up together on Concentration end,
expiration, or affected-object/creature cleanup.

Out of scope: deriving who is inside the Cube, map illumination, color
rendering, illuminated-area projection, line of sight, Darkvision interaction,
and any change to the already promoted attack-Advantage or Invisible-benefit
denial behavior.

Verification: RAW/source review for Faerie Fire's Dim Light emission, object
outline wording, and `UBIQUITOUS_LANGUAGE.md`; package-local Quint updates
before runtime divergence; focused runtime tests for creature/object emitter
facts and Concentration cleanup; `pnpm unit-profile-coverage:check --write`
if evidence changes; `pnpm quality`; `/simplify` convergence, minimum two
rounds unless the final changeset is trivial. MBT only if active-effect
sequencing changes require it.

### Task 325 - SRDINV87C - Promote Hunter's Mark Finding Advantage Runtime

Status: `ready-for-implementation-after-light-research`

Depends on: SRDINV86

Blocks: SRDINV87E

Research / plan:
[Hunter's Mark](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[Favored Enemy](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Ranger.md),
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote Hunter's Mark's Advantage on Wisdom (Perception or Survival)
checks to find the marked target as a roll-mode projection tied to the existing
mark owner/effect. The projection should apply only while the mark is active,
only for the caster who owns the mark, only for the marked target, and only for
the two named skills. Ranger Favored Enemy should benefit through its existing
Hunter's Mark access and free-cast path without duplicating feature state.

Out of scope: generic exploration search state, automatic target tracking,
hidden-object discovery, non-Hunter's-Mark ability-check advantage, and
later-level Favored Enemy free-cast count scaling.

Verification: RAW/source review for Hunter's Mark finding Advantage, Favored
Enemy spell access, Ability Check/Skill vocabulary, and
`UBIQUITOUS_LANGUAGE.md`; package-local Quint updates before runtime
divergence if the authoritative model owns ability-check roll modes; focused
runtime tests for Perception/Survival Advantage, nonmatching skills, non-owner
checks, mark transfer/removal cleanup, and Favored Enemy free-cast ownership;
`pnpm unit-profile-coverage:check --write` if evidence changes; `pnpm quality`;
`/simplify` convergence, minimum two rounds unless the final changeset is
trivial. MBT only if runtime roll-mode sequencing changes require it.

### Task 326 - SRDINV87D - Promote Sleep Non-Sleeper Auto-Success Runtime

Status: `ready-for-implementation-after-light-research`

Depends on: SRDINV86

Blocks: SRDINV87E

Research / plan:
[Sleep](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-S-Z.md),
[SRDINV38 research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV38_SLEEP_SAVE_LOOP_RESEARCH.md),
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: promote an executable non-sleeper fact for Sleep so targets that do not
sleep automatically succeed on Sleep saves, alongside the existing
Exhaustion-immunity automatic-success path. Prefer a typed caller-supplied or
Stat Block-derived sleep-eligibility fact that narrows before the save-hole
workflow, so non-sleepers do not receive unnecessary Wisdom save holes.

Out of scope: broad creature biology modeling, monster catalog inference beyond
facts already present or explicitly supplied, Unconscious lifecycle changes,
damage cleanup changes, shake-awake changes, and social/exploration sleep
semantics.

Verification: RAW/source review for Sleep automatic success, Unconscious,
Incapacitated, and `UBIQUITOUS_LANGUAGE.md`; package-local Quint updates before
runtime divergence; focused runtime tests for non-sleeper automatic success,
normal target save holes, Exhaustion-immunity behavior preservation, repeat
save lifecycle preservation, and cleanup behavior; `pnpm
unit-profile-coverage:check --write` if evidence changes; `pnpm quality`;
`/simplify` convergence, minimum two rounds unless the final changeset is
trivial. MBT only if Sleep sequencing changes require it.

### Task 327 - SRDINV87E - Recursive Level-1 Battle Coverage Planning Review

Status: `ready-for-research`

Depends on: SRDINV87A, SRDINV87B, SRDINV87C, SRDINV87D

Blocks: next concrete batch unless accepted battle coverage is 100%

Research / plan:
[SRDINV86 review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV86_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md),
[ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: recompute the user's default acceptance metric: level-1 character
creation content loads, all battle-related level-1 units are available on
eligible characters, and units with battle effects are usable through the
promoted battle-runtime path unless the unit has no battle effect and is
therefore useful by catalog admission alone. Compare that metric to the
generated Unit runtime metrics, the SRD inventory rows, the supported
executable Unit set, and the battle-runtime acceptance surface. Append the
next concrete runnable batch unless the metric is genuinely 100% or every
remaining row is explicitly owner-accepted as non-battle/non-runtime.

Out of scope: treating ACTIVE_PLAN exhaustion, a closed lane, or supported
profile coverage as product completion. If the acceptance metric is not 100%,
this task must either append runnable implementation tasks or leave itself
blocked with a precise reason.

Verification: RAW/source review for any newly selected rule slices and
`UBIQUITOUS_LANGUAGE.md`; active-plan consistency across Ralph index, DAG
table, and task details; `pnpm unit-profile-coverage:check --write` if matrix
artifacts change; a short review note that reports the product acceptance
percentage separately from supported-profile runtime percentage; `/simplify`
convergence, minimum two rounds unless the final changeset is trivial.
