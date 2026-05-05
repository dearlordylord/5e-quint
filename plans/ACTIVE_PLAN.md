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
- [MOVEMENT_GEOMETRY_OWNERSHIP.md](/workspace/typescript/dnd/plans/MOVEMENT_GEOMETRY_OWNERSHIP.md)
- [MCPA3_SPATIAL_ACTION_CONTRACTS.md](/workspace/typescript/dnd/plans/MCPA3_SPATIAL_ACTION_CONTRACTS.md)
- [pba15b-table-spatial-fact-eradication-plan.md](/workspace/typescript/dnd/plans/pba15b-table-spatial-fact-eradication-plan.md)
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
      "status": "done",
      "title": "Replace Level-One Class-Entry Workflow"
    },
    {
      "number": 64,
      "id": "PBA15A0D",
      "status": "done",
      "title": "Wire Progression And Multiclass Through MCP Docs"
    },
    {
      "number": 65,
      "id": "PBA15A",
      "status": "done",
      "title": "Migrate Surface And Character-Creation Domain Primitives"
    },
    {
      "number": 66,
      "id": "PBA16",
      "status": "done",
      "title": "Add Death-Save Promoted MBT Coverage"
    },
    {
      "number": 67,
      "id": "PBA17",
      "status": "done",
      "title": "Restore Nonlethal Knockout And Zero-HP Handoff Width"
    },
    {
      "number": 68,
      "id": "PBA15B",
      "status": "done",
      "title": "Remove Runtime-Owned Spatiality And Distances"
    },
    {
      "number": 69,
      "id": "PBA18",
      "status": "done",
      "title": "Widen Attack Range And Conditional Attack Riders"
    },
    {
      "number": 70,
      "id": "PBA19",
      "status": "done",
      "title": "Restore Stat Block Multiattack And Bonus Actions"
    },
    {
      "number": 71,
      "id": "PBA20",
      "status": "done",
      "title": "Restore Spell Targeting And Catalog Width"
    },
    {
      "number": 72,
      "id": "PBA21",
      "status": "ready-for-implementation-after-light-research",
      "title": "Broaden Reaction Windows And Bonus-Action Subjects"
    },
    {
      "number": 73,
      "id": "PBA22",
      "status": "blocked",
      "title": "Stabilize Battle Snapshots Traces And App UI"
    },
    {
      "number": 74,
      "id": "PBA23",
      "status": "blocked",
      "title": "Core Promotion Deletion Ledger"
    },
    {
      "number": 75,
      "id": "PBA24",
      "status": "blocked",
      "title": "Remove Rogue Cunning Action Support Workaround"
    },
    {
      "number": 76,
      "id": "PBA25",
      "status": "blocked",
      "title": "Promote Unit-Backed Character Choice Width"
    },
    {
      "number": 77,
      "id": "PBA26",
      "status": "blocked",
      "title": "Define Character Sheet Session Boundary And Migrate App"
    },
    {
      "number": 78,
      "id": "PBA27",
      "status": "blocked",
      "title": "Core Quarantine And Deletion Cutover"
    },
    {
      "number": 79,
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
- Spatial facts always come from the table/caller/session. Do not plan grid
  state, LOS/pathfinding/cover derivation, or adjacency caches in Core, promoted
  runtimes, or MCP; plan explicit table-supplied facts instead.
- Character-creation behavior changes must update
  `packages/character-creation-runtime/README.md` and
  `packages/character-creation-runtime/VOCABULARY.md` when architecture or
  vocabulary changes.
- Shared algebra changes must update
  `packages/shared-algebras/README.md` or relevant package-local proof docs.
- Do not run battle MBT for research-only tasks. Use the smallest MBT tier that
  actually validates a completed behavior change.
- Implementation closeout must include `/simplify` convergence: minimum two
  rounds unless the changeset is trivial.

## DAG / Queue Order

| Order | Task                                                              | Status                                        | Depends on   | Blocks       | Research / plan                                                                                              | Next action                                                                                                                      |
| ----- | ----------------------------------------------------------------- | --------------------------------------------- | ------------ | ------------ | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| 61    | PBA15A0A - Promote Multiclass Prerequisite Algebra                | done                                          | PBA15        | PBA15A0B     | inline below                                                                                                 | Shared algebra owns multiclass prerequisite facts; Core delegates through compatibility wrappers.                                |
| 62    | PBA15A0B - Introduce Character Progression Projection Helpers     | done                                          | PBA15A0A     | PBA15A0C     | inline below                                                                                                 | Character-creation-runtime exports character progression helpers and Unit-id boundary adapters.                                  |
| 63    | PBA15A0C - Replace Level-One Class-Entry Workflow                 | done                                          | PBA15A0B     | PBA15A0D     | inline below                                                                                                 | Runtime progression fill now replaces separate primary-class and level-1 class-entry workflow.                                   |
| 64    | PBA15A0D - Wire Progression And Multiclass Through MCP Docs       | done                                          | PBA15A0C     | PBA15A       | inline below                                                                                                 | MCP schema/workflow/docs now expose progression as one atomic profile choice and point multiclass validation at shared-algebras. |
| 65    | PBA15A - Migrate Surface And Character-Creation Domain Primitives | done                                          | PBA15A0D     | PBA15B       | [research plan](/workspace/typescript/dnd/plans/pba15a-domain-primitives-research-plan.md)                   | Character-creation ability-score assignments are parsed into shared AbilityScore values before durable runtime storage.           |
| 66    | PBA16 - Add Death-Save Promoted MBT Coverage                      | done                                          | PBA15B       | PBA17        | [research plan](/workspace/typescript/dnd/plans/pba16-death-save-promoted-mbt-research-plan.md)              | Promoted battle-runtime MBT/QNT now covers Death Saving Throw holes for a Character Build combatant.                              |
| 67    | PBA17 - Restore Nonlethal Knockout And Zero-HP Handoff Width      | done                                          | PBA16        | PBA18        | [research plan](/workspace/typescript/dnd/plans/pba17-knockout-zero-hp-handoff-research-plan.md)             | Knock Out and durable positive/zero-HP handoffs are now explicit in promoted battle-runtime and MCP session state.               |
| 68    | PBA15B - Remove Runtime-Owned Spatiality And Distances            | done                                          | PBA15A       | PBA16        | [research plan](/workspace/typescript/dnd/plans/pba15b-table-spatial-fact-eradication-plan.md)              | Promoted runtime and MCP now consume table/caller spatial facts instead of owning combatant distances. |
| 69    | PBA18 - Widen Attack Range And Conditional Attack Riders          | done                                          | PBA15B       | PBA19        | [research plan](/workspace/typescript/dnd/plans/pba18-attack-range-riders-research-plan.md)                  | Long-range attack target facts are legal and feed Disadvantage through the shared roll-mode path; supported conditional attack riders remain Surface-derived. |
| 70    | PBA19 - Restore Stat Block Multiattack And Bonus Actions          | done                                          | PBA18        | PBA20        | [research plan](/workspace/typescript/dnd/plans/pba19-stat-block-multiattack-bonus-actions-research-plan.md) | Stat Block Multiattack and Bonus Action procedure families are restored for supported monster profiles.                          |
| 71    | PBA20 - Restore Spell Targeting And Catalog Width                 | done                                          | PBA19        | PBA21        | [research plan](/workspace/typescript/dnd/plans/pba20-spell-targeting-catalog-width-research-plan.md)        | Magic Missile split-target replay and higher-slot dart count are restored through spell target allocation fills.                 |
| 72    | PBA21 - Broaden Reaction Windows And Bonus-Action Subjects        | ready-for-implementation-after-light-research | PBA20        | PBA22        | [research plan](/workspace/typescript/dnd/plans/pba21-reaction-bonus-action-width-research-plan.md)          | Broaden Reaction windows and Bonus Action subjects after spell targeting width.                                                  |
| 73    | PBA22 - Stabilize Battle Snapshots Traces And App UI              | blocked                                       | PBA21        | PBA23        | [research plan](/workspace/typescript/dnd/plans/pba22-snapshots-traces-app-ui-research-plan.md)              | Restore promoted snapshot/trace contracts and app battle UI workflows.                                                           |
| 74    | PBA23 - Core Promotion Deletion Ledger                            | blocked                                       | PBA22        | PBA25        | [research plan](/workspace/typescript/dnd/plans/pba23-core-promotion-deletion-ledger.md)                     | Inventory every remaining Core consumer, proof artifact, and restore-source lane before any Core deletion work.                  |
| 75    | PBA24 - Remove Rogue Cunning Action Support Workaround            | blocked                                       | PBA25        | PBA27        | [research plan](/workspace/typescript/dnd/plans/pba24-remove-rogue-cunning-action-workaround.md)             | Replace MCP's Rogue class-name support-profile inference with real Surface Unit and support-profile flow.                        |
| 76    | PBA25 - Promote Unit-Backed Character Choice Width                | blocked                                       | PBA23        | PBA24, PBA26 | [research plan](/workspace/typescript/dnd/plans/pba25-unit-backed-character-choice-width.md)                 | Move remaining Core direct character-choice width into Surface Unit readers and character-creation runtime holes/projections.    |
| 77    | PBA26 - Define Character Sheet Session Boundary And Migrate App   | blocked                                       | PBA25        | PBA27        | [research plan](/workspace/typescript/dnd/plans/pba26-character-sheet-session-app-migration.md)              | Decide the promoted Character Sheet/session read model and move app character workflows off Core APIs.                           |
| 78    | PBA27 - Core Quarantine And Deletion Cutover                      | blocked                                       | PBA24, PBA26 | PBA28        | [research plan](/workspace/typescript/dnd/plans/pba27-core-quarantine-deletion-cutover.md)                   | Remove or quarantine Core only after the deletion ledger has no production blockers and promoted gates own replacement behavior. |
| 79    | PBA28 - MBT Consolidation And Shared Algebra Parity               | blocked                                       | PBA27        | future tasks | [research plan](/workspace/typescript/dnd/plans/pba28-mbt-consolidation-shared-algebra-parity.md)            | Consolidate the post-Core proof graph around package-local shared algebra MBT/proofs and selective promoted runtime MBT.         |

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

- Character-creation state previously duplicated starting class through a
  separate class pick and a level-1 class entry.
- Target promoted shape is one durable `CharacterProgression` selected at the
  draft boundary. It carries an explicit starting class plus ordered post-start
  class advancement entries. Total character level and per-class levels are
  derived from that history.
- `packages/character-creation-runtime/src/character-progression-algebra.ts` is the
  handoff file for this slice.

Acceptance:

- Character-creation-runtime exports a precise `CharacterProgression` model with
  starting-class facts distinct from post-start advancement entries.
- Runtime helpers derive total level and class-level facts from the progression
  model.
- Unit-id inputs such as `class_fighter` are converted through one explicit
  boundary adapter; Surface Unit ids are not stored in the core progression
  algebra.
- Focused tests prove a level-1 Fighter, Fighter 2, and Fighter/Wizard
  progression derive expected totals/class levels without storing contradictory
  class levels.
- Existing public workflow behavior is not broadly rewired in this slice; keep
  compatibility projections where needed.

Verification:

- RAW/UL check for class creation and class level and Hit Point rule wording.
- `pnpm --filter @dnd/character-creation-runtime typecheck`
- `pnpm --filter @dnd/character-creation-runtime test`
- No battle MBT.
- `/simplify` convergence, minimum two rounds.

Plan Impact: if successful, unblock PBA15A0C.

Closeout: `@dnd/character-creation-runtime` exports `CharacterProgression`
helpers with branded class Unit ids, explicit starting class, ordered post-start
advancement entries with Hit Point rule evidence, derived total/class-level
helpers, focused tests, and package README/VOCABULARY notes.

### Task 63 - PBA15A0C - Replace Level-One Class-Entry Workflow

Status: `done`

Depends on: PBA15A0B
Blocks: PBA15A0D

Closeout: character-creation-runtime discovery, fill reduction, finalization,
QNT slice, MBT bridge, MCP tests, and package docs use one draft-owned
`draft.progression.initial` fill. The old separate class-pick plus level-1
class-entry workflow is removed from the promoted runtime.

Context:

- The former runtime stored both a separate starting-class pick and a level-1
  class entry. That duplicated the same level-1 fact and made callers keep two
  fields synchronized.
- Task PBA15A0B creates the progression helpers that should make duplicate
  level-1 class ownership unrepresentable at the promoted runtime boundary.
- Keep supported workflows available: Orc Soldier Fighter 1, Orc Soldier
  Fighter 2, and Orc Soldier Wizard 1.

Acceptance:

- Promoted character creation cannot represent a starting-class pick separate
  from a separate level-1 class entry. Fighter followed by Wizard remains a valid
  ordered multiclass shape when prerequisites are satisfied.
- Promoted character creation cannot represent a post-start class entry with a
  contradictory stored level.
- Character-creation-runtime no longer exposes a separate post-class level-1
  class-entry fill after choosing a starting class.
- Discovery, fill reducer, support gates, finalization, QNT slice/MBT bridge,
  and focused runtime tests use the progression model.
- Existing supported creation verticals still pass.

Verification:

- RAW/UL check for class creation and class level and Hit Point rule wording.
- `pnpm --filter @dnd/character-creation-runtime typecheck`
- `pnpm --filter @dnd/character-creation-runtime test`
- Focused Core tests only if legacy replay compatibility wrappers are touched.
- No battle MBT unless battle-runtime mappings change.
- `/simplify` convergence, minimum two rounds.

Plan Impact: if successful, unblock PBA15A0D.

### Task 64 - PBA15A0D - Wire Progression And Multiclass Through MCP Docs

Status: `done`

Depends on: PBA15A0C
Blocks: PBA15A

Next action: wire the character progression model and shared multiclass
prerequisite checks through MCP schemas/tests and update package docs.

Context:

- PBA15A0A owns canonical multiclass prerequisite checks in
  `@dnd/shared-algebras`.
- PBA15A0B and PBA15A0C normalize character-creation-runtime progression and
  remove the separate level-1 class-entry workflow.
- This slice is the integration/docs closeout before PBA15A can resume durable
  primitive migration.

Acceptance:

- MCP creation schemas and tests no longer expose a separate level-1 class-entry
  fill after a starting class is selected.
- All TS replay paths that validate multiclass entry use the shared
  prerequisite algebra instead of a Core-owned duplicate table.
- Existing MCP creation/battle handoff verticals remain available.
- `packages/character-creation-runtime/README.md`,
  `packages/character-creation-runtime/VOCABULARY.md`, and relevant
  shared-algebras docs describe the new ownership/progression language.
- Final plan closeout can unblock PBA15A.

Verification:

- RAW/UL check for class creation, class level progression, and multiclass
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

Closeout: MCP fill schema descriptions, workflow output, README, and focused
tests now present `draft.progression.initial` as the single atomic Character
Progression profile fill. The docs identify `@dnd/character-creation-runtime`
as the progression owner and
`@dnd/shared-algebras/multiclass-prerequisite-algebra` as the multiclass
prerequisite owner. Character-creation-runtime and shared-algebras docs carry
the same ownership language. Verification passed:
`pnpm --filter @dnd/shared-algebras typecheck`,
`pnpm --filter @dnd/shared-algebras test`,
`pnpm --filter @dnd/character-creation-runtime typecheck`,
`pnpm --filter @dnd/character-creation-runtime test`,
`pnpm --filter @dnd/mcp typecheck`, and `pnpm --filter @dnd/mcp test`.
`/simplify` converged in two rounds: round 1 weakened a brittle exact workflow
text assertion to invariant phrase checks; round 2 rechecked task-index
synchronization and MCP contract ownership with no further changes. PBA15A is
unblocked for research.

### Task 65 - PBA15A - Migrate Surface And Character-Creation Domain Primitives

Status: `done`

Depends on: PBA15A0D
Blocks: PBA15B

Research plan:
[pba15a-domain-primitives-research-plan.md](/workspace/typescript/dnd/plans/pba15a-domain-primitives-research-plan.md)

Inventory evidence:
[pba15a-domain-primitives-inventory.md](/workspace/typescript/dnd/plans/pba15a-domain-primitives-inventory.md)

Next action: migrate `AbilityScoreAssignment` from raw `number` values to an
owned parsed ability-score assignment type before it is stored in
`CreationFill`, `CharacterDraft`, or `CharacterBuild`. This should use the
existing shared `AbilityScore` primitive or a narrower creation-assignment type
that contains shared `AbilityScore` values. Do not widen this slice into broad
Surface Unit id or whole-Surface numeric cleanup.

Acceptance summary: changed Surface and character-creation production types no
longer use bare primitives for Core-related durable domain values when an owned
type or literal union should carry meaning.

Verification summary: source primitive inventory, focused Surface and
character-creation typechecks/tests, no battle MBT unless promoted battle
runtime mappings change, `/simplify` convergence.

Implementation note: the first PBA15A source-identity slices are integrated:
Unit-choice and selected-equipment loadout sources use distinct source/key
isomorphisms; `ChoiceCreationHole.source` excludes the ability-score draft
source; MCP creation-hole schemas use runtime-owned literal domains and the
canonical ability-score draft-path constant. `CharacterBuildLoadout.itemId` is
also already represented by `CharacterEquipmentItemId`, a package-owned
source/key isomorphism. RAW and UL/domain checker convergence passed in the
parallel worktree review lanes before integration.

Plan Impact: if successful, unblock PBA15B.

Closeout: `@dnd/shared-algebras` now parses raw ability-score assignments into
the shared `AbilityScore` primitive, while character-creation-runtime stores
the parsed assignment in creation fills, drafts, and finalized builds. MCP fill
decoding parses incoming score objects at the boundary before they enter
runtime state. Background ability-score increases return typed finalization
issues instead of silently clamping when a post-background score would exceed
the SRD cap. Verification passed focused shared-algebras,
character-creation-runtime, and MCP typechecks/tests; no battle MBT was needed
because promoted battle-runtime mappings were not touched. PBA15B is unblocked.

### Task 66 - PBA16 - Add Death-Save Promoted MBT Coverage

Status: `done`

Depends on: PBA15B
Blocks: PBA17

Research plan:
[pba16-death-save-promoted-mbt-research-plan.md](/workspace/typescript/dnd/plans/pba16-death-save-promoted-mbt-research-plan.md)

Next action: add selective promoted `@dnd/battle-runtime` QNT/MBT coverage for
turn-start Death Saving Throw holes and one lifecycle outcome. A 2026-05-05
read-only preflight in the research plan confirms the exact promoted MBT gap
and recommends a two-Character Build tracer bullet.

Acceptance summary: Death Saving Throw hole replay is covered by promoted
battle-runtime proof; old Core MBT remains quarantined reference material.

Verification summary: RAW lifecycle check, smallest useful promoted MBT tier,
no broad battle MBT/fuzz, `/simplify` convergence.

Plan Impact: if successful, unblock PBA17.

Closeout: promoted `@dnd/battle-runtime` MBT now models and replays the
`DeathSavingThrow` hole for a Character Build combatant starting its turn at 0
HP. The dedicated promoted MBT scenario compares current actor role, pending
holes, HP, Unconscious, Stable, dead, and Death Saving Throw success/failure
counters across QNT and TS. Verification covered RAW/UBIQUITOUS_LANGUAGE
anchors, QNT typechecks, focused battle-runtime TypeScript typecheck, and the
Tier 1 promoted MBT test. PBA17 is unblocked.

### Task 67 - PBA17 - Restore Nonlethal Knockout And Zero-HP Handoff Width

Status: `done`

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

Closeout: promoted battle-runtime now exposes melee Knock Out as an
attack-damage disposition when damage would reduce a creature from positive HP
to 0 without Massive Damage, applying the SRD 1 HP plus Unconscious outcome for
Character and Stat Block combatants. MCP character sessions now preserve
positive-HP Unconscious Knock Out handoff separately from zero-HP unstable,
Stable, and dead lifecycles, and can start a later battle from those explicit
session states. Verification covered RAW/UBIQUITOUS_LANGUAGE anchors, focused
battle-runtime and MCP tests, QNT self-tests through the battle-runtime suite,
and `pnpm quality` until unrelated app/Core baseline typecheck failures.
PBA18 remains runnable.

### Task 68 - PBA15B - Remove Runtime-Owned Spatiality And Distances

Status: `done`

Depends on: PBA15A
Blocks: PBA16

Research plan:
[pba15b-table-spatial-fact-eradication-plan.md](/workspace/typescript/dnd/plans/pba15b-table-spatial-fact-eradication-plan.md)

Next action: remove promoted battle-runtime and MCP ownership of pairwise
combatant distances before attack range, spell targeting, reaction, and app
behavior widening depends on that state. Preserve movement budget in feet, but
replace geometry/distance-derived legality with explicit table/caller/session
facts for movement reach-exit, opportunity attacks, target legality, Help
proximity, Grapple reach/out-of-range, Sneak Attack adjacent ally, and AoE
included targets.

Acceptance summary: promoted battle runtime and MCP do not store, default,
project, or compute combatant distances, adjacency, reach exit, target range, or
area membership. Authored reach/range/radius facts remain content metadata that
the table uses to provide executable spatial facts.

Verification summary: RAW/UL check for every touched movement, targeting, reach,
Help, Grapple, and area rule; focused battle-runtime and MCP typechecks/tests;
smallest useful promoted MBT only after QNT changes; no battle MBT for
research-only work; `/simplify` convergence.

Plan Impact: if successful, unblock PBA18.

Closeout: promoted battle-runtime and MCP no longer store, default, project, or
compute combatant distance graphs. Movement, opportunity attacks, target
legality, Help, Grapple, Sneak Attack adjacency, and save-gate area membership
now consume table/caller spatial facts; authored reach/range/radius facts remain
content metadata.

### Task 69 - PBA18 - Widen Attack Range And Conditional Attack Riders

Status: `done`

Depends on: PBA15B
Blocks: PBA19

Research plan:
[pba18-attack-range-riders-research-plan.md](/workspace/typescript/dnd/plans/pba18-attack-range-riders-research-plan.md)

Next action: restore ranged attacks beyond normal range with Disadvantage and
support-profile handling for supported conditional attack riders.

Acceptance summary: authored normal/long range metadata derives from retained
Surface records, selected-target range bands come from table/session facts, and
rider facts derive from retained Surface records and runtime state; no attack
branch dispatches on authored ids, names, or monster slugs.

Verification summary: RAW check, focused battle-runtime/MCP/Surface tests,
promoted QNT/MBT only if reusable attack procedure behavior changes,
`/simplify` convergence.

Plan Impact: if successful, unblock PBA19.

Closeout: ranged attack target facts now distinguish normal and long range.
Long-range target fills are legal and contribute Disadvantage through the shared
attack-roll mode path, including Advantage/Disadvantage cancellation. The
runtime continues to derive authored normal/long range and supported
conditional attack rider facts from retained Surface records, with MCP replay
preserving table-supplied target range bands rather than storing distances or
copying authored range metadata.

### Task 70 - PBA19 - Restore Stat Block Multiattack And Bonus Actions

Status: `done`

Depends on: PBA18
Blocks: PBA20

Research plan:
[pba19-stat-block-multiattack-bonus-actions-research-plan.md](/workspace/typescript/dnd/plans/pba19-stat-block-multiattack-bonus-actions-research-plan.md)

Next action: Stat Block Multiattack and Stat Block Bonus Action options are
restored as reusable monster procedure families for supported profiles.

Acceptance summary: Multiattack composes supported actions/resources rather than
copying monster-specific scripts; unsupported Stat Block shapes remain
support-gated.

Verification summary: RAW check, focused Surface contract, battle-runtime, and
MCP tests, promoted QNT/MBT only for new reusable procedure behavior,
`/simplify` convergence.

Plan Impact: PBA20 is unblocked.

### Task 71 - PBA20 - Restore Spell Targeting And Catalog Width

Status: `done`

Depends on: PBA19
Blocks: PBA21

Research plan:
[pba20-spell-targeting-catalog-width-research-plan.md](/workspace/typescript/dnd/plans/pba20-spell-targeting-catalog-width-research-plan.md)

Next action: Magic Missile split-target replay and higher-slot dart count are
restored through reusable spell target allocation fills.

Acceptance summary: spell targeting, slot spend, Concentration, and effect
lifecycles remain distinct runtime facts; catalog breadth remains table-driven
when it fits existing profiles.

Verification summary: RAW check, focused battle-runtime/MCP typecheck and tests,
and promoted Magic Missile MBT coverage passed; full `pnpm quality` remains
blocked by unrelated app/Core baseline typecheck failures.

Plan Impact: PBA21 is unblocked.

### Task 72 - PBA21 - Broaden Reaction Windows And Bonus-Action Subjects

Status: `ready-for-implementation-after-light-research`

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

### Task 73 - PBA22 - Stabilize Battle Snapshots Traces And App UI

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

### Task 74 - PBA23 - Core Promotion Deletion Ledger

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

### Task 75 - PBA24 - Remove Rogue Cunning Action Support Workaround

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

### Task 76 - PBA25 - Promote Unit-Backed Character Choice Width

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

### Task 77 - PBA26 - Define Character Sheet Session Boundary And Migrate App

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

### Task 78 - PBA27 - Core Quarantine And Deletion Cutover

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

### Task 79 - PBA28 - MBT Consolidation And Shared Algebra Parity

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
