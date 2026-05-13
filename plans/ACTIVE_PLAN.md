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
      "status": "ready-for-implementation-after-light-research",
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
      "status": "ready-for-implementation-after-light-research",
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
      "status": "ready-for-implementation-after-light-research",
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
      "status": "ready-for-research",
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
      "status": "ready-for-implementation-after-light-research",
      "title": "Promote Ranger Favored Enemy Hunter's Mark Free Casts"
    },
    {
      "number": 288,
      "id": "SRDINV78",
      "status": "blocked",
      "title": "Recursive Level-1 Battle Feature Planning Review"
    },
    {
      "number": 289,
      "id": "SRDINV58C",
      "status": "ready-for-implementation-after-light-research",
      "title": "Promote Faerie Fire Object Outline Runtime"
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

| Order | Task                                                                    | Status                                        | Depends on                                                                                                                                                                                                                                    | Blocks                                                                                                                                                                                                                            | Research / plan                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Next action                                                                                                                                                                                                                                                                                                                |
| ----- | ----------------------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 164   | QMBT69 - Recursive Unit Profile Planning Review                         | deferred                                      | completed baseline | none | [QMBT66 review](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT66_RECURSIVE_PLANNING_REVIEW.md), [Unit profile coverage report](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md), [ACTIVE_PLAN](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Still parked by the SRD inventory frontier instruction; completed baseline is complete, but the older QMBT queue remains deferred until that frontier resumes it.                                                                                                                                                          |
| 277   | SRDINV72A - Promote Bardic Inspiration Grant Runtime                    | done                                          | completed baseline | SRDINV72B, SRDINV78 | [Bardic Inspiration](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Bard.md), [Bonus Action](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [D20 Test](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                                                                 | Completed: promoted Bardic Inspiration's Bonus Action grant, target visibility/hearing/range facts, one-die-per-creature invariant, d6 Charisma-derived resource count, and one-hour effect ownership.                                                                                                                     |
| 278   | SRDINV72B - Promote Bardic Inspiration Failed D20 Test Runtime          | done                                          | SRDINV72A | SRDINV78 | [Bardic Inspiration](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Bard.md), [D20 Test](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Attack Roll](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Saving Throw](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Ability Check](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                           | Completed: promoted Bardic Inspiration die use after an already-failed attack roll, Saving Throw, or Ability Check, including roll addition, possible failure-to-success replay, die expenditure, success rejection, and double-spend rejection.                                                                            |
| 279   | SRDINV73A - Promote Monk Martial Arts Attack Projection                 | ready-for-implementation-after-light-research | completed baseline | SRDINV73B, SRDINV78 | [Martial Arts](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Monk.md), [Unarmed Strike](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Weapon Attack](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                                                                | Promote Martial Arts weapon/unarmed eligibility, d6 damage replacement, Dexterity attack/damage option, and Grapple/Shove DC projection without duplicating loadout state.                                                                                                                                                 |
| 280   | SRDINV73B - Promote Monk Martial Arts Bonus Unarmed Strike              | blocked                                       | SRDINV73A | SRDINV78 | [Martial Arts](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Monk.md), [Bonus Action](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Unarmed Strike](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                                                                 | Promote Martial Arts' unconditional Bonus Action Unarmed Strike while unarmored, unshielded, and unarmed or wielding only Monk weapons.                                                                                                                                                                                    |
| 281   | SRDINV74A - Promote Weapon Mastery Sap Runtime                          | ready-for-implementation-after-light-research | completed baseline | SRDINV74B, SRDINV78 | [Sap](/workspace/typescript/dnd/.references/srd-5.2.1/Equipment.md), [Attack Roll](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Weapon Mastery](/workspace/typescript/dnd/.references/srd-5.2.1/Equipment.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                                                                                   | Promote Sap's hit-applied Disadvantage on the target's next attack roll before the attacker's next turn, gated by selected weapon mastery ownership.                                                                                                                                                                       |
| 282   | SRDINV74B - Research Weapon Mastery Cleave and Topple Split             | blocked                                       | SRDINV74A | SRDINV78 | [Cleave and Topple](/workspace/typescript/dnd/.references/srd-5.2.1/Equipment.md), [Prone](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Weapon Mastery](/workspace/typescript/dnd/.references/srd-5.2.1/Equipment.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                                                                           | Split Cleave extra-attack and Topple save-gated Prone into implementable runtime tasks, or document the missing Surface/runtime boundary for the current mastery records.                                                                                                                                                  |
| 283   | SRDINV75A - Promote Sorcerer Innate Sorcery Activation Runtime          | ready-for-implementation-after-light-research | completed baseline | SRDINV75B, SRDINV78 | [Innate Sorcery](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Sorcerer.md), [Bonus Action](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Long Rest](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                                                                | Promote Innate Sorcery activation as a Bonus Action, two-use Long Rest resource, and one-minute active effect without yet wiring spell DC/attack projections.                                                                                                                                                              |
| 284   | SRDINV75B - Promote Innate Sorcery Spell DC and Attack Projection       | blocked                                       | SRDINV75A | SRDINV78 | [Innate Sorcery](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Sorcerer.md), [Spell Attack](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Saving Throw](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                                                             | Promote active Innate Sorcery's +1 Sorcerer spell save DC and Advantage on Sorcerer spell attack rolls through existing spell invocation projection.                                                                                                                                                                       |
| 285   | SRDINV76A - Research Warlock Level-1 Invocation Runtime Boundary        | ready-for-research                            | completed baseline | SRDINV76B, SRDINV78 | [Eldritch Invocations](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Warlock.md), [Pact Magic](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Warlock.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Classify level-1-legal Warlock invocation options into character-creation-only, spell-access, and battle-runtime tasks before promoting any one option as representative support.                                                                                                                                          |
| 286   | SRDINV76B - Promote Pact of the Blade Battle Projection                 | blocked                                       | SRDINV76A | SRDINV78 | [Pact of the Blade](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Warlock.md), [Weapon Attack](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Damage Types](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                                                          | Promote Pact of the Blade's bonded weapon battle projection: Charisma attack/damage option, selectable Necrotic/Psychic/Radiant/normal damage type, proficiency, and focus facts without generic item conjuration simulation.                                                                                              |
| 287   | SRDINV77 - Promote Ranger Favored Enemy Hunter's Mark Free Casts        | ready-for-implementation-after-light-research | completed baseline | SRDINV78 | [Favored Enemy](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Ranger.md), [Hunter's Mark](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [Long Rest](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                                                         | Promote Favored Enemy as always-prepared Hunter's Mark plus two no-slot casts per Long Rest that reuse the existing Hunter's Mark runtime procedure.                                                                                                                                                                       |
| 288   | SRDINV78 - Recursive Level-1 Battle Feature Planning Review             | blocked                                       | SRDINV58C, SRDINV72A, SRDINV72B, SRDINV73A, SRDINV73B, SRDINV74A, SRDINV74B, SRDINV75A, SRDINV75B, SRDINV76A, SRDINV76B, SRDINV77 | none | [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [UNIT_REPORT](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md), [ACTIVE_PLAN](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                                                                                                                                                 | Review the remaining spell/class-feature/weapon-mastery batch, including Faerie Fire object outline and the Starry Wisp object-target Invisible-condition benefit projection gap, refresh level-1 battle-related metrics, and decide whether the next queue is closure, cleanup, or final acceptance evidence.             |
| 289   | SRDINV58C - Promote Faerie Fire Object Outline Runtime                  | ready-for-implementation-after-light-research | completed baseline | SRDINV78 | [SRDINV58B research](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV58B_FAERIE_FIRE_OBJECT_LIGHT_BOUNDARY_RESEARCH.md), [Faerie Fire](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md), [Object](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [Target](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)                                                                                                                                                                                                                                                                                | Promote object outline attack Advantage and object Invisible-benefit denial through caller-supplied object ids and object sight facts, without object inventory or area-geometry derivation.                                                                                                                               |

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

Status: `ready-for-implementation-after-light-research`

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

Status: `ready-for-implementation-after-light-research`

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

Status: `ready-for-implementation-after-light-research`

Depends on: completed baseline

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

Status: `ready-for-research`

Depends on: completed baseline

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

Status: `ready-for-implementation-after-light-research`

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

Status: `blocked`

Depends on: SRDINV58C, SRDINV72A, SRDINV72B, SRDINV73A, SRDINV73B, SRDINV74A, SRDINV74B, SRDINV75A, SRDINV75B, SRDINV76A, SRDINV76B, SRDINV77

Blocks: none

Research / plan:
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md),
[ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: review SRDINV58C, SRDINV59A, SRDINV59B, SRDINV67, SRDINV68A, SRDINV68B,
SRDINV69A, SRDINV69B, SRDINV70A, SRDINV70B, SRDINV71, SRDINV72A, SRDINV72B,
SRDINV73A, SRDINV73B, SRDINV74A, SRDINV74B, SRDINV75A, SRDINV75B, SRDINV76A,
SRDINV76B, SRDINV77, refresh level-1 battle-related feature/spell metrics,
explicitly account for the remaining Starry Wisp object-target
Invisible-condition benefit projection gap, calculate the remaining acceptance
gap for "all battle-related level-1 features, including spells, can be used in
battle," and decide whether the next queue is final closure, cleanup, or another
concrete implementation batch.

Out of scope: claiming 100% support from catalog/profile admission alone and
recursively inventing tasks before the implemented batch has been reviewed.

Verification: RAW/source review for any newly appended slices plus
`UBIQUITOUS_LANGUAGE.md`; active-plan consistency across Ralph index, DAG table,
and task details; regenerate inventory with `pnpm
unit-profile-coverage:check --write` when evidence or inventory artifacts
change; explicitly list remaining unsupported/profile-subset-supported
battle-related level-1 rows with reason and owner; `/simplify` convergence,
minimum two rounds unless the final changeset is trivial.

### Task 289 - SRDINV58C - Promote Faerie Fire Object Outline Runtime

Status: `ready-for-implementation-after-light-research`

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
