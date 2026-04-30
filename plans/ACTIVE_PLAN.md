# Active Plan

Date: 2026-04-29

This is the single active planning queue.

Active batch: Correction Application Migration.

Batch goal: replace the old Core/projected-executable vertical with a Surface/Unit-driven character-creation runtime, battle runtime, and MCP green path. The first runnable vertical is the Orc Soldier Fighter 1 from [phase1-fighter-manifest.md](/workspace/typescript/dnd/plans/phase1-fighter-manifest.md) versus the Goblin Warrior Stat Block, through real creation holes, battle Attack with damage, and End Turn.

Primary planning documents:

- [CORRECTION_APPLICATION_MIGRATION_PLAN.md](/workspace/typescript/dnd/plans/CORRECTION_APPLICATION_MIGRATION_PLAN.md)
- [phase1-fighter-manifest.md](/workspace/typescript/dnd/plans/phase1-fighter-manifest.md)
- [phase0-surface-unit-availability.md](/workspace/typescript/dnd/plans/phase0-surface-unit-availability.md)
- [phase0-runtime-boundary-api.md](/workspace/typescript/dnd/plans/phase0-runtime-boundary-api.md)
- [phase0-core-deletion-restore-audit.md](/workspace/typescript/dnd/plans/phase0-core-deletion-restore-audit.md)
- [CORRECTION_APPLICATION_VOCABULARY.md](/workspace/typescript/dnd/plans/CORRECTION_APPLICATION_VOCABULARY.md)

Previous active queue status: the Executable Projection Tracer Bullet and Content-Surface Taxonomy Convergence queue is deferred by owner direction on 2026-04-29. Its in-progress/ready/blocked work is superseded for now by the Correction Application Migration. Preserve old domain knowledge through the Restore Ledger in [CORRECTION_APPLICATION_MIGRATION_PLAN.md](/workspace/typescript/dnd/plans/CORRECTION_APPLICATION_MIGRATION_PLAN.md), not by continuing projected-executable tasks.

## Status Vocabulary

- `ready-for-research`: A coding agent may pick this up now. The next step is documentation/source/RAW/code research, not implementation unless the research resolves the open decision. Write results back into this file or a task-specific plan, then update the task status.
- `ready-for-implementation-after-light-research`: The task shape is understood, but the coding agent must do the listed RAW or blast-radius check before editing code.
- `blocked`: A dependency or explicit owner decision must land first.
- `deferred`: Only use when the owner explicitly says to park the task for now. Do not use for queue ordering.
- `done`: Work completed and verification recorded.

## Ralph Task Index

The Ralph harness reads this machine-readable index for task order and status. Keep it synchronized with task sections whenever task status, order, ID, or title changes.

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 0,
      "id": "CAM0",
      "status": "done",
      "title": "Phase 0 Audit Pack"
    },
    {
      "number": 1,
      "id": "CAM1",
      "status": "done",
      "title": "Rename Prototype Surface To @dnd/surface"
    },
    {
      "number": 2,
      "id": "CAM2",
      "status": "done",
      "title": "Resolve Correction Action-Economy Drift"
    },
    {
      "number": 3,
      "id": "CAM3",
      "status": "done",
      "title": "Add Generic StatBlockRecord Catalog Boundary"
    },
    {
      "number": 4,
      "id": "CAM4",
      "status": "done",
      "title": "Add Minimal Character-Creation Surface Records"
    },
    {
      "number": 5,
      "id": "CAM5",
      "status": "done",
      "title": "Author First Vertical SRD Surface Content"
    },
    {
      "number": 6,
      "id": "CAM6",
      "status": "done",
      "title": "Create Character Creation Runtime Skeleton"
    },
    {
      "number": 7,
      "id": "CAM7",
      "status": "done",
      "title": "Implement Creation Hole Discovery For Manifest"
    },
    {
      "number": 8,
      "id": "CAM8",
      "status": "done",
      "title": "Implement Atomic Creation Batch Fill"
    },
    {
      "number": 9,
      "id": "CAM9",
      "status": "done",
      "title": "Finalize Legal Fighter Character Sheet"
    },
    {
      "number": 10,
      "id": "CAM10",
      "status": "done",
      "title": "Add Character Creation QNT Slice And Parity"
    },
    {
      "number": 11,
      "id": "CAM11",
      "status": "done",
      "title": "Create Battle Runtime Skeleton"
    },
    {
      "number": 12,
      "id": "CAM12",
      "status": "done",
      "title": "Start Battle From Character Sheet And Stat Block"
    },
    {
      "number": 13,
      "id": "CAM13",
      "status": "done",
      "title": "Implement Battle Attack Holes And Replay"
    },
    {
      "number": 14,
      "id": "CAM14",
      "status": "done",
      "title": "Implement Battle Damage And Zero-HP Policy"
    },
    {
      "number": 15,
      "id": "CAM15",
      "status": "done",
      "title": "Implement End Turn And Battle QNT Slice"
    },
    {
      "number": 16,
      "id": "CAM16",
      "status": "done",
      "title": "Add MCP Green Composition Root"
    },
    {
      "number": 17,
      "id": "CAM17",
      "status": "ready-for-implementation-after-light-research",
      "title": "Add MCP Character Creation Tools"
    },
    {
      "number": 18,
      "id": "CAM18",
      "status": "blocked",
      "title": "Add MCP Battle Tools And Green Fixture"
    },
    {
      "number": 19,
      "id": "CAM19",
      "status": "blocked",
      "title": "Controlled Core Break And Projected Vocabulary Deletion"
    },
    {
      "number": 20,
      "id": "CAM20",
      "status": "blocked",
      "title": "Green Reconciliation And MCP Promotion"
    },
    {
      "number": 21,
      "id": "CAM21",
      "status": "blocked",
      "title": "End-User Vertical Acceptance"
    }
  ]
}
-->

## Coding Loop Handoff Rules

- Start with the highest-priority task in the DAG table whose status is `ready-for-implementation-after-light-research` or `ready-for-research`.
- Treat the task loop as bidirectional: the plan scopes the task, and task discoveries may update the plan.
- Keep `Ralph Task Index` synchronized with task sections when changing task order, ID, title, or status.
- Every task closeout must include `Plan Impact`:
  - `Status: none` when no future planning changes are needed;
  - `Status: update-required` or `Status: applied` when the task changes downstream assumptions, status, dependencies, ordering, blockers, acceptance criteria, verification, or creates follow-up work.
- When `Plan Impact` is not `none`, update this file in the same task closeout before continuing. Record affected task IDs and the concrete planning action for each: unblock, block, defer, revise, add, or no-change.
- Only add durable planning facts to this file. Run-local failures and attempt-specific reminders belong in run-local artifacts, not here.
- Update the task status before ending the loop: `done`, `ready-for-implementation-after-light-research`, `blocked`, or `deferred`.
- When a task is marked `done`, inspect every task in its `Blocks` column and promote those whose dependencies are now satisfied.
- For any implementation task, read the relevant SRD text in `.references/srd-5.2.1/` and check `UBIQUITOUS_LANGUAGE.md` before editing rules logic.
- For any task that changes reducer behavior, shared algebras, action resources, hole/fill semantics, Surface record boundaries, or runtime package architecture, update the relevant owning docs in the same task. For battle-runtime changes, keep [packages/battle-runtime/README.md](/workspace/typescript/dnd/packages/battle-runtime/README.md) and [packages/battle-runtime/ARCHITECTURE_GRAPH.md](/workspace/typescript/dnd/packages/battle-runtime/ARCHITECTURE_GRAPH.md) aligned. For character-creation changes, keep [packages/character-creation-runtime/README.md](/workspace/typescript/dnd/packages/character-creation-runtime/README.md) and [packages/character-creation-runtime/VOCABULARY.md](/workspace/typescript/dnd/packages/character-creation-runtime/VOCABULARY.md) aligned. For shared algebra changes, update [packages/shared-algebras/README.md](/workspace/typescript/dnd/packages/shared-algebras/README.md) or the relevant package-local MBT docs. Treat `packages/surface-runtime-correction/*` docs as legacy source material unless the task intentionally edits that package.
- For any implementation task, include `/simplify` convergence in the closeout: minimum two rounds unless the changeset is trivial, and continue until no important fixes remain.
- Do not run battle MBT for research-only tasks. Treat battle MBT as scarce; use deterministic unit and projection tests first.
- Ralph task runs must not use fuzz/overnight scripts or MBT tiers above Tier 1/Tier 1b unless a task explicitly requires it.

## DAG / Queue Order

| Order | Task                                                            | Status                                        | Depends on        | Blocks                               | Next action                                                                                                                                                                                                                                                                                          | Handoff readiness                                                             |
| ----- | --------------------------------------------------------------- | --------------------------------------------- | ----------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 0     | CAM0 - Phase 0 Audit Pack                                       | done                                          | none              | CAM1..CAM21                          | Landed audit pack and migration plan updates.                                                                                                                                                                                                                                                        | Done in `e8ecbd6b`.                                                           |
| 1     | CAM1 - Rename Prototype Surface To @dnd/surface                 | done                                          | CAM0              | CAM3, CAM4, CAM5, CAM6, CAM11, CAM16 | Package cutover complete: active imports, workspace dependencies, lockfile, and docs use `@dnd/surface`.                                                                                                                                                                                             | Done in this task.                                                            |
| 2     | CAM2 - Resolve Correction Action-Economy Drift                  | done                                          | CAM0              | CAM6, CAM11                          | Resolved by `52cf18b5`: Surface action resource sidecars and Correction action-resource handling landed.                                                                                                                                                                                             | Done on current `master`.                                                     |
| 3     | CAM3 - Add Generic StatBlockRecord Catalog Boundary             | done                                          | CAM1              | CAM5, CAM11, CAM12                   | Generic `StatBlockRecord`, SRD-only stat-block collection, duplicate/provenance validation, and `buildStatBlockCatalog` landed in `@dnd/surface`.                                                                                                                                                    | Done in this task.                                                            |
| 4     | CAM4 - Add Minimal Character-Creation Surface Records           | done                                          | CAM1              | CAM5, CAM6, CAM7                     | Minimum `ClassRecord`, `BackgroundRecord`, and Orc `SpeciesRecord` Surface shapes/readers landed in `@dnd/surface`.                                                                                                                                                                                  | Done in this task.                                                            |
| 5     | CAM5 - Author First Vertical SRD Surface Content                | done                                          | CAM3, CAM4        | CAM7, CAM9, CAM12, CAM16             | Authored first-vertical SRD Surface records and real SRD Unit/Stat Block collections for composition.                                                                                                                                                                                                | Done in this task.                                                            |
| 6     | CAM6 - Create Character Creation Runtime Skeleton               | done                                          | CAM1, CAM2        | CAM7, CAM8, CAM9, CAM10, CAM17       | Created `@dnd/character-creation-runtime` package with public draft/session/hole/fill/finalization types matching `phase0-runtime-boundary-api.md`.                                                                                                                                                  | Done in this task.                                                            |
| 7     | CAM7 - Implement Creation Hole Discovery For Manifest           | done                                          | CAM5, CAM6        | CAM8, CAM9                           | Hole discovery for the exact Orc Soldier Fighter manifest landed using real Surface records and package-private support gates.                                                                                                                                                                       | Done in this task.                                                            |
| 8     | CAM8 - Implement Atomic Creation Batch Fill                     | done                                          | CAM7              | CAM9, CAM10, CAM17                   | Atomic batch fill landed with revision checks, duplicate/invalid/wrong-kind/unsupported issues, Standard Array validation, and hole rediscovery after accepted fills.                                                                                                                                | Done in this task.                                                            |
| 9     | CAM9 - Finalize Legal Fighter Character Sheet                   | done                                          | CAM5, CAM8        | CAM10, CAM12, CAM17                  | Legal Orc Soldier Fighter `CharacterSheet` finalization landed with legality tests and Second Wind resource preservation.                                                                                                                                                                            | Done in this task.                                                            |
| 10    | CAM10 - Add Character Creation QNT Slice And Parity             | done                                          | CAM9              | CAM17, CAM18                         | Added `character-creation-runtime-slice.qnt` plus deterministic runtime/QNT parity for creation protocol/status behavior: complete Fighter readiness, invalid fills, stale revision, cardinality, and duplicate multi-choice input. Sheet-value parity remains a carry-forward gate before widening. | Done in this task.                                                            |
| 11    | CAM11 - Create Battle Runtime Skeleton                          | done                                          | CAM1, CAM2, CAM3  | CAM12, CAM13, CAM14, CAM15, CAM18    | Created `@dnd/battle-runtime` package with battle state, action resources, subject, hole/fill, resolution, snapshot, and stat-block creature-init types.                                                                                                                                             | Done in this task.                                                            |
| 12    | CAM12 - Start Battle From Character Sheet And Stat Block        | done                                          | CAM5, CAM9, CAM11 | CAM13, CAM18                         | Battle initialization from finalized Character Sheet plus generic `StatBlockRecord` landed with derived AC/HP/loadout/action-resource facts and no Core import.                                                                                                                                      | Done in this task.                                                            |
| 13    | CAM13 - Implement Battle Attack Holes And Replay                | done                                          | CAM12             | CAM14, CAM15, CAM18                  | Implement Attack act discovery and replay-from-root holes for target, attack roll, and damage-result protocol using the action-resource model.                                                                                                                                                       | Done in this task.                                                            |
| 14    | CAM14 - Implement Battle Damage And Zero-HP Policy              | done                                          | CAM13             | CAM15, CAM18                         | Implemented damage application with Temporary HP absorption, HP floor, monster death policy, and Character Sheet zero-HP policy scaffolding.                                                                                                                                                         | Done in this task.                                                            |
| 15    | CAM15 - Implement End Turn And Battle QNT Slice                 | done                                          | CAM14             | CAM18, CAM19                         | Runtime `endTurn`, initiative advancement, `battle-runtime-slice.qnt`, and deterministic QNT/runtime parity checks landed for hit, miss, damage, action spend, and end turn.                                                                                                                         | Done in this task.                                                            |
| 16    | CAM16 - Add MCP Green Composition Root                          | done                                          | CAM1, CAM5        | CAM17, CAM18                         | Added isolated MCP green module/root that installs `srdUnitCollection` and `srdStatBlockCollection` and has no `@dnd/core` imports.                                                                                                                                                                  | Done in this task.                                                            |
| 17    | CAM17 - Add MCP Character Creation Tools                        | ready-for-implementation-after-light-research | CAM10, CAM16      | CAM18                                | Add green MCP tools for create draft, discover holes, fill holes, and finalize minimal Fighter.                                                                                                                                                                                                      | Ready after MCP green character-tool architecture check.                      |
| 18    | CAM18 - Add MCP Battle Tools And Green Fixture                  | blocked                                       | CAM15, CAM17      | CAM19                                | Add green MCP tools for selecting a Stat Block, start battle, discover battle acts, fill/resolve battle holes, end turn, and one full vertical fixture.                                                                                                                                              | Blocker Type: dependency. Blocker Detail: waits on character MCP tools.       |
| 19    | CAM19 - Controlled Core Break And Projected Vocabulary Deletion | blocked                                       | CAM18             | CAM20                                | Isolate/delete old Core-backed green-path imports, delete `CPU*`/`PEA*`/`PPR*` projected vocabulary where unreferenced, and ensure every omitted lane is in the Restore Ledger.                                                                                                                      | Blocker Type: dependency. Blocker Detail: waits on passing MCP green fixture. |
| 20    | CAM20 - Green Reconciliation And MCP Promotion                  | blocked                                       | CAM19             | CAM21                                | Promote the Surface-backed green tools into the normal MCP server path, retire `src/green` as a user-facing namespace, and replace green-specific tests with normal MCP server tests.                                                                                                                | Blocker Type: dependency. Blocker Detail: waits on controlled Core break.     |
| 21    | CAM21 - End-User Vertical Acceptance                            | blocked                                       | CAM20             | none                                 | Verify the promoted user workflow end to end: create character, start battle, add Goblin Warrior, run battle, end battle, and see the character list with post-battle facts such as reduced HP.                                                                                                      | Blocker Type: dependency. Blocker Detail: waits on promoted MCP path.         |

## Task Details

### Task 0 - CAM0 - Phase 0 Audit Pack

Status: `done`

Depends on: none  
Blocks: CAM1..CAM21

Input:

- Correction package docs/code.
- Core package docs/code.
- Project docs and SRD/source-discipline files.
- Owner interview decisions captured in the conversation.

Output:

- [CORRECTION_APPLICATION_MIGRATION_PLAN.md](/workspace/typescript/dnd/plans/CORRECTION_APPLICATION_MIGRATION_PLAN.md)
- [phase1-fighter-manifest.md](/workspace/typescript/dnd/plans/phase1-fighter-manifest.md)
- [phase0-surface-unit-availability.md](/workspace/typescript/dnd/plans/phase0-surface-unit-availability.md)
- [phase0-runtime-boundary-api.md](/workspace/typescript/dnd/plans/phase0-runtime-boundary-api.md)
- [phase0-core-deletion-restore-audit.md](/workspace/typescript/dnd/plans/phase0-core-deletion-restore-audit.md)

Acceptance:

- Phase 0 audit pack is checked in.
- First vertical is fixed as Orc Soldier Fighter 1 with Longsword, Chain Mail, Shield, Defense Fighting Style, and Goblin Warrior.
- Stat Block runtime surface is generic `StatBlockRecord`; SRD is collection/provenance only.
- Prompt/query files are removed; audit artifacts are the source of truth.

Verification:

- `pnpm exec prettier --check plans/CORRECTION_APPLICATION_MIGRATION_PLAN.md plans/phase1-fighter-manifest.md plans/phase0-surface-unit-availability.md plans/phase0-runtime-boundary-api.md plans/phase0-core-deletion-restore-audit.md`

Handoff readiness: complete in `e8ecbd6b`.

### Task 1 - CAM1 - Rename Prototype Surface To @dnd/surface

Status: `done`

Depends on: CAM0  
Blocks: CAM3, CAM4, CAM5, CAM6, CAM11, CAM16

Input:

- [phase0-surface-unit-availability.md](/workspace/typescript/dnd/plans/phase0-surface-unit-availability.md)
- `packages/surface/`
- Workspace package config, path aliases, docs, and imports referencing the former prototype package name.

Output:

- Active package is named `@dnd/surface`.
- Green-path imports and active docs use `@dnd/surface`.
- Historical docs either become explicitly archival or stop naming the prototype package as active.

Acceptance:

- No active package import uses the former prototype package name.
- `pnpm` workspace and TypeScript path references resolve `@dnd/surface`.
- Existing Surface package tests/typecheck still pass or pre-existing failures are recorded.
- Active docs name `@dnd/surface`; historical docs are either updated or explicitly archival.

Verification:

- Verified in this task:
  - Former package-name search across package/workspace/docs scope returned no matches.
  - `pnpm --filter @dnd/surface typecheck`
  - `pnpm --filter @dnd/surface test` is not applicable because the package has no `test` script.
  - `/simplify` convergence completed in two manual rounds after the rename. Round 1 accepted the package cutover with one doc cleanup gap in the root executable projection design doc. Round 2 confirmed the cleanup and found no additional active-doc, import, dependency, or package-path issues.

Plan Impact:

- CAM3, CAM4, and CAM6 are ready for implementation after their required light research.
- CAM11 remains blocked on CAM3.
- CAM16 is ready after CAM5 landed authored collections.
- Downstream package paths should use `packages/surface/`.

### Task 2 - CAM2 - Resolve Correction Action-Economy Drift

Status: `done`

Depends on: CAM0  
Blocks: CAM6, CAM11

Input:

- `packages/surface-runtime-correction/`
- `packages/shared-algebras/`
- `52cf18b5 Merge action resource sidecars`.

Output:

- Correction action-economy test drift is fixed by `52cf18b5`.
- Surface action resource sidecars, restricted Action Surge resource grants, and Correction reducer action-resource handling are available as the current baseline.

Acceptance:

- Correction package typecheck passes at the sidecar baseline.
- Relevant Correction tests pass at the sidecar baseline.
- No new executable IR vocabulary is introduced.

Verification:

- Verified on 2026-04-29:
  - `pnpm --filter @dnd/surface-runtime-correction typecheck`
  - `pnpm --filter @dnd/surface-runtime-correction test`
- Future runtime tasks should rerun those checks after package rename fallout is handled.

Plan Impact:

- CAM6 remains blocked only on CAM1.
- CAM11 remains blocked on CAM1 and CAM3.

### Task 3 - CAM3 - Add Generic StatBlockRecord Catalog Boundary

Status: `done`

Depends on: CAM1  
Blocks: CAM5, CAM11, CAM12

Next action: none; CAM3 is complete.

Input:

- [phase0-surface-unit-availability.md](/workspace/typescript/dnd/plans/phase0-surface-unit-availability.md)
- [phase0-runtime-boundary-api.md](/workspace/typescript/dnd/plans/phase0-runtime-boundary-api.md)
- Current `CreatureStatBlockSchema` / monster Stat Block Surface code.
- `.references/srd-5.2.1/Monsters/Monsters-E-G.md`

Output:

- Generic `StatBlockRecord` type/schema.
- SRD-only `srdStatBlockCollection` boundary with provenance validation.
- `buildStatBlockCatalog` with duplicate-id and mixed-provenance rejection.

Acceptance:

- Runtime/catalog APIs return generic `StatBlockRecord`, not `SrdStatBlockRecord`.
- SRD-specific facts are represented by collection/provenance boundary only.
- Stat Blocks remain separate from `UnitRecord`.
- No Core monster catalog import appears in Surface/stat-block code.
- Surface and migration docs are updated for the generic Stat Block boundary.

Verification:

- `pnpm --filter @dnd/surface typecheck`
- Focused tests for decoding/catalog duplicate id and provenance mismatch.
- `rg 'SrdStatBlockRecord|MonsterUnit|@dnd/core' packages/surface`

Plan Impact:

- CAM5 is unblocked because CAM3 and CAM4 are done.
- CAM11 is unblocked because CAM1, CAM2, and CAM3 are done.

### Task 4 - CAM4 - Add Minimal Character-Creation Surface Records

Status: `done`

Depends on: CAM1  
Blocks: CAM5, CAM6, CAM7

Next action: none; CAM4 is complete.

Input:

- [phase1-fighter-manifest.md](/workspace/typescript/dnd/plans/phase1-fighter-manifest.md)
- [phase0-surface-unit-availability.md](/workspace/typescript/dnd/plans/phase0-surface-unit-availability.md)
- Current `UnitRecord` schema and Surface content shapes.
- Local SRD 5.2.1 class/background/species references cited by the manifest.

Output:

- Minimum `ClassRecord`, `BackgroundRecord`, and `SpeciesRecord` Surface variants or equivalent Surface-owned authored record boundaries.
- Structural readers for Fighter/Soldier/Orc creation facts.

Acceptance:

- Character creation legality facts are authored Surface content, not runtime constants.
- Species aggregate makes mixed-species states unrepresentable for Orc selection.
- Records preserve provenance vs structured input vs runtime projection distinctions.
- `Supported*` gates are not exported from Surface.
- Surface/migration docs are updated for any new record variants and reader boundaries.

Verification:

- Verified in this task:
  - Read `.references/srd-5.2.1/Classes/Fighter.md`, `.references/srd-5.2.1/Character-Origins.md`, `.references/srd-5.2.1/Character-Creation.md`, and `UBIQUITOUS_LANGUAGE.md`.
  - `pnpm --filter @dnd/surface typecheck`
  - `pnpm --filter @dnd/surface test -- character-creation-records.test.ts`
  - `/simplify` convergence completed in two manual rounds. Round 1 accepted the candidate schema direction but removed exported exact Fighter/Soldier support gates and fixed the Soldier SRD equipment bundle. Round 2 confirmed the final readers are structural, no `Supported*` gate is exported from Surface, and Orc trait mixing is rejected at the schema boundary.

Plan Impact:

- CAM5 is unblocked because CAM3 and CAM4 are done.
- CAM7 remains blocked on CAM6; no hole-identity revision is needed yet.

### Task 5 - CAM5 - Author First Vertical SRD Surface Content

Status: `done`

Depends on: CAM3, CAM4  
Blocks: CAM7, CAM9, CAM12, CAM16

Next action: landed first-vertical SRD Surface content and catalog imports.

Input:

- [phase1-fighter-manifest.md](/workspace/typescript/dnd/plans/phase1-fighter-manifest.md)
- Surface record schemas/readers from CAM3/CAM4.
- Local SRD 5.2.1 files cited by the manifest.

Output:

- Minimum SRD authored records for Fighter, Soldier, Orc, Fighter Weapon Mastery grant, Savage Attacker if required for Soldier legality, and Goblin Warrior.
- Real `srdUnitCollection` and `srdStatBlockCollection` imports usable by MCP composition.

Acceptance:

- Manifest facts needed for a fully legal minimum character are backed by Surface content or explicitly draft-owned runtime facts.
- SRD collections reject mixed provenance and duplicate ids.
- Flail/Spear/Longsword mastery choices all avoid adding Vex to the first slice.
- No external rules source is used as provenance.

Verification:

- `pnpm --filter @dnd/surface typecheck`
- Surface decode/catalog tests for the new records.
- `rg '5e-tools|dndbeyond|phb' packages/surface plans/phase1-fighter-manifest.md` to catch provenance drift, allowing only explicit structured-input/archive notes if present.

Plan Impact:

- CAM16 is unblocked because CAM1 and CAM5 are done.
- CAM7 remains blocked on CAM6.
- CAM9 remains blocked on CAM8.
- CAM12 remains blocked on CAM9 and CAM11.

### Task 6 - CAM6 - Create Character Creation Runtime Skeleton

Status: `done`

Depends on: CAM1, CAM2  
Blocks: CAM7, CAM8, CAM9, CAM10, CAM17

Next action: run the runtime package architecture check, then create the character creation runtime skeleton.

Input:

- [phase0-runtime-boundary-api.md](/workspace/typescript/dnd/plans/phase0-runtime-boundary-api.md)
- Correction reducer vocabulary and reusable algebras.
- `@dnd/surface` public APIs after CAM1.

Output:

- New `@dnd/character-creation-runtime` package.
- Public draft/session/hole/fill/finalization types.
- No dependency on `@dnd/core`.

Acceptance:

- Package compiles.
- Public API matches durable draft patch/fill semantics.
- Character runtime exports `CharacterSheet`, not a battle creature-init type.
- No authored content language is introduced inside runtime.
- Migration/runtime docs are updated for the actual package API if it differs from the draft.

Verification:

- `pnpm --filter @dnd/character-creation-runtime typecheck`
- `rg '@dnd/core|CPU|PEA|PPR' packages/character-creation-runtime`

Plan Impact:

- Unblock CAM7 because CAM6 is done.

### Task 7 - CAM7 - Implement Creation Hole Discovery For Manifest

Status: `done`

Depends on: CAM5, CAM6  
Blocks: CAM8, CAM9

Next action: none; CAM7 is complete.

Input:

- `@dnd/character-creation-runtime` skeleton.
- First vertical Surface records/collections.
- Manifest batch fill story.

Output:

- Hole discovery for class, background, species, ability scores, languages, alignment, Fighter skills, Fighting Style, Weapon Mastery choices, equipment/purchase/loadout.

Acceptance:

- Holes are derived from draft + Unit library + package-private support gates.
- Hole ids are stable domain ids, not array positions.
- Discovery uses actual authored Units/records where available.
- No presets.
- Character creation semantics docs stay aligned with the implemented hole identity and discovery rules.

Verification:

- Verified in this task:
  - Read `.references/srd-5.2.1/Classes/Fighter.md`, `.references/srd-5.2.1/Character-Origins.md`, `.references/srd-5.2.1/Character-Creation.md`, `.references/srd-5.2.1/Equipment.md`, and `UBIQUITOUS_LANGUAGE.md`.
  - `pnpm --filter @dnd/character-creation-runtime test`
  - `pnpm --filter @dnd/character-creation-runtime typecheck`
  - `pnpm exec prettier --check packages/character-creation-runtime/README.md packages/character-creation-runtime/package.json packages/character-creation-runtime/src/index.ts packages/character-creation-runtime/src/index.test.ts`
  - `git diff --check`
  - `/simplify` convergence completed in two manual rounds. Round 1 accepted the Surface-derived discovery shape but fixed Soldier background ability-score-increase suppression to use the typed draft field. Round 2 confirmed hole ids remain stable domain ids, support gates stay package-private, and no later batch-fill/finalization behavior was implemented.

Plan Impact:

- Unblock CAM8.

### Task 8 - CAM8 - Implement Atomic Creation Batch Fill

Status: `done`

Depends on: CAM7  
Blocks: CAM9, CAM10, CAM17

Next action: none; CAM8 is complete.

Input:

- Hole discovery implementation.
- Batch semantics in [phase0-runtime-boundary-api.md](/workspace/typescript/dnd/plans/phase0-runtime-boundary-api.md).

Output:

- Accepted/rejected creation batch fill reducer.
- Stale revision, duplicate fill, invalid choice, wrong kind, and unsupported choice issues.

Acceptance:

- Rejected batch leaves draft unchanged and returns all diagnosable issues.
- Accepted batch increments/revises draft and re-derives holes.
- Duplicate fills are rejected unless a hole explicitly accepts multiple values in one fill.
- Character creation semantics docs stay aligned with the implemented atomicity and issue protocol.

Verification:

- Verified in this task:
  - Read `.references/srd-5.2.1/Character-Creation.md` and `UBIQUITOUS_LANGUAGE.md` for Standard Array and character-creation terminology.
  - `pnpm --filter @dnd/character-creation-runtime test`
  - `pnpm --filter @dnd/character-creation-runtime typecheck`
  - `pnpm exec prettier --check packages/character-creation-runtime/README.md packages/character-creation-runtime/src/index.ts packages/character-creation-runtime/src/index.test.ts`
  - `rg '@dnd/core|CPU|PEA|PPR' packages/character-creation-runtime`
  - `git diff --check`
  - `pnpm quality` was attempted and stopped on pre-existing `@dnd/core` Prettier drift outside this task's ownership surface.
  - `/simplify` convergence completed in two manual rounds. Round 1 accepted the candidate reducer shape but fixed Standard Array legality so arbitrary `SixAbilityScores` cannot be recorded as `standardArray`. Round 2 confirmed duplicate-fill, issue-index, support-gate, and accepted-fill replay facts remain localized in the reducer/tests.

Plan Impact:

- Unblocked CAM9 because CAM5 and CAM8 are done.

### Task 9 - CAM9 - Finalize Legal Fighter Character Sheet

Status: `done`

Depends on: CAM5, CAM8  
Blocks: CAM10, CAM12, CAM17

Next action: run the finalization legality and RAW check, then implement legal Fighter sheet finalization.

Input:

- Batch fill runtime.
- Manifest and first vertical Surface records.

Output:

- Finalization to legal `CharacterSheet` for the Orc Soldier Fighter.
- Sheet carries selected Unit refs, advancement exactly one Fighter level, ability scores, HP, proficiencies, equipment/loadout, and class/species/background features needed for legality.

Acceptance:

- Complete manifest fill sequence finalizes.
- Incomplete or illegal draft does not finalize.
- Second Wind is preserved as a sheet/resource fact even though its battle action is out of first battle slice.
- No battle creature-init type is exported from character creation.

Verification:

- Deterministic complete Fighter finalization test.
- Deterministic incomplete/illegal finalization test.
- `pnpm --filter @dnd/character-creation-runtime test`

Plan Impact:

- Unblocked CAM10 because CAM9 is done.
- CAM12 remains blocked on CAM11.
- CAM17 remains blocked on CAM10.

### Task 10 - CAM10 - Add Character Creation QNT Slice And Parity

Status: `done`

Depends on: CAM9  
Blocks: CAM17, CAM18

Next action: complete; character-creation QNT slice and deterministic parity checks landed for first-vertical creation protocol/status behavior. Sheet-value parity, including selected Unit refs, remains a carry-forward gate before widening.

Input:

- Character creation reducer.
- Existing character-creation QNT concepts.
- Manifest and SRD citations.

Output:

- `packages/character-creation-runtime/character-creation-runtime-slice.qnt`
- Parity/MBT or deterministic bridge appropriate for the reducer.

Acceptance:

- QNT models draft state, hole ids, atomic batch fill, rediscovery, and finalization status for the first vertical.
- Shared behavior traces to SRD or documented assumptions.
- Runtime parity test passes for complete Fighter and at least one invalid fill.

Verification:

- Focused Quint typecheck/test for the slice.
- `pnpm --filter @dnd/character-creation-runtime test`
- `pnpm --filter @dnd/character-creation-runtime typecheck`

Plan Impact:

- CAM17 remains blocked on CAM16 only.

### Task 11 - CAM11 - Create Battle Runtime Skeleton

Status: `done`

Depends on: CAM1, CAM2, CAM3  
Blocks: CAM12, CAM13, CAM14, CAM15, CAM18

Input:

- [phase0-runtime-boundary-api.md](/workspace/typescript/dnd/plans/phase0-runtime-boundary-api.md)
- Generic `StatBlockRecord` catalog boundary.
- Correction/shared algebra decisions.

Output:

- New `@dnd/battle-runtime` package.
- Public battle state, creature-init, action-resource state, subject, hole/fill, resolution, and snapshot types.
- No dependency on `@dnd/core` or `@dnd/character-creation-runtime`.

Acceptance:

- Package compiles.
- Battle subjects expose only `attack` and `endTurn` in phase 1.
- Battle state follows the action-resource model from `packages/shared-algebras/src/action-economy-algebra.ts`, not a scalar action quota.
- Fills are not durable `BattleState`.
- Runtime consumes generic `StatBlockRecord`, not SRD-specific record types.
- Battle runtime README/architecture graph are updated if shared action-resource or hole/fill APIs move.

Verification:

- `pnpm --filter @dnd/battle-runtime typecheck`
- `rg '@dnd/core|@dnd/character-creation-runtime|SrdStatBlockRecord|CPU|PEA|PPR' packages/battle-runtime`

Plan Impact:

- CAM12 is unblocked because CAM5, CAM9, and CAM11 are done.

### Task 12 - CAM12 - Start Battle From Character Sheet And Stat Block

Status: `done`

Depends on: CAM5, CAM9, CAM11  
Blocks: CAM13, CAM18

Input:

- Finalized `CharacterSheet`.
- `StatBlockRecord` for Goblin Warrior.
- Battle runtime skeleton.

Output:

- Battle initialization from Character Sheet plus Stat Block.
- Derived combatant state for HP/max HP/Temporary HP, AC, initiative/current actor, action resources, selected loadout, and zero-HP policy.

Acceptance:

- Battle init derives Fighter AC through armor/shield/Defense readers.
- Goblin Warrior AC/HP/initiative facts come from `StatBlockRecord`, not Core catalog.
- Death policy is typed on combatant and resolution does not branch on provenance labels.
- Runtime docs are updated for the actual creature-init and action-resource initialization shape.

Verification:

- Deterministic battle init test for Fighter + Goblin Warrior.
- `pnpm --filter @dnd/battle-runtime test`
- `rg '@dnd/core' packages/battle-runtime`

Plan Impact:

- CAM13 is unblocked.

### Task 13 - CAM13 - Implement Battle Attack Holes And Replay

Status: `done`

Depends on: CAM12  
Blocks: CAM14, CAM15, CAM18

Done in this task.

Input:

- Battle init state.
- Longsword weapon Unit/readers.
- Attack and Attack Roll SRD citations from the manifest.

Output:

- Attack act discovery.
- Replay-from-root target, attack-roll, and weapon damage-result holes.
- Needs-holes/resolved/invalid resolution flow.

Acceptance:

- Attack is available only to current actor with a compatible action resource.
- Hit/miss compares attack roll total to Armor Class.
- Damage hole is named by dice-result protocol and selected weapon damage expression.
- Filled act state is caller/session state, not `BattleState`.
- Battle runtime architecture docs are updated if Attack replay reuses or changes existing hole/fill/action-resource semantics.

Verification:

- Deterministic tests for needs target, needs attack roll, hit, miss, wrong actor, and action spend skeleton.
- `pnpm --filter @dnd/battle-runtime test`

Plan Impact:

- Unblock CAM14.

### Task 14 - CAM14 - Implement Battle Damage And Zero-HP Policy

Status: `done`

Depends on: CAM13  
Blocks: CAM15, CAM18

Input:

- Attack resolution.
- Damage/Temporary HP/0 HP SRD citations and ASSUMPTIONS.md A12.

Output:

- Damage reducer with Temporary HP absorption, HP floor at 0, monster death/defeat, and Character Sheet zero-HP policy scaffolding.

Acceptance:

- Temporary HP absorbs before HP.
- HP does not go below 0.
- Goblin Warrior dies/defeats at 0 HP.
- Character Sheet participant has explicit death-save lifecycle policy even if first golden attack does not exercise it.
- Runtime and migration docs are updated for the actual zero-HP policy boundary.

Verification:

- Deterministic tests for damage to HP, Temporary HP absorption, HP floor, monster defeated at 0, and selected Character Sheet participant at 0 HP policy.
- `pnpm --filter @dnd/battle-runtime test`

Plan Impact:

- CAM15 unblocked.

### Task 15 - CAM15 - Implement End Turn And Battle QNT Slice

Status: `done`

Depends on: CAM14  
Blocks: CAM18, CAM19

Completed after CAM14 damage and zero-HP policy landed.

Input:

- Battle reducer through damage.
- ASSUMPTIONS.md A2 for runtime End Turn.
- Battle QNT plan.

Output:

- Runtime `endTurn`.
- Initiative/current actor advancement.
- `packages/battle-runtime/battle-runtime-slice.qnt`
- Battle runtime parity/MBT and deterministic tests.

Acceptance:

- End Turn is modeled as runtime command, not SRD Action.
- Slice covers initiative/current actor, Attack holes, hit/miss, action spend, damage, Temporary HP, HP clamp, and supported zero-HP policy.
- Existing `battle.qnt` authority relationship is documented as temporary.
- QNT/runtime docs are updated for the final slice scope and authority relationship.

Verification:

- Focused Quint typecheck/test for the battle slice.
- Battle runtime deterministic tests.
- If MBT is added, use Tier 1 protocol only unless task text is updated.

Plan Impact:

- CAM18 remains blocked until CAM17 is done.

### Task 16 - CAM16 - Add MCP Green Composition Root

Status: `done`

Depends on: CAM1, CAM5  
Blocks: CAM17, CAM18

Next action: run the MCP green-root architecture check, then add the isolated green composition root.

Input:

- `@dnd/surface`
- `srdUnitCollection`
- `srdStatBlockCollection`
- MCP server/package structure.

Output:

- Isolated MCP green module/root, for example `packages/mcp/src/green/`.
- Composition root installs Unit library and Stat Block catalog.
- No green file imports or re-exports from Core-backed MCP modules.

Acceptance:

- Green MCP subtree has no `@dnd/core` import.
- Existing Core-backed tools remain legacy-only outside the green path.
- Session storage boundaries exist for drafts, sheets, selected Stat Block, battle state, and transient battle fills.
- MCP/runtime docs are updated for the green composition root and legacy boundary.

Verification:

- `rg '@dnd/core' packages/mcp/src/green packages/character-creation-runtime packages/battle-runtime` returns no matches.
- `pnpm --filter @dnd/mcp typecheck`

Plan Impact:

- CAM17 is unblocked because CAM10 and CAM16 are done.

### Task 17 - CAM17 - Add MCP Character Creation Tools

Status: `ready-for-implementation-after-light-research`

Depends on: CAM10, CAM16  
Blocks: CAM18

Next action: run the MCP green character-tool architecture check, then add green character creation tools.

Preflight:

- CAM17 should not widen battle support. Keep the Core-free green-path boundary
  intact: `@dnd/character-creation-runtime`, `@dnd/battle-runtime`, and
  `packages/mcp/src/green/` must not import `@dnd/core`.
- Use final user-facing tool names inside the temporary Surface-runtime MCP
  registration boundary. Do not prefix tool names with `green_`; isolation comes
  from the module/package boundary until CAM20 promotion, not from user-visible
  vocabulary.

Input:

- Character creation runtime.
- MCP green composition root.

Output:

- Surface-runtime MCP tools for create character draft, discover creation holes, fill creation holes, and finalize minimal Fighter.

Acceptance:

- Tools operate through real creation holes and batch fills.
- Rejected fill leaves stored draft unchanged.
- Finalized sheet is stored only when finalization is ready, keyed by the source
  draft id; the finalized draft is removed from the active draft store.
- No presets and no Core character imports.
- MCP and creation runtime docs are updated for tool names and interaction protocol.

Verification:

- MCP tests for complete Fighter creation and at least one rejected fill.
- MCP test that successful finalization removes the draft from `drafts` and
  stores the sheet in `sheets`.
- `pnpm --filter @dnd/mcp test`
- Source-only Core import check for the Surface-runtime MCP subtree and runtime
  packages.

Plan Impact:

- Unblock CAM18 when CAM15 is done.

### Task 18 - CAM18 - Add MCP Battle Tools And Green Fixture

Status: `blocked`

Depends on: CAM15, CAM17  
Blocks: CAM19

Blocker Type: dependency  
Blocker Detail: waits on character MCP tools.

Preflight:

- Resolve or explicitly scope these carry-forward items before exposing the full
  MCP battle fixture:
  - Add minimal Goblin Warrior Attack support from the authored Stat Block. The
    fixture is not Fighter-attacks-only.
  - Audit battle durable state for stat-block and attack projection facts before
    widening battle support. Prefer identities plus runtime facts that cannot
    drift from Surface catalogs; avoid a second executable stat-block or attack
    IR.
  - Replace deterministic Initiative derivation with caller-supplied Initiative
    scores on `start_battle`. Initiative is required start-battle input, not a
    battle act hole and not `10 + modifier`.
  - Keep target legality scoped. Current discovery is all other combatants,
    acceptable only for the first 1v1 vertical before defeat until range, reach,
    line of effect, defeated-target filtering, and target legality are modeled.
  - Track character-creation QNT parity depth. The current QNT slice checks
    hole/status protocol more deeply than finalized sheet values; before
    widening character creation beyond the first manifest, add parity for
    selected Unit refs, HP/Hit Die derivation, proficiencies, resources, and
    loadout identity.

Input:

- MCP character tools.
- Battle runtime through End Turn.
- MCP green composition root.
- Authored Goblin Warrior Stat Block attacks.

Output:

- Surface-runtime MCP tools for selecting a Stat Block, start battle with
  caller-supplied Initiative scores, discover battle acts, fill/resolve battle
  holes, and end turn.
- Battle runtime support for the Goblin Warrior's authored Attack options from
  `StatBlockRecord`, without introducing a second executable Stat Block IR.
- One full MCP fixture for Orc Soldier Fighter vs Goblin Warrior.

Acceptance:

- Full vertical runs with MCP only: create character, finalize, select Goblin
  Warrior, start battle with explicit Initiative scores, Fighter Attack with
  damage, End Turn, Goblin Warrior Attack with damage.
- MCP green path imports no `@dnd/core`.
- In-progress battle fills are MCP session state, not battle reducer state.
- Optional `resolutionLog` is display-only and non-authoritative.
- MCP, battle runtime, and migration docs are updated with the verified green vertical.

Verification:

- `pnpm --filter @dnd/mcp test`
- `pnpm --filter @dnd/battle-runtime test`
- Source-only Core import check for the Surface-runtime MCP subtree and runtime
  packages.

Plan Impact:

- Unblock CAM19.

### Task 19 - CAM19 - Controlled Core Break And Projected Vocabulary Deletion

Status: `blocked`

Depends on: CAM18  
Blocks: CAM20

Blocker Type: dependency  
Blocker Detail: waits on passing MCP green fixture.

Input:

- Passing MCP green vertical.
- [phase0-core-deletion-restore-audit.md](/workspace/typescript/dnd/plans/phase0-core-deletion-restore-audit.md)
- Restore Ledger in [CORRECTION_APPLICATION_MIGRATION_PLAN.md](/workspace/typescript/dnd/plans/CORRECTION_APPLICATION_MIGRATION_PLAN.md)

Output:

- Old Core-backed MCP routes/tests isolated into a separate deletion-marked
  legacy package.
- `CPU*`, `PEA*`, and `PPR*` projected vocabulary deleted where no longer referenced.
- Expected failures outside green path are ledgered.

Acceptance:

- Green path remains passing.
- No projected executable vocabulary remains on the green path.
- Legacy Core-backed MCP code no longer lives in the promoted `@dnd/mcp`
  Surface-runtime package path; if retained, it lives in a separate
  deletion-marked package such as `@dnd/mcp-core-legacy`.
- Every intentionally broken lane has Restore Ledger coverage with `39f9ab71` references.
- App/Core failures outside green path are expected only when ledgered.
- Docs that still describe projected executable paths are marked archival, updated to the new runtime path, or linked from Restore Ledger rows as preserved history.

Verification:

- Refreshed current-HEAD deletion/isolation inventory for projected/Core MCP
  files before deletion.
- `rg 'CPU|PEA|PPR|projected-executable|projected-compiler|projected-action-bridge|projected-persistent' packages/mcp packages/character-creation-runtime packages/battle-runtime`
- `pnpm --filter @dnd/mcp test`
- Runtime package tests.
- Targeted legacy package/Core tests only if still relevant after isolation.

Plan Impact:

- If successful, unblock CAM20 and update [CORRECTION_APPLICATION_MIGRATION_PLAN.md](/workspace/typescript/dnd/plans/CORRECTION_APPLICATION_MIGRATION_PLAN.md) with actual deletion status and any remaining Restore Ledger rows.

### Task 20 - CAM20 - Green Reconciliation And MCP Promotion

Status: `blocked`

Depends on: CAM19
Blocks: CAM21

Blocker Type: dependency
Blocker Detail: waits on controlled Core break.

Input:

- Passing MCP green vertical.
- CAM19 deletion/isolation results.
- Surface-runtime MCP modules and the deletion-marked legacy MCP package.
- Phase 5 criteria in [CORRECTION_APPLICATION_MIGRATION_PLAN.md](/workspace/typescript/dnd/plans/CORRECTION_APPLICATION_MIGRATION_PLAN.md).

Output:

- Surface-backed tools promoted into the normal MCP server/router entrypoint.
- `packages/mcp/src/green/` deleted or reduced to internal composition helpers with no user-facing green namespace.
- Deletion-marked legacy MCP package removed, or kept only with explicit Restore
  Ledger coverage outside the promoted MCP route.
- Normal MCP server tests replace green-specific fixture-only coverage.

Acceptance:

- The runnable Fighter/Goblin vertical works through the normal MCP server path.
- `packages/mcp/src/server.ts` or its replacement no longer routes the vertical through Core/projected vocabulary.
- No user-facing MCP tool requires importing from `packages/mcp/src/green`.
- `src/green/` is deleted, or remaining files are internal helpers without "green" API naming.
- MCP docs describe the promoted Surface runtime path, not a green path as the active user workflow.
- Restore Ledger still covers omitted behavior that has not been rebuilt.
- Temporary catalog/support-gate language is reconciled: `UnitLibrary` aliases
  and package-private `unsupported*` issue vocabulary are either removed or kept
  only where they remain real domain/runtime concepts.

Verification:

- Normal MCP server tests cover create/finalize character, select Goblin Warrior, start battle, Attack with damage, and End Turn.
- `rg '@dnd/core' packages/mcp/src packages/character-creation-runtime packages/battle-runtime` returns no matches for promoted paths, with any legacy-only matches either deleted or ledgered.
- `rg 'CPU|PEA|PPR|projected-executable|projected-compiler|projected-action-bridge|projected-persistent' packages/mcp packages/character-creation-runtime packages/battle-runtime` returns no promoted-path matches.
- MCP/runtime typecheck and focused runtime tests pass.

Plan Impact:

- If successful, unblock CAM21 and update the migration plan and MCP docs to mark green reconciliation complete and remove temporary green-path wording.

### Task 21 - CAM21 - End-User Vertical Acceptance

Status: `blocked`

Depends on: CAM20
Blocks: none

Blocker Type: dependency
Blocker Detail: waits on promoted MCP path.

Input:

- Promoted normal MCP server path from CAM20.
- Character creation tools, battle tools, and persistence/session state from
  CAM17-CAM20.
- The first vertical: Orc Soldier Fighter 1 and Goblin Warrior.

Output:

- One end-user acceptance fixture or test that exercises the promoted workflow
  through user-facing tools only.
- Character-list/read-model behavior after battle completion, including updated
  durable character facts that changed because of battle.
- MCP/user docs updated with the accepted end-to-end workflow and the supported
  post-battle character state semantics.

Acceptance:

- As a user, I can simulate character creation through the normal MCP path:
  create a draft, discover creation holes, fill them, and finalize the Orc
  Soldier Fighter character.
- As a user, I can start a battle from that finalized character.
- As a user, I can add a Goblin Warrior to the battle from the authored SRD Stat
  Block catalog.
- As a user, I can run the supported battle flow through user-facing commands,
  including discovering battle actions, resolving attacks/damage, ending turns,
  and ending the battle.
- As a user, after the battle ends, I can view my character list and see the
  character with updated post-battle facts, including facts changed by battle
  such as reduced current HP.
- Post-battle facts are not duplicated projections that can drift from the
  authoritative runtime/session state. The character list either reads the
  updated durable state directly or uses a single documented projection from it.
- The accepted workflow does not require importing from `packages/mcp/src/green`
  or any legacy Core/projected execution path.

Verification:

- Normal MCP server acceptance test covers create character, finalize, add Goblin
  Warrior, start battle, run battle actions through battle end, and read the
  post-battle character list with updated HP.
- `pnpm --filter @dnd/mcp test`
- Runtime package tests relevant to any state handoff changed for post-battle
  character facts.
- Source-only checks confirm the promoted path has no legacy Core/projected
  execution dependency and no user-facing `green` namespace dependency.

Plan Impact:

- If successful, mark the Correction Application Migration accepted for the
  first end-user vertical and record any explicitly deferred post-battle facts
  in the Restore Ledger or a follow-up CAM task.

## Deferred Previous Queue

Deferred Detail: owner directed the active queue to move to the Correction Application Migration DAG on 2026-04-29, deferring current ACTIVE_PLAN items.

Deferred groups:

- EPT9-EPT14 and EPT20: old executable-projection tracer-bullet integration, spell fact ownership, and projected Quint split work. These are superseded by deleting the projected vocabulary and building the Correction-backed runtimes.
- EPT16-EPT19: old MCP participant/projection cleanup tasks. Reintroduce only as new CAM restore tasks if they still apply after the green runtime exists.
- CSA5-CSA8, CSB1-CSB11, CSC1-CSC2: broader content-surface widening and convergence tasks. Parked behind the first minimal legal Surface character and battle vertical.
- CSD1-CSD11: already deferred historical whole-core rehaul placeholders; remain deferred.

Do not revive deferred previous-queue tasks by changing their old status. Add a new CAM task or Restore Ledger task if a preserved concern becomes relevant again.
