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
      "status": "ready-for-research",
      "title": "Project Monk Deflect Attacks Redirect Facts"
    },
    {
      "number": 164,
      "id": "QMBT69",
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
| 160   | QMBT65 - Promote Cutting Words Ability Check Reaction Reduction | done | none | QMBT66 | [Unit profile coverage report](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md), [SRD Bard](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Bard.md), [SRD Playing the Game](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md), [SRD Rules Glossary](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Completed `bard_cutting_words` Ability Check reduction as part of `unit-feature.reaction-roll-or-damage-reduction`, with authored mechanics admission, caller-supplied already-successful Ability Check facts, Reaction and Bardic Inspiration spend, QNT proof coverage, focused runtime parity, deterministic admission evidence, and refreshed matrix artifacts. |
| 161   | QMBT66 - Recursive Unit Profile Planning Review | done | QMBT65 | QMBT67 | [QMBT66 review](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT66_RECURSIVE_PLANNING_REVIEW.md), [Unit profile coverage report](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md), [ACTIVE_PLAN](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md) | Completed recursive planning review, kept the matrix lane open, refreshed PRD status, and appended the QMBT67-QMBT69 projection-cleanup batch. |
| 162   | QMBT67 - Project Bardic Inspiration Reaction Reduction Facts | done | QMBT66 | QMBT68 | [QMBT66 review](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT66_RECURSIVE_PLANNING_REVIEW.md), [Surface README](/workspace/typescript/dnd/packages/surface/README.md), [battle reducer](/workspace/typescript/dnd/packages/battle-runtime/src/battle-reducer.ts), [unit feature support](/workspace/typescript/dnd/packages/battle-runtime/src/unit-feature-support.ts), [SRD Bard](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Bard.md), [SRD Playing the Game](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md), [SRD Rules Glossary](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Move Bardic Inspiration reaction-reduction resource cost and die expression facts into supported profile projection data so generic reaction reducers no longer derive Bard class die thresholds for Cutting Words attack-roll, Ability Check, or damage-roll reduction. |
| 163   | QMBT68 - Project Monk Deflect Attacks Redirect Facts | ready-for-research | QMBT67 | QMBT69 | [QMBT66 review](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT66_RECURSIVE_PLANNING_REVIEW.md), [Surface README](/workspace/typescript/dnd/packages/surface/README.md), [battle reducer](/workspace/typescript/dnd/packages/battle-runtime/src/battle-reducer.ts), [unit feature support](/workspace/typescript/dnd/packages/battle-runtime/src/unit-feature-support.ts), [SRD Monk](/workspace/typescript/dnd/.references/srd-5.2.1/Classes/Monk.md), [SRD Playing the Game](/workspace/typescript/dnd/.references/srd-5.2.1/Playing-the-Game.md), [SRD Rules Glossary](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md), [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md) | Move Deflect Attacks redirect resource cost, save DC, redirect damage dice, damage ability modifier, and inherited damage-type facts into supported profile projection data so generic reducers no longer derive Focus Point, Martial Arts die, or Monk Focus save formulas. |
| 164   | QMBT69 - Recursive Unit Profile Planning Review | blocked | QMBT68 | none | [QMBT66 review](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT66_RECURSIVE_PLANNING_REVIEW.md), [Unit profile coverage report](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md), [ACTIVE_PLAN](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md) | Review QMBT67-QMBT68 findings, update PRD and plan docs, and append the next coherent widening or cleanup batch unless the Unit profile matrix lane is explicitly complete. |

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

Status: `ready-for-research`

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

Scope: move Deflect Attacks redirect executable facts out of generic reducer
derivation and into supported profile projection data. The runtime should
parse/project redirect resource cost, redirect save DC, redirect damage dice
expression, damage ability modifier, attack-kind target gate facts, and
inherited original damage type for the existing
`unit-feature.attack-damage-reduction-zero-damage-redirect` profile. Reducers
should consume those projected facts without deriving Focus Point cost, Martial
Arts die scaling, or Monk Focus save DC from class identity.

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

### Task 164 - QMBT69 - Recursive Unit Profile Planning Review

Status: `blocked`

Depends on: QMBT68

Blocks: none

Research / plan:
[QMBT66_RECURSIVE_PLANNING_REVIEW.md](/workspace/typescript/dnd/plans/unit-profile-coverage/QMBT66_RECURSIVE_PLANNING_REVIEW.md),
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md),
[ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md)

Scope: review QMBT67-QMBT68 findings, update the PRD and plan docs, and append
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
