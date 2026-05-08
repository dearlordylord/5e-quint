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
      "status": "ready-for-research",
      "title": "Create Character-Creation Owner Evidence Manifest"
    },
    {
      "number": 168,
      "id": "SRDINV2",
      "status": "ready-for-research",
      "title": "Author Missing Level-1 Class Containers"
    },
    {
      "number": 169,
      "id": "SRDINV3",
      "status": "ready-for-research",
      "title": "Classify Missing Level-1 Class Feature Rows"
    },
    {
      "number": 170,
      "id": "SRDINV4",
      "status": "blocked",
      "title": "Classify Level-1 Character Creation Rows"
    },
    {
      "number": 171,
      "id": "SRDINV5A",
      "status": "ready-for-research",
      "title": "Classify Level-1 Spell Access Rows"
    },
    {
      "number": 172,
      "id": "SRDINV5B",
      "status": "ready-for-research",
      "title": "Classify Missing Cantrip and Level-1 Spell Units"
    },
    {
      "number": 173,
      "id": "SRDINV5C",
      "status": "ready-for-research",
      "title": "Classify Installed Cantrip and Level-1 Spell Units"
    },
    {
      "number": 174,
      "id": "SRDINV5D",
      "status": "ready-for-research",
      "title": "Review Catalog-Only Cantrip and Level-1 Spell Units"
    },
    {
      "number": 175,
      "id": "SRDINV6",
      "status": "ready-for-research",
      "title": "Review Catalog-Only and Surface-Widening Rows"
    },
    {
      "number": 176,
      "id": "SRDINV7",
      "status": "blocked",
      "title": "Recursive SRD Inventory Planning Review"
    },
    {
      "number": 177,
      "id": "SRDINV8",
      "status": "blocked",
      "title": "Surface Widening Gate for SRD Level-1 Frontier"
    },
    {
      "number": 178,
      "id": "SRDINV9",
      "status": "blocked",
      "title": "Author Expressible SRD Level-1 Surface Records"
    },
    {
      "number": 179,
      "id": "SRDINV10",
      "status": "blocked",
      "title": "Plan SRD Level-1 Runtime and MBT Support"
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
| 167   | SRDINV1B - Create Character-Creation Owner Evidence Manifest | ready-for-research | SRDINV1A | SRDINV4 | [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [SRD inventory Ralph batch plan](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md), [character-creation-runtime tests](/workspace/typescript/dnd/packages/character-creation-runtime/src/index.test.ts), [character-creation-runtime README](/workspace/typescript/dnd/packages/character-creation-runtime/README.md) | Create a checker-readable character-creation owner-evidence manifest, wire it into the SRD inventory generator, and reclassify only rows covered by durable row-level evidence. |
| 168   | SRDINV2 - Author Missing Level-1 Class Containers | ready-for-research | SRDINV1A | SRDINV7 | [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [SRD inventory Ralph batch plan](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md) | Create or explicitly close the ten missing SRD level-1 class container records. |
| 169   | SRDINV3 - Classify Missing Level-1 Class Feature Rows | ready-for-research | SRDINV1A | SRDINV7 | [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [SRD inventory Ralph batch plan](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md) | Decide which missing level-1 class feature rows need authored content, Surface widening, non-runtime closure, or later runtime work. |
| 170   | SRDINV4 - Classify Level-1 Character Creation Rows | blocked | SRDINV1A, SRDINV1B | SRDINV7 | [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [SRD inventory Ralph batch plan](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md) | Separate class-container-owned creation/progression facts from rows that require standalone authored records. |
| 171   | SRDINV5A - Classify Level-1 Spell Access Rows | ready-for-research | SRDINV1A | SRDINV7 | [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [SRD inventory Ralph batch plan](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md) | Classify class Spellcasting/access rows separately from individual Spell Unit pressure. |
| 172   | SRDINV5B - Classify Missing Cantrip and Level-1 Spell Units | ready-for-research | SRDINV1A | SRDINV7 | [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [SRD inventory Ralph batch plan](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md) | Group missing cantrip and level-1 Spell Unit rows by authoring readiness, Surface blockers, and runtime-support pressure. |
| 173   | SRDINV5C - Classify Installed Cantrip and Level-1 Spell Units | ready-for-research | SRDINV1A | SRDINV7 | [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [SRD inventory Ralph batch plan](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md) | Distinguish catalog evidence from operational owner evidence for installed cantrip and level-1 Spell Unit rows. |
| 174   | SRDINV5D - Review Catalog-Only Cantrip and Level-1 Spell Units | ready-for-research | SRDINV1A | SRDINV7 | [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [SRD inventory Ralph batch plan](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md) | Keep catalog-only spell pressure explicit and counted, or promote concrete follow-up batches. |
| 175   | SRDINV6 - Review Catalog-Only and Surface-Widening Rows | ready-for-research | SRDINV1A | SRDINV7 | [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [SRD inventory Ralph batch plan](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md) | Preserve nonspell catalog-only/dead-for-now rows and name missing Surface constructs for any widening blockers. |
| 176   | SRDINV7 - Recursive SRD Inventory Planning Review | blocked | SRDINV2-SRDINV5D, SRDINV6 | SRDINV8 | [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [SRD inventory Ralph batch plan](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md), [ACTIVE_PLAN](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md) | Review SRDINV1A-SRDINV6 findings and append a concrete multi-task next batch, or explicitly close level-1 with final metrics. |
| 177   | SRDINV8 - Surface Widening Gate for SRD Level-1 Frontier | blocked | SRDINV7 | SRDINV9-SRDINV10 | [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [SRD inventory Ralph batch plan](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md), [Surface README](/workspace/typescript/dnd/packages/surface/README.md), [ACTIVE_PLAN](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md) | If Surface cannot express important frontier rows, append atomic Surface-widening tasks and then append this gate again; otherwise mark Surface ready for authoring. |
| 178   | SRDINV9 - Author Expressible SRD Level-1 Surface Records | blocked | SRDINV8 | SRDINV10 | [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [Surface README](/workspace/typescript/dnd/packages/surface/README.md), [SRD Classes](/workspace/typescript/dnd/.references/srd-5.2.1/Classes) | Author SRD-provenance Surface records for the expressible frontier, then run the Surface gate again if authoring exposes missing Surface constructs. |
| 179   | SRDINV10 - Plan SRD Level-1 Runtime and MBT Support | blocked | SRDINV9 | none | [Unit profile coverage report](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md), [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md), [battle-runtime README](/workspace/typescript/dnd/packages/battle-runtime/README.md), [rule-core README](/workspace/typescript/dnd/packages/shared-algebras/proofs/rule-core/README.md) | Append behavior-support tasks for authored executable rows: QNT/MBT procedure parity where needed, runtime implementation, deterministic admission/projection evidence, and selected identity MBT only for high-risk Units. |

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

Status: `ready-for-research`

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

### Task 168 - SRDINV2 - Author Missing Level-1 Class Containers

Status: `ready-for-research`

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

### Task 169 - SRDINV3 - Classify Missing Level-1 Class Feature Rows

Status: `ready-for-research`

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

Verification: SRD source review for classified features; `UBIQUITOUS_LANGUAGE.md`;
regenerate inventory; `pnpm unit-profile-coverage:check`; `/simplify`
convergence.

### Task 170 - SRDINV4 - Classify Level-1 Character Creation Rows

Status: `blocked`

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

### Task 171 - SRDINV5A - Classify Level-1 Spell Access Rows

Status: `ready-for-research`

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

### Task 172 - SRDINV5B - Classify Missing Cantrip and Level-1 Spell Units

Status: `ready-for-research`

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

### Task 173 - SRDINV5C - Classify Installed Cantrip and Level-1 Spell Units

Status: `ready-for-research`

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

### Task 174 - SRDINV5D - Review Catalog-Only Cantrip and Level-1 Spell Units

Status: `ready-for-research`

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

### Task 175 - SRDINV6 - Review Catalog-Only and Surface-Widening Rows

Status: `ready-for-research`

Depends on: SRDINV1A

Blocks: SRDINV7

Research / plan:
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[SRDINV_RALPH_BATCH_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md)

Scope: review nonspell rows marked catalog-only/dead-for-now and
needs-surface-widening. Keep dead/catalog-only rows when appropriate, but make
that closure explicit and counted. For Surface blockers, ensure the missing
Surface construct is named.

Out of scope: requiring all catalog rows to have production consumers,
implementing runtime behavior, PHB/XPHB content, and broad Surface redesign
not backed by a named blocker.

Verification: SRD source review for rows changed; regenerate inventory; `pnpm
unit-profile-coverage:check`; `/simplify` convergence.

### Task 176 - SRDINV7 - Recursive SRD Inventory Planning Review

Status: `blocked`

Depends on: SRDINV2-SRDINV5D, SRDINV6

Blocks: SRDINV8

Research / plan:
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

### Task 177 - SRDINV8 - Surface Widening Gate for SRD Level-1 Frontier

Status: `blocked`

Depends on: SRDINV7

Blocks: SRDINV9-SRDINV10

Research / plan:
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[SRDINV_RALPH_BATCH_PLAN.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV_RALPH_BATCH_PLAN.md),
[Surface README](/workspace/typescript/dnd/packages/surface/README.md),
[ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md)

Scope: inspect the classified SRD level-1 frontier and decide whether Surface
can express every important row selected for the next authoring batch. If not,
append atomic Surface-widening tasks to the end of `ACTIVE_PLAN.md`, followed
by a fresh copy of this gate task so the frontier is checked again after those
widening tasks land. If Surface can express the selected frontier, mark this
gate done and unblock authoring.

Out of scope: authoring SRD records, implementing runtime behavior, adding
parallel runtime-only data to work around Surface, PHB/XPHB content, and
closing important rows without a named reason.

Verification: every important `needs-surface-widening` or insufficient-Surface
row has either an appended atomic Surface-widening task or an explicit
deferred/closure rationale; active-plan consistency across Ralph index, DAG
table, and task details; `pnpm unit-profile-coverage:check`; `/simplify`
convergence.

### Task 178 - SRDINV9 - Author Expressible SRD Level-1 Surface Records

Status: `blocked`

Depends on: SRDINV8

Blocks: SRDINV10

Research / plan:
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[Surface README](/workspace/typescript/dnd/packages/surface/README.md),
[Classes](/workspace/typescript/dnd/.references/srd-5.2.1/Classes),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: author SRD-provenance Surface records for the expressible SRD level-1
frontier selected by SRDINV8. Preserve SRD provenance and make invalid
source/provenance states unrepresentable at the collection boundary. If
authoring exposes additional Surface expressivity gaps, stop broad authoring,
append this task's discovered rows back through SRDINV8, and keep the loop
measurable.

Out of scope: PHB/XPHB content, private-source identity, runtime support,
QNT/QMBT work, selected identity MBT, and authoring rows that SRDINV8 has not
declared expressible.

Verification: read local SRD source for every authored record; check
`UBIQUITOUS_LANGUAGE.md`; catalog/admission checks for authored records;
regenerate SRD inventory; `pnpm unit-profile-coverage:check`; run the
smallest relevant package tests for touched Surface code; `/simplify`
convergence.

### Task 179 - SRDINV10 - Plan SRD Level-1 Runtime and MBT Support

Status: `blocked`

Depends on: SRDINV9

Blocks: none

Research / plan:
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[battle-runtime README](/workspace/typescript/dnd/packages/battle-runtime/README.md),
[rule-core README](/workspace/typescript/dnd/packages/shared-algebras/proofs/rule-core/README.md),
[ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md)

Scope: inspect authored SRD level-1 rows that imply executable behavior and
append the next behavior-support task batch. For behavior shapes not already
covered, plan QNT/MBT procedure parity first, then runtime implementation
against that model. For concrete authored Unit ids, plan deterministic
admission/projection evidence. Add selected identity MBT only for
representative or high-risk Units; do not enumerate all Units in QNT.

Out of scope: implementing the appended behavior tasks in this planning task,
PHB/XPHB pressure, broad runtime rewrites, and treating catalog admission alone
as behavior support.

Verification: active-plan consistency across Ralph index, DAG table, and task
details; appended tasks are atomic enough to execute independently; every
runtime-support task names its QNT/MBT/procedure-parity expectation or explains
why an existing profile already covers it; `pnpm unit-profile-coverage:check`;
`/simplify` convergence.
