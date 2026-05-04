# Active Plan

Date: 2026-05-04

This is the single active planning queue. Historical CAM/POST/BA/PBA closeouts
were archived to
[ACTIVE_PLAN_ARCHIVE_2026-05-04.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN_ARCHIVE_2026-05-04.md).

Current authority summary:

- `@dnd/battle-runtime` plus `packages/battle-runtime/battle-runtime.qnt` is the
  promoted battle authority for new Unit/StatBlock-backed behavior.
- Root `battle.qnt` and old Core battle code are legacy proof/restore source
  material only.
- Broad widening proceeds through the current PBA queue below, using Surface
  support profiles and package-owned runtime procedures rather than authored-id
  dispatch or projected-executable vocabulary.

Primary context links:

- [CORRECTION_APPLICATION_MIGRATION_PLAN.md](/workspace/typescript/dnd/plans/CORRECTION_APPLICATION_MIGRATION_PLAN.md)
- [ARCHITECTURE.md](/workspace/typescript/dnd/ARCHITECTURE.md)
- [packages/battle-runtime/README.md](/workspace/typescript/dnd/packages/battle-runtime/README.md)
- [packages/battle-runtime/ARCHITECTURE_GRAPH.md](/workspace/typescript/dnd/packages/battle-runtime/ARCHITECTURE_GRAPH.md)
- [packages/character-creation-runtime/README.md](/workspace/typescript/dnd/packages/character-creation-runtime/README.md)
- [packages/character-creation-runtime/VOCABULARY.md](/workspace/typescript/dnd/packages/character-creation-runtime/VOCABULARY.md)

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
      "number": 61,
      "id": "PBA15A0A",
      "status": "done",
      "title": "Promote Multiclass Prerequisite Algebra"
    },
    {
      "number": 62,
      "id": "PBA15A0B",
      "status": "done",
      "title": "Introduce Character Progression Projection Helpers"
    },
    {
      "number": 63,
      "id": "PBA15A0C",
      "status": "ready-for-implementation-after-light-research",
      "title": "Replace Level-One Advancement Workflow"
    },
    {
      "number": 64,
      "id": "PBA15A0D",
      "status": "blocked",
      "title": "Wire Progression And Multiclass Through MCP Docs"
    },
    {
      "number": 65,
      "id": "PBA15A",
      "status": "blocked",
      "title": "Migrate Surface And Character-Creation Domain Primitives"
    },
    {
      "number": 66,
      "id": "PBA16",
      "status": "blocked",
      "title": "Add Death-Save Promoted MBT Coverage"
    },
    {
      "number": 67,
      "id": "PBA17",
      "status": "blocked",
      "title": "Restore Nonlethal Knockout And Zero-HP Handoff Width"
    },
    {
      "number": 68,
      "id": "PBA18",
      "status": "blocked",
      "title": "Widen Attack Range And Conditional Attack Riders"
    },
    {
      "number": 69,
      "id": "PBA19",
      "status": "blocked",
      "title": "Restore Stat Block Multiattack And Bonus Actions"
    },
    {
      "number": 70,
      "id": "PBA20",
      "status": "blocked",
      "title": "Restore Spell Targeting And Catalog Width"
    },
    {
      "number": 71,
      "id": "PBA21",
      "status": "blocked",
      "title": "Broaden Reaction Windows And Bonus-Action Subjects"
    },
    {
      "number": 72,
      "id": "PBA22",
      "status": "blocked",
      "title": "Stabilize Battle Snapshots Traces And App UI"
    },
    {
      "number": 73,
      "id": "PBA23",
      "status": "blocked",
      "title": "Core Promotion Deletion Ledger"
    },
    {
      "number": 74,
      "id": "PBA24",
      "status": "blocked",
      "title": "Remove Rogue Cunning Action Support Workaround"
    },
    {
      "number": 75,
      "id": "PBA25",
      "status": "blocked",
      "title": "Promote Unit-Backed Character Choice Width"
    },
    {
      "number": 76,
      "id": "PBA26",
      "status": "blocked",
      "title": "Define Character Sheet Session Boundary And Migrate App"
    },
    {
      "number": 77,
      "id": "PBA27",
      "status": "blocked",
      "title": "Core Quarantine And Deletion Cutover"
    },
    {
      "number": 78,
      "id": "PBA28",
      "status": "blocked",
      "title": "MBT Consolidation And Shared Algebra Parity"
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
- Character-creation behavior changes must update
  `packages/character-creation-runtime/README.md` and
  `packages/character-creation-runtime/VOCABULARY.md` when architecture or
  vocabulary changes.
- Shared algebra changes must update
  `packages/shared-algebras/README.md` or relevant package-local proof docs.
- Optional fields and empty collections must represent distinct domain states.
  Do not use `undefined` as a second spelling for an empty list. If a type can
  represent unknown, omitted, and empty, document the domain meaning of each or
  redesign the type so the invalid distinction is unrepresentable.
- Avoid contrast names such as `normalized`, `legacy`, `current`, or `new`
  unless the repo owns the opposite concept at the same boundary and the term is
  domain-backed. Prefer names for the rule/domain object being modeled.
- Recent modeling correction: `normalized-algebra` and
  `LegacyAdvancementProgressionInput` were rejected because they named migration
  mechanics rather than durable domain concepts. The corrected names are
  `character-progression-algebra` and `AdvancementSelectionProgressionInput`.
  Promoted packages may expose compatibility projections, but the public names
  must describe the source shape or domain object, not the package's migration
  history.
- Do not run battle MBT for research-only tasks. Use the smallest MBT tier that
  actually validates a completed behavior change.
- Implementation closeout must include `/simplify` convergence: minimum two
  rounds unless the changeset is trivial.

## DAG / Queue Order

| Order | Task | Status | Depends on | Blocks | Research / plan | Next action |
| ----- | ---- | ------ | ---------- | ------ | --------------- | ----------- |
| 61 | PBA15A0A - Promote Multiclass Prerequisite Algebra | done | PBA15 | PBA15A0B | inline below | Shared algebra owns multiclass prerequisite facts; Core delegates through compatibility wrappers. |
| 62 | PBA15A0B - Introduce Character Progression Projection Helpers | done | PBA15A0A | PBA15A0C | inline below | Character-creation-runtime exports character progression helpers and Unit-id boundary adapters. |
| 63 | PBA15A0C - Replace Level-One Advancement Workflow | ready-for-implementation-after-light-research | PBA15A0B | PBA15A0D | inline below | Replace runtime discovery/fill/finalization paths that expose a separate level-1 advancement choice. |
| 64 | PBA15A0D - Wire Progression And Multiclass Through MCP Docs | blocked | PBA15A0C | PBA15A | inline below | Wire the character progression model and prerequisite checks through MCP schemas/tests and package docs. |
| 65 | PBA15A - Migrate Surface And Character-Creation Domain Primitives | blocked | PBA15A0D | PBA16 | [research plan](/workspace/typescript/dnd/plans/pba15a-domain-primitives-research-plan.md) | Migrate remaining durable Surface and character-creation primitive domain values after PBA15A0D. |
| 66 | PBA16 - Add Death-Save Promoted MBT Coverage | blocked | PBA15A | PBA17 | [research plan](/workspace/typescript/dnd/plans/pba16-death-save-promoted-mbt-research-plan.md) | Add narrow promoted battle-runtime MBT/QNT coverage for Death Saving Throw holes. |
| 67 | PBA17 - Restore Nonlethal Knockout And Zero-HP Handoff Width | blocked | PBA16 | PBA18 | [research plan](/workspace/typescript/dnd/plans/pba17-knockout-zero-hp-handoff-research-plan.md) | Restore Knock Out and remaining durable zero-HP/dead/Stable/rest handoff width. |
| 68 | PBA18 - Widen Attack Range And Conditional Attack Riders | blocked | PBA17 | PBA19 | [research plan](/workspace/typescript/dnd/plans/pba18-attack-range-riders-research-plan.md) | Restore long-range Disadvantage and supported conditional attack riders. |
| 69 | PBA19 - Restore Stat Block Multiattack And Bonus Actions | blocked | PBA18 | PBA20 | [research plan](/workspace/typescript/dnd/plans/pba19-stat-block-multiattack-bonus-actions-research-plan.md) | Restore Stat Block Multiattack and Bonus Action procedure families. |
| 70 | PBA20 - Restore Spell Targeting And Catalog Width | blocked | PBA19 | PBA21 | [research plan](/workspace/typescript/dnd/plans/pba20-spell-targeting-catalog-width-research-plan.md) | Restore Magic Missile split-target replay and broaden spell procedure pressure. |
| 71 | PBA21 - Broaden Reaction Windows And Bonus-Action Subjects | blocked | PBA20 | PBA22 | [research plan](/workspace/typescript/dnd/plans/pba21-reaction-bonus-action-width-research-plan.md) | Broaden reaction windows and Bonus Action subjects after spell targeting width. |
| 72 | PBA22 - Stabilize Battle Snapshots Traces And App UI | blocked | PBA21 | PBA23 | [research plan](/workspace/typescript/dnd/plans/pba22-snapshots-traces-app-ui-research-plan.md) | Restore promoted snapshot/trace contracts and app battle UI workflows. |
| 73 | PBA23 - Core Promotion Deletion Ledger | blocked | PBA22 | PBA25 | [research plan](/workspace/typescript/dnd/plans/pba23-core-promotion-deletion-ledger.md) | Inventory every remaining Core consumer, proof artifact, and restore-source lane before any Core deletion work. |
| 74 | PBA24 - Remove Rogue Cunning Action Support Workaround | blocked | PBA25 | PBA27 | [research plan](/workspace/typescript/dnd/plans/pba24-remove-rogue-cunning-action-workaround.md) | Replace MCP's Rogue class-name support-profile inference with real Surface Unit and support-profile flow. |
| 75 | PBA25 - Promote Unit-Backed Character Choice Width | blocked | PBA23 | PBA24, PBA26 | [research plan](/workspace/typescript/dnd/plans/pba25-unit-backed-character-choice-width.md) | Move remaining Core direct character-choice width into Surface Unit readers and character-creation runtime holes/projections. |
| 76 | PBA26 - Define Character Sheet Session Boundary And Migrate App | blocked | PBA25 | PBA27 | [research plan](/workspace/typescript/dnd/plans/pba26-character-sheet-session-app-migration.md) | Decide the promoted Character Sheet/session read model and move app character workflows off Core APIs. |
| 77 | PBA27 - Core Quarantine And Deletion Cutover | blocked | PBA24, PBA26 | PBA28 | [research plan](/workspace/typescript/dnd/plans/pba27-core-quarantine-deletion-cutover.md) | Remove or quarantine Core only after the deletion ledger has no production blockers and promoted gates own replacement behavior. |
| 78 | PBA28 - MBT Consolidation And Shared Algebra Parity | blocked | PBA27 | future tasks | [research plan](/workspace/typescript/dnd/plans/pba28-mbt-consolidation-shared-algebra-parity.md) | Consolidate the post-Core proof graph around package-local shared algebra MBT/proofs and selective promoted runtime MBT. |

## Task Details

### Task 61 - PBA15A0A - Promote Multiclass Prerequisite Algebra

Status: `done`

Depends on: PBA15
Blocks: PBA15A0B

Next action: finish the shared multiclass prerequisite algebra extraction and
Core compatibility wrappers only. Do not change character-creation workflow,
MCP schemas, or docs except package-local shared-algebras README/proof notes if
needed.

Context:

- In-progress handoff files exist:
  - `packages/shared-algebras/src/multiclass-prerequisite-algebra.ts`
  - `packages/shared-algebras/src/multiclass-prerequisite-algebra.test.ts`
  - `packages/shared-algebras/proofs/multiclass-prerequisite-algebra.qnt`
  - `packages/core/src/features/class-tables.ts`
- Keep the algebra Surface-free: it should speak in class names and ability
  prerequisite facts, not Surface Unit ids such as `class_fighter`.
- Core may retain compatibility wrappers, but must not own a duplicate
  prerequisite table.

Acceptance:

- `@dnd/shared-algebras/multiclass-prerequisite-algebra` owns the canonical
  multiclass prerequisite table and exported check helpers.
- Tests cover passing and failing multiclass prerequisites for representative
  classes and ability-score combinations.
- The small Quint proof has deterministic `mc_` assertions for the same
  canonical algebra facts.
- Core class-table code either re-exports/adapts the shared algebra or clearly
  delegates to it without duplicating the table.
- No character-creation-runtime workflow or MCP schema changes are made in this
  slice.

Verification:

- RAW/UL check for multiclass prerequisite wording in
  `.references/srd-5.2.1/Classes/` and `UBIQUITOUS_LANGUAGE.md`.
- `pnpm --filter @dnd/shared-algebras typecheck`
- `pnpm --filter @dnd/shared-algebras test`
- `pnpm exec quint test --match "mc_" packages/shared-algebras/proofs/multiclass-prerequisite-algebra.qnt`
- Focused Core tests only if Core wrappers are touched.
- No battle MBT.
- `/simplify` convergence, minimum two rounds.

Plan Impact: if successful, unblock PBA15A0B.

Closeout: shared-algebras owns the canonical multiclass prerequisite table and
checks, with focused TS tests and `mc_` Quint assertions passing. Core
class-table compatibility wrappers delegate to shared-algebras.

### Task 62 - PBA15A0B - Introduce Character Progression Projection Helpers

Status: `done`

Depends on: PBA15A0A
Blocks: PBA15A0C

Next action: add the canonical character progression model and derivation
helpers in `@dnd/character-creation-runtime` without yet replacing every
workflow caller.

Context:

- Current character-creation state duplicates starting class as
  `selections.primaryClass` and
  `selections.advancement.entries[0].classUnitId`.
- Advancement entries also store `level`, even though level is derivable from
  ordered progression.
- Target shape: `startingClass` plus post-start `advancements`; level 1 is
  implicit from `startingClass`; total level is `1 + advancements.length`;
  per-class levels derive by counting starting and later classes.
- `packages/character-creation-runtime/src/character-progression-algebra.ts` is the
  handoff file for this slice.

Acceptance:

- Character-creation-runtime exports a precise `CharacterProgression` model
  or equivalent parsed type with `startingClass` and post-start
  `advancements` only.
- Runtime helpers derive total level, advancement level by position, and
  per-class level summaries from the progression model.
- Unit-id inputs such as `class_fighter` are converted through one explicit
  boundary adapter; Surface Unit ids are not stored in the core progression
  algebra.
- Focused tests prove a level-1 Fighter, Fighter 2, and Fighter/Wizard
  progression derive expected totals/class levels without storing contradictory
  advancement levels.
- Existing public workflow behavior is not broadly rewired in this slice; keep
  compatibility projections where needed.

Verification:

- RAW/UL check for class creation and level advancement wording.
- `pnpm --filter @dnd/character-creation-runtime typecheck`
- `pnpm --filter @dnd/character-creation-runtime test`
- No battle MBT.
- `/simplify` convergence, minimum two rounds.

Plan Impact: if successful, unblock PBA15A0C.

Closeout: `@dnd/character-creation-runtime` exports
`CharacterProgression` helpers with `startingClass` plus post-start class-name
advancements, derived total/per-class/advancement levels, explicit Surface class
Unit-id adapters, focused tests, and package README/VOCABULARY notes.

### Task 63 - PBA15A0C - Replace Level-One Advancement Workflow

Status: `ready-for-implementation-after-light-research`

Depends on: PBA15A0B
Blocks: PBA15A0D

Next action: replace character-creation-runtime discovery, fill reduction, and
finalization paths that expose a separate level-1 advancement choice after the
starting class is chosen.

Context:

- The current runtime can represent `primaryClass: Fighter` with first
  advancement `Wizard`, then finalization checks and rejects that mismatch.
- Task PBA15A0B creates the progression helpers that should make this mismatch
  unrepresentable at the promoted runtime boundary.
- Keep supported workflows available: Orc Soldier Fighter 1, Orc Soldier
  Fighter 2, and Orc Soldier Wizard 1.

Acceptance:

- Promoted character creation cannot represent `primaryClass: Fighter` with a
  first advancement for Wizard.
- Promoted character creation cannot represent a post-start advancement with a
  contradictory stored level.
- Character-creation-runtime no longer exposes "choose level 1" as a RAW
  creation step after choosing a starting class.
- Discovery, fill reducer, support gates, finalization, QNT slice/MBT bridge,
  and focused runtime tests use the progression model or derive legacy labels
  only at boundaries.
- Existing supported creation verticals still pass.

Verification:

- RAW/UL check for class creation and level advancement wording.
- `pnpm --filter @dnd/character-creation-runtime typecheck`
- `pnpm --filter @dnd/character-creation-runtime test`
- Focused Core tests only if legacy replay compatibility wrappers are touched.
- No battle MBT unless battle-runtime mappings change.
- `/simplify` convergence, minimum two rounds.

Plan Impact: if successful, unblock PBA15A0D.

### Task 64 - PBA15A0D - Wire Progression And Multiclass Through MCP Docs

Status: `blocked`

Depends on: PBA15A0C
Blocks: PBA15A

Next action: wire the character progression model and shared multiclass
prerequisite checks through MCP schemas/tests and update package docs.

Context:

- PBA15A0A owns canonical multiclass prerequisite checks in
  `@dnd/shared-algebras`.
- PBA15A0B and PBA15A0C normalize character-creation-runtime progression and
  remove the separate level-1 advancement workflow.
- This slice is the integration/docs closeout before PBA15A can resume durable
  primitive migration.

Acceptance:

- MCP creation schemas and tests no longer expose "choose level 1" after a
  starting class is selected.
- All TS replay paths that validate multiclass entry use the shared
  prerequisite algebra instead of a Core-owned duplicate table.
- Existing MCP creation/battle handoff verticals remain available.
- `packages/character-creation-runtime/README.md`,
  `packages/character-creation-runtime/VOCABULARY.md`, and relevant
  shared-algebras docs describe the new ownership/progression language.
- Final plan closeout can unblock PBA15A.

Verification:

- RAW/UL check for class creation, level advancement, and multiclass
  prerequisite wording.
- `pnpm --filter @dnd/shared-algebras typecheck`
- `pnpm --filter @dnd/shared-algebras test`
- `pnpm --filter @dnd/character-creation-runtime typecheck`
- `pnpm --filter @dnd/character-creation-runtime test`
- `pnpm --filter @dnd/mcp typecheck`
- `pnpm --filter @dnd/mcp test`
- No battle MBT unless battle-runtime mappings change.
- `/simplify` convergence, minimum two rounds.

Plan Impact: if successful, unblock PBA15A.

### Task 65 - PBA15A - Migrate Surface And Character-Creation Domain Primitives

Status: `blocked`

Depends on: PBA15A0D
Blocks: PBA16

Research plan:
[pba15a-domain-primitives-research-plan.md](/workspace/typescript/dnd/plans/pba15a-domain-primitives-research-plan.md)

Next action: migrate remaining durable Surface-authored and
character-creation-runtime primitive domain values after PBA15A0D leaves
progression and multiclass prerequisite facts in their durable owners.

Acceptance summary: changed Surface and character-creation production types no
longer use bare primitives for durable domain values when an owned type or
literal union should carry meaning.

Verification summary: source primitive inventory, focused Surface and
character-creation typechecks/tests, no battle MBT unless promoted battle
runtime mappings change, `/simplify` convergence.

Plan Impact: if successful, unblock PBA16.

### Task 66 - PBA16 - Add Death-Save Promoted MBT Coverage

Status: `blocked`

Depends on: PBA15A
Blocks: PBA17

Research plan:
[pba16-death-save-promoted-mbt-research-plan.md](/workspace/typescript/dnd/plans/pba16-death-save-promoted-mbt-research-plan.md)

Next action: add selective promoted `@dnd/battle-runtime` QNT/MBT coverage for
turn-start Death Saving Throw holes and one lifecycle outcome.

Acceptance summary: Death Saving Throw hole replay is covered by promoted
battle-runtime proof; old Core MBT remains quarantined reference material.

Verification summary: RAW lifecycle check, smallest useful promoted MBT tier,
no broad battle MBT/fuzz, `/simplify` convergence.

Plan Impact: if successful, unblock PBA17.

### Task 67 - PBA17 - Restore Nonlethal Knockout And Zero-HP Handoff Width

Status: `blocked`

Depends on: PBA16
Blocks: PBA18

Research plan:
[pba17-knockout-zero-hp-handoff-research-plan.md](/workspace/typescript/dnd/plans/pba17-knockout-zero-hp-handoff-research-plan.md)

Next action: restore Knock Out and remaining zero-HP/dead/Stable/rest handoff
width without duplicating battle-runtime state.

Acceptance summary: positive HP, zero HP, Stable, dead, and Knock Out handoffs
are explicit and type-representable without contradictory states.

Verification summary: RAW/UL check, focused battle-runtime/MCP tests, QNT/MBT
only if lifecycle mappings change beyond PBA16, `/simplify` convergence.

Plan Impact: if successful, unblock PBA18.

### Task 68 - PBA18 - Widen Attack Range And Conditional Attack Riders

Status: `blocked`

Depends on: PBA17
Blocks: PBA19

Research plan:
[pba18-attack-range-riders-research-plan.md](/workspace/typescript/dnd/plans/pba18-attack-range-riders-research-plan.md)

Next action: restore ranged attacks beyond normal range with Disadvantage and
support-profile handling for supported conditional attack riders.

Acceptance summary: range and rider facts derive from retained Surface records
and runtime state; no attack branch dispatches on authored ids, names, or
monster slugs.

Verification summary: RAW check, focused battle-runtime/MCP/Surface tests,
promoted QNT/MBT only if reusable attack procedure behavior changes,
`/simplify` convergence.

Plan Impact: if successful, unblock PBA19.

### Task 69 - PBA19 - Restore Stat Block Multiattack And Bonus Actions

Status: `blocked`

Depends on: PBA18
Blocks: PBA20

Research plan:
[pba19-stat-block-multiattack-bonus-actions-research-plan.md](/workspace/typescript/dnd/plans/pba19-stat-block-multiattack-bonus-actions-research-plan.md)

Next action: restore Stat Block Multiattack and Stat Block Bonus Action options
as reusable monster procedure families.

Acceptance summary: Multiattack composes supported actions/resources rather than
copying monster-specific scripts; unsupported Stat Block shapes remain
support-gated.

Verification summary: RAW check, focused Surface contract, battle-runtime, and
MCP tests, promoted QNT/MBT only for new reusable procedure behavior,
`/simplify` convergence.

Plan Impact: if successful, unblock PBA20.

### Task 70 - PBA20 - Restore Spell Targeting And Catalog Width

Status: `blocked`

Depends on: PBA19
Blocks: PBA21

Research plan:
[pba20-spell-targeting-catalog-width-research-plan.md](/workspace/typescript/dnd/plans/pba20-spell-targeting-catalog-width-research-plan.md)

Next action: restore Magic Missile split-target replay and broaden spell
effects/catalog pressure through reusable spell support profiles.

Acceptance summary: spell targeting, slot spend, Concentration, and effect
lifecycles remain distinct runtime facts; catalog breadth remains table-driven
when it fits existing profiles.

Verification summary: RAW check, focused Surface/battle-runtime/MCP/typecheck
coverage, promoted QNT/MBT only for new reusable spell procedure behavior,
`/simplify` convergence.

Plan Impact: if successful, unblock PBA21.

### Task 71 - PBA21 - Broaden Reaction Windows And Bonus-Action Subjects

Status: `blocked`

Depends on: PBA20
Blocks: PBA22

Research plan:
[pba21-reaction-bonus-action-width-research-plan.md](/workspace/typescript/dnd/plans/pba21-reaction-bonus-action-width-research-plan.md)

Next action: broaden Reaction windows and Bonus Action subjects after spell
targeting width is available.

Acceptance summary: Reaction and Bonus Action resources remain represented in
turn resources with typed replay; unsupported shapes fail at support gates.

Verification summary: RAW check per selected pressure case, focused
battle-runtime/MCP tests, promoted QNT/MBT for high-risk interrupt-stack or
continuation changes, `/simplify` convergence.

Plan Impact: if successful, unblock PBA22.

### Task 72 - PBA22 - Stabilize Battle Snapshots Traces And App UI

Status: `blocked`

Depends on: PBA21
Blocks: PBA23

Research plan:
[pba22-snapshots-traces-app-ui-research-plan.md](/workspace/typescript/dnd/plans/pba22-snapshots-traces-app-ui-research-plan.md)

Next action: restore promoted battle snapshot/trace contracts and app battle UI
workflows after runtime procedure families stabilize.

Acceptance summary: UI consumes promoted runtime/MCP snapshots instead of old
Core/projected state; snapshot facts derive from runtime state and retained
Surface records.

Verification summary: app/source tests, MCP/runtime snapshot contract tests,
Playwright screenshots for changed visual surfaces, no battle MBT unless
runtime semantics change, `/simplify` convergence.

Plan Impact: if successful, unblock PBA23.

### Task 73 - PBA23 - Core Promotion Deletion Ledger

Status: `blocked`

Depends on: PBA22
Blocks: PBA25

Research plan:
[pba23-core-promotion-deletion-ledger.md](/workspace/typescript/dnd/plans/pba23-core-promotion-deletion-ledger.md)

Next action: inventory every remaining Core consumer, proof artifact, root
Quint lane, package dependency, app import, and restore-source artifact before
any Core deletion work.

Acceptance summary: a single ledger classifies every remaining Core character,
battle, app, root-QNT, MBT, script, and package-config dependency as promoted,
legacy proof, active app debt, blocked restore work, obsolete, or deletion
residue. The ledger explicitly covers battle reducer replacement; a
character-only ledger is insufficient.

Verification summary: import and projected-vocabulary searches, promoted
runtime Core-free checks, package-local promoted test commands only if docs or
manifests require them, no old Core battle MBT, `/simplify` convergence.

Plan Impact: if successful, unblock PBA25.

### Task 74 - PBA24 - Remove Rogue Cunning Action Support Workaround

Status: `blocked`

Depends on: PBA25
Blocks: PBA27

Research plan:
[pba24-remove-rogue-cunning-action-workaround.md](/workspace/typescript/dnd/plans/pba24-remove-rogue-cunning-action-workaround.md)

Next action: after PBA25 provides the retained feature-Unit path, replace MCP's
Rogue class-name/level support-profile inference with real Surface Unit content
and support-profile parsing for Cunning Action.

Acceptance summary: Cunning Action support is derived from retained Surface Unit
refs and parsed mechanics, never from `className === "rogue"` or a fake class
Unit support profile. Rogue level 2 with the real feature can use admitted
Bonus Action standard-action support; Rogue level 1 or missing feature Units
cannot. This task may add the Cunning Action support-profile reader/runtime
mapping, but must not rebuild generic class-feature grant or retained-Unit
machinery owned by PBA25.

Verification summary: RAW/UL check for Rogue Cunning Action and Bonus Actions,
focused Surface/character-creation/battle-runtime/MCP tests,
`pnpm check:authored-id-dispatch`, promoted QNT only if reusable bonus-action
standard-action behavior changes, no broad battle MBT, `/simplify` convergence.

Plan Impact: if successful, unblock the Rogue-workaround prerequisite for
PBA27.

### Task 75 - PBA25 - Promote Unit-Backed Character Choice Width

Status: `blocked`

Depends on: PBA23
Blocks: PBA24, PBA26

Research plan:
[pba25-unit-backed-character-choice-width.md](/workspace/typescript/dnd/plans/pba25-unit-backed-character-choice-width.md)

Next action: move remaining Core direct character-choice width into Surface
Unit records/readers, Unit-backed creation holes, selected Unit refs, and
`CharacterBuild` projections.

Acceptance summary: subclass, feat/ASI/Epic Boon, multiclass skill/tool, and
proficiency choice families that remain needed for promoted workflows are
represented through Surface language and runtime support gates, not Core enums,
parallel tables, or authored-id dispatch in non-Surface packages. This task
owns the generic feature-grant and retained-Unit path needed by PBA24, but does
not attach Cunning Action battle support from MCP.

Verification summary: RAW/UL check per widened choice family, Surface
schema/reader tests, character-creation reducer and finalization tests, QNT/MBT
updates only for changed reducer behavior or bridge shapes,
`pnpm check:authored-id-dispatch`, `/simplify` convergence.

Plan Impact: if successful, unblock PBA24 and PBA26.

### Task 76 - PBA26 - Define Character Sheet Session Boundary And Migrate App

Status: `blocked`

Depends on: PBA25
Blocks: PBA27

Research plan:
[pba26-character-sheet-session-app-migration.md](/workspace/typescript/dnd/plans/pba26-character-sheet-session-app-migration.md)

Next action: decide the promoted replacement for Core `CharacterSheet`
consumers and migrate app character workflows from Core direct APIs to promoted
runtime/MCP read models.

Acceptance summary: app character creation and character-session UI no longer
depend on `@dnd/core/character-domain.ts`; in-play state ownership is explicit
as `CharacterBuild + MCP CharacterSession`, a promoted read model, or another
named owner that does not put current HP/spent resources into character
creation.

Verification summary: app and MCP Core-import searches, app typecheck/tests,
MCP typecheck/tests, Playwright screenshots for changed app flows, no battle
MBT unless snapshot semantics change, `/simplify` convergence.

Plan Impact: if successful, unblock PBA27 when PBA24 is also complete.

### Task 77 - PBA27 - Core Quarantine And Deletion Cutover

Status: `blocked`

Depends on: PBA24, PBA26
Blocks: PBA28

Research plan:
[pba27-core-quarantine-deletion-cutover.md](/workspace/typescript/dnd/plans/pba27-core-quarantine-deletion-cutover.md)

Next action: remove or quarantine Core only after the PBA23 ledger has no
production blockers and promoted package gates own replacement behavior.

Acceptance summary: no production package imports `@dnd/core`; old Core battle,
creature, and character behavior is either promoted, explicitly restore-source
only, or obsolete; workspace scripts and package metadata no longer keep Core in
the active promoted build/test path.

Verification summary: workspace Core-import searches, package manifest/script
checks, promoted Surface/character-creation/battle-runtime/MCP/app checks, no
legacy Core MBT as a gate, `/simplify` convergence.

Plan Impact: if successful, unblock PBA28.

### Task 78 - PBA28 - MBT Consolidation And Shared Algebra Parity

Status: `blocked`

Depends on: PBA27
Blocks: future tasks

Research plan:
[pba28-mbt-consolidation-shared-algebra-parity.md](/workspace/typescript/dnd/plans/pba28-mbt-consolidation-shared-algebra-parity.md)

Next action: after Core quarantine/deletion, consolidate the active proof graph
around package-local shared algebra MBT/proofs and selective promoted runtime
MBT.

Acceptance summary: `@dnd/shared-algebras` has a durable package-local parity
pattern for stateful semantic algebras; each state-transition algebra has
focused deterministic TS tests plus Quint MBT replay or documented
Quint invariant/proof coverage; battle-runtime integrated MBT remains
selective; broad authored-record width remains deterministic contract tests.

Verification summary: package-local shared-algebras typecheck/tests and
selected Quint proof/MBT commands, promoted runtime documentation checks, no
legacy Core MBT as a gate, no broad battle MBT unless a promoted integrated
slice is intentionally changed, `/simplify` convergence.
