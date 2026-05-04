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
      "id": "PBA15A0",
      "status": "ready-for-implementation-after-light-research",
      "title": "Normalize Character Progression And Multiclass Algebra"
    },
    {
      "number": 62,
      "id": "PBA15A",
      "status": "blocked",
      "title": "Migrate Surface And Character-Creation Domain Primitives"
    },
    {
      "number": 63,
      "id": "PBA16",
      "status": "blocked",
      "title": "Add Death-Save Promoted MBT Coverage"
    },
    {
      "number": 64,
      "id": "PBA17",
      "status": "blocked",
      "title": "Restore Nonlethal Knockout And Zero-HP Handoff Width"
    },
    {
      "number": 65,
      "id": "PBA18",
      "status": "blocked",
      "title": "Widen Attack Range And Conditional Attack Riders"
    },
    {
      "number": 66,
      "id": "PBA19",
      "status": "blocked",
      "title": "Restore Stat Block Multiattack And Bonus Actions"
    },
    {
      "number": 67,
      "id": "PBA20",
      "status": "blocked",
      "title": "Restore Spell Targeting And Catalog Width"
    },
    {
      "number": 68,
      "id": "PBA21",
      "status": "blocked",
      "title": "Broaden Reaction Windows And Bonus-Action Subjects"
    },
    {
      "number": 69,
      "id": "PBA22",
      "status": "blocked",
      "title": "Stabilize Battle Snapshots Traces And App UI"
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
- Do not run battle MBT for research-only tasks. Use the smallest MBT tier that
  actually validates a completed behavior change.
- Implementation closeout must include `/simplify` convergence: minimum two
  rounds unless the changeset is trivial.

## DAG / Queue Order

| Order | Task | Status | Depends on | Blocks | Research / plan | Next action |
| ----- | ---- | ------ | ---------- | ------ | --------------- | ----------- |
| 61 | PBA15A0 - Normalize Character Progression And Multiclass Algebra | ready-for-implementation-after-light-research | PBA15 | PBA15A | inline below | Finish progression normalization and shared multiclass prerequisite algebra integration. |
| 62 | PBA15A - Migrate Surface And Character-Creation Domain Primitives | blocked | PBA15A0 | PBA16 | [research plan](/workspace/typescript/dnd/plans/pba15a-domain-primitives-research-plan.md) | Migrate remaining durable Surface and character-creation primitive domain values after PBA15A0. |
| 63 | PBA16 - Add Death-Save Promoted MBT Coverage | blocked | PBA15A | PBA17 | [research plan](/workspace/typescript/dnd/plans/pba16-death-save-promoted-mbt-research-plan.md) | Add narrow promoted battle-runtime MBT/QNT coverage for Death Saving Throw holes. |
| 64 | PBA17 - Restore Nonlethal Knockout And Zero-HP Handoff Width | blocked | PBA16 | PBA18 | [research plan](/workspace/typescript/dnd/plans/pba17-knockout-zero-hp-handoff-research-plan.md) | Restore Knock Out and remaining durable zero-HP/dead/Stable/rest handoff width. |
| 65 | PBA18 - Widen Attack Range And Conditional Attack Riders | blocked | PBA17 | PBA19 | [research plan](/workspace/typescript/dnd/plans/pba18-attack-range-riders-research-plan.md) | Restore long-range Disadvantage and supported conditional attack riders. |
| 66 | PBA19 - Restore Stat Block Multiattack And Bonus Actions | blocked | PBA18 | PBA20 | [research plan](/workspace/typescript/dnd/plans/pba19-stat-block-multiattack-bonus-actions-research-plan.md) | Restore Stat Block Multiattack and Bonus Action procedure families. |
| 67 | PBA20 - Restore Spell Targeting And Catalog Width | blocked | PBA19 | PBA21 | [research plan](/workspace/typescript/dnd/plans/pba20-spell-targeting-catalog-width-research-plan.md) | Restore Magic Missile split-target replay and broaden spell procedure pressure. |
| 68 | PBA21 - Broaden Reaction Windows And Bonus-Action Subjects | blocked | PBA20 | PBA22 | [research plan](/workspace/typescript/dnd/plans/pba21-reaction-bonus-action-width-research-plan.md) | Broaden reaction windows and Bonus Action subjects after spell targeting width. |
| 69 | PBA22 - Stabilize Battle Snapshots Traces And App UI | blocked | PBA21 | future tasks | [research plan](/workspace/typescript/dnd/plans/pba22-snapshots-traces-app-ui-research-plan.md) | Restore promoted snapshot/trace contracts and app battle UI workflows. |

## Task Details

### Task 61 - PBA15A0 - Normalize Character Progression And Multiclass Algebra

Status: `ready-for-implementation-after-light-research`

Depends on: PBA15
Blocks: PBA15A

Next action: finish the in-progress character progression normalization and
multiclass prerequisite extraction, then wire both into promoted
`@dnd/character-creation-runtime` and MCP.

Context:

- Current character-creation state duplicates starting class as
  `selections.primaryClass` and
  `selections.advancement.entries[0].classUnitId`.
- Advancement entries also store `level`, even though level is derivable from
  ordered progression.
- Target shape: `startingClass` plus post-start `advancements`; level 1 is
  implicit from `startingClass`; total level is `1 + advancements.length`;
  per-class levels derive by counting starting and later classes.
- In-progress handoff files exist:
  - `packages/shared-algebras/src/multiclass-prerequisite-algebra.ts`
  - `packages/shared-algebras/src/multiclass-prerequisite-algebra.test.ts`
  - `packages/shared-algebras/proofs/multiclass-prerequisite-algebra.qnt`
  - `packages/core/src/features/class-tables.ts`
  - `packages/character-creation-runtime/src/normalized-algebra.ts`
- Keep the algebra Surface-free. If runtime inputs still use Surface Unit ids
  such as `class_fighter`, add one explicit boundary adapter between Unit ids
  and class names.

Implementation suggestions:

- `@dnd/shared-algebras/multiclass-prerequisite-algebra` can own the
  prerequisite table, focused TS tests, and small Quint proof.
- Core can retain compatibility wrappers only; it should not own a duplicate
  prerequisite table.
- `@dnd/character-creation-runtime` can model progression as:

  ```ts
  type CharacterProgression = {
    readonly startingClass: ClassName;
    readonly advancements: readonly ClassName[];
  };
  ```

- Runtime helpers can derive total level and class-level summaries from
  progression. A stored post-start advancement `level` should not sit beside
  position-derived level.
- Discovery, fill reduction, support gates, finalization, QNT slice/MBT bridge,
  MCP schemas/tests, README, and vocabulary docs should use the progression
  model or derive legacy labels only at boundaries.

Acceptance:

- Promoted character creation cannot represent `primaryClass: Fighter` with a
  first advancement for Wizard.
- Promoted character creation cannot represent a post-start advancement with a
  contradictory stored level.
- Supported current workflows remain available: Orc Soldier Fighter 1, Orc
  Soldier Fighter 2, Orc Soldier Wizard 1, and existing MCP creation/battle
  handoff verticals.
- Multiclass prerequisite checks are canonical outside Core and used by all TS
  replay paths that validate multiclass entry.
- Character-creation-runtime and MCP no longer expose "choose level 1" as a RAW
  creation step after choosing a starting class.

Verification:

- RAW/UL check for class creation, level advancement, and multiclass
  prerequisite wording.
- `pnpm --filter @dnd/shared-algebras typecheck`
- `pnpm --filter @dnd/shared-algebras test`
- `pnpm exec quint test --match "mc_" packages/shared-algebras/proofs/multiclass-prerequisite-algebra.qnt`
- `pnpm --filter @dnd/character-creation-runtime typecheck`
- `pnpm --filter @dnd/character-creation-runtime test`
- `pnpm --filter @dnd/mcp typecheck`
- `pnpm --filter @dnd/mcp test`
- Focused Core tests only if Core compatibility wrappers or legacy replay tests
  are touched.
- No battle MBT unless battle-runtime mappings change.
- `/simplify` convergence, minimum two rounds.

Plan Impact: if successful, unblock PBA15A.

### Task 62 - PBA15A - Migrate Surface And Character-Creation Domain Primitives

Status: `blocked`

Depends on: PBA15A0
Blocks: PBA16

Research plan:
[pba15a-domain-primitives-research-plan.md](/workspace/typescript/dnd/plans/pba15a-domain-primitives-research-plan.md)

Next action: migrate remaining durable Surface-authored and
character-creation-runtime primitive domain values after PBA15A0 leaves
progression and multiclass prerequisite facts in their durable owners.

Acceptance summary: changed Surface and character-creation production types no
longer use bare primitives for durable domain values when an owned type or
literal union should carry meaning.

Verification summary: source primitive inventory, focused Surface and
character-creation typechecks/tests, no battle MBT unless promoted battle
runtime mappings change, `/simplify` convergence.

Plan Impact: if successful, unblock PBA16.

### Task 63 - PBA16 - Add Death-Save Promoted MBT Coverage

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

### Task 64 - PBA17 - Restore Nonlethal Knockout And Zero-HP Handoff Width

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

### Task 65 - PBA18 - Widen Attack Range And Conditional Attack Riders

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

### Task 66 - PBA19 - Restore Stat Block Multiattack And Bonus Actions

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

### Task 67 - PBA20 - Restore Spell Targeting And Catalog Width

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

### Task 68 - PBA21 - Broaden Reaction Windows And Bonus-Action Subjects

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

### Task 69 - PBA22 - Stabilize Battle Snapshots Traces And App UI

Status: `blocked`

Depends on: PBA21
Blocks: future tasks

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

Plan Impact: if successful, append the next active queue or record an explicit
owner decision that no further active work is desired.
