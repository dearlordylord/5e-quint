# Active Plan

Date: 2026-04-13

This is the single active planning queue.

The previous character-formalization and MCP monster-control batch is complete and no longer belongs in the active queue. This file now tracks the next sequenced architecture batch:

- Monster database Phase 1-2 first;
- spell ownership and generic spell execution surfaces second;
- monster database continuation after the spell boundary lands.

## Batch Objective

Land the next content-architecture staircase without:

- duplicating monster or spell authored facts across core, MCP, app, runtime, or battle layers;
- collapsing provenance, structured input, and runtime projection into one type;
- inventing monster-specific or spell-specific adapter APIs where generic engine facilities should own execution;
- letting monster work become the owner of spell execution semantics;
- letting spell work create a second monster registry or bypass stat-block ownership;
- widening battle or MCP into the canonical owner of authored content.

The coding loop should treat this file as the active queue. Do not start a task whose status is not `ready-for-implementation-after-light-research` or `ready-for-research` unless this file is updated first.

## Status Vocabulary

- `ready-for-research`: A coding agent may pick this up now. The next step is documentation/source/RAW/code research, not implementation unless the research resolves the open decision. Write results back into this file or a task-specific plan, then update the task status.
- `ready-for-implementation-after-light-research`: The task shape is understood, but the coding agent must do the listed RAW or blast-radius check before editing code.
- `blocked`: A dependency or ownership decision must land first.
- `deferred`: Do not pick up unless the batch objective changes.
- `done`: Work completed and verification recorded.

## Ralph Task Index

The Ralph harness reads this machine-readable index for task order and status. Keep it synchronized with task sections whenever task status, order, ID, or title changes.

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 0,
      "id": "MONDB1",
      "status": "ready-for-implementation-after-light-research",
      "title": "Canonical Goblin Tracer Bullet"
    },
    {
      "number": 1,
      "id": "MONDB2",
      "status": "blocked",
      "title": "Second Monster Tracer Bullet"
    },
    {
      "number": 2,
      "id": "SPELL1",
      "status": "blocked",
      "title": "Freeze Spell Ownership Surface"
    },
    {
      "number": 3,
      "id": "SPELL2a",
      "status": "blocked",
      "title": "Canonical Spell Records And Identity Projection"
    },
    {
      "number": 4,
      "id": "SPELL2b",
      "status": "blocked",
      "title": "Battle Spell Projection For One Generic Spell Family"
    },
    {
      "number": 5,
      "id": "MONDB3",
      "status": "blocked",
      "title": "Advanced Monster Pattern Tracer Bullet"
    },
    {
      "number": 6,
      "id": "MONDB4a",
      "status": "blocked",
      "title": "Freeze Dataset Expansion Scope"
    }
  ]
}
-->

## Coding Loop Handoff Rules

- Start with the highest-priority task in the DAG table whose status is `ready-for-implementation-after-light-research` or `ready-for-research`.
- Treat the task loop as bidirectional: the plan scopes the task, and task discoveries may update the plan.
- Keep `Ralph Task Index` synchronized with task sections when changing task order, ID, title, or status. The Ralph harness treats that JSON block as the machine-readable control surface.
- Every task closeout must include `Plan Impact`:
  - `Status: none` when no future planning changes are needed;
  - `Status: update-required` or `Status: applied` when the task changes downstream assumptions, status, dependencies, ordering, blockers, acceptance criteria, verification, or creates follow-up work.
- When `Plan Impact` is not `none`, update this file in the same task closeout before continuing. Record affected task IDs and the concrete planning action for each: unblock, block, defer, revise, add, or no-change.
- Only add durable planning facts to this file. Attempt-specific failure notes, parser mistakes, or "next attempt must..." reminders belong in run-local review/decider artifacts, not here.
- Before editing this file during a task closeout, answer a new-information gate in the closeout: what new fact was learned, why it was not already implied by the current plan text, and why it is durable enough to keep after run-local artifacts are deleted. If that gate is weak, leave the plan unchanged.
- Update the task status before ending the loop:
  - `done` if implementation/research and verification are complete;
  - `ready-for-implementation-after-light-research` if research made it implementable;
  - `blocked` if a required ownership/API decision is still unresolved;
  - `deferred` if research shows the task should not be in the current batch.
- When a task is marked `done` or `deferred`, inspect every task listed in its `Blocks` column. If all dependencies for a blocked task are now satisfied, update that task from `blocked` to `ready-for-research` or `ready-for-implementation-after-light-research`, and update its `Next action` / `Handoff readiness` if needed.
- For any implementation task, read the relevant SRD text in `.references/srd-5.2.1/` and check `UBIQUITOUS_LANGUAGE.md` before editing code.
- For any task that changes modeled D&D rule semantics, make the RAW/ASSUMPTIONS decision in Quint first, then update XState/TS/MCP to match. Adapter-only tasks and documentation-only tasks are exempt.
- For any implementation task, include `/simplify` convergence in the task closeout: minimum two rounds unless the changeset is trivial, and continue until no important fixes remain.
- Do not run battle MBT for research-only tasks.
- Treat battle MBT as scarce for implementation tasks too. Use deterministic unit and projection tests first, and only run the narrowest relevant MBT tier once the code change is complete.
- If broader lint/typecheck/test verification surfaces known pre-existing failures outside the touched ownership surface, record that baseline noise and stop. Do not widen the task into repo-wide cleanup; unrelated cleanup belongs in a separate task or sidecar investigation.

## DAG / Queue Order

| Order | Task | Status | Depends on | Blocks | Next action | Handoff readiness |
| ----- | ---- | ------ | ---------- | ------ | ----------- | ----------------- |
| 0 | MONDB1 - Canonical Goblin Tracer Bullet | ready-for-implementation-after-light-research | none | MONDB2 | Read `PRD_MONSTER_DATABASE.md`, `plans/monster-database-plan.md`, `ARCHITECTURE.md`, `UBIQUITOUS_LANGUAGE.md`, and the local SRD goblin text. Then replace the current goblin-oriented shortcuts with the canonical `StatBlock` authored-section model while preserving existing goblin battle and MCP behavior. | Ready now. The ownership direction, provenance rules, and Phase 1 acceptance criteria are already stable enough for implementation. |
| 1 | MONDB2 - Second Monster Tracer Bullet | blocked | MONDB1 | SPELL1 | After MONDB1 lands, add one materially different SRD monster through the same `StatBlock` and projection path. Prefer a non-spellcasting monster or keep any spellcasting section reference-only/text-only so this task does not preempt spell ownership. | Blocked only by the need to prove the canonical `StatBlock` seam on goblins first. |
| 2 | SPELL1 - Freeze Spell Ownership Surface | blocked | MONDB2 | SPELL2a | Inventory the current spell owners across core/features/battle/MCP, then freeze the canonical authored spell record, spell identity/provenance rules, and the exact boundary between spell-authored data, spell projection, and battle-owned spell resolution. | Sequentially next after MONDB2. This should start with repo/source research, not implementation. |
| 3 | SPELL2a - Canonical Spell Records And Identity Projection | blocked | SPELL1 | SPELL2b | Implement the frozen spell-owned record, spell identity/provenance shape, and the one-way projection layer that lets characters and monsters reference canonical spells without owning spell execution semantics. | Blocked on SPELL1 because the spell-content owner and projection seam must be explicit before code changes start. |
| 4 | SPELL2b - Battle Spell Projection For One Generic Spell Family | blocked | SPELL2a | MONDB3 | Implement one battle-facing generic spell projection slice on top of canonical spell records. Start with one family such as save spells or concentration spells; do not widen to every `BATTLE_CAST_*` surface at once. | Blocked on SPELL2a because battle should consume a settled spell identity/projection seam rather than inventing one inline. |
| 5 | MONDB3 - Advanced Monster Pattern Tracer Bullet | blocked | SPELL2b | MONDB4a | Return to the monster database once one canonical spell/battle spell family path exists. Add one advanced repeated monster pattern such as recharge, legendary actions, stronger multiattack, or monster spellcasting through generic facilities rather than monster-specific handlers. | Blocked on SPELL2b because advanced monster continuation should consume the canonical spell/generic execution surfaces rather than inventing temporary ones. |
| 6 | MONDB4a - Freeze Dataset Expansion Scope | blocked | MONDB3 | none | After the advanced tracer bullet lands, freeze the next SRD monster dataset slice, batching strategy, and unsupported-pattern report shape before opening implementation tasks for bulk expansion. | Blocked on MONDB3 because dataset expansion should be decomposed only after the reusable schema and facility set are proven. |

## Current Integrated Baseline

Already wired on `master` / `integration` and relevant to this batch:

- `battle.qnt` remains the authoritative combat boundary.
- Monster control and legendary action MCP surfaces already exist and consume core-owned monster data through generic battle-facing routes rather than adapter-owned monster registries.
- `packages/core/src/monster-types.ts`, `packages/core/src/monster-catalog.ts`, and `packages/core/src/monster-catalog.md` already provide the starting point for the monster catalog, but the current shape is intentionally narrow and still too goblin-specific for durable SRD dataset growth.
- `CONTENT_ARCHITECTURE_ROADMAP.md` already establishes the intended sequence after the completed character batch:
  - monsters first;
  - spells second;
  - monster continuation after the spell boundary exists.
- `plans/monster-database-plan.md` already contains the durable phase structure for Monster DB phases 1-4.
- `MCP_EVENT_SURFACE_AUDIT.md` already identifies generic battle spell surfaces as blocked on a canonical spell-content owner and battle-owned multi-phase spell resolution boundary.

Current architecture decisions for this batch:

- `StatBlock` is the canonical monster-authored record.
- SRD is provenance for shipped SRD monsters; 5e-tools may inform normalization but is never provenance.
- Monster-authored sections should be modeled explicitly as typed authored data.
- The type shape must distinguish executable abilities from text-only unsupported abilities structurally.
- Runtime battle state is a one-way projection from authored monster or spell records.
- Monster work may reference spell identities and authored spellcasting prose, but it must not become the owner of spell execution semantics.
- Spell work must first define canonical spell records and identity projection, then one narrow battle spell family slice, before advanced monster continuation depends on them.

Planning note:

- The completed character-formalization and MCP monster-control work is intentionally removed from the active queue. Use git history and the supporting PRDs for context when needed; do not re-open that finished batch here.

## Task Selection Guidance

Recommended next coding-loop task:

1. `MONDB1 - Canonical Goblin Tracer Bullet`

Do not skip ahead to spell execution or advanced monster facilities before the canonical goblin tracer bullet lands. The current sequence is deliberate:

1. prove the canonical stat-block owner on the narrowest monster slice;
2. prove the schema on a second monster without preempting spell ownership;
3. freeze the spell-content owner;
4. implement canonical spell identity/projection;
5. implement one battle spell family on top of that projection;
6. resume advanced monster continuation on top of that settled spell boundary.

## Recommended Coding Loop

1. Start with [PRD_MONSTER_DATABASE.md](../PRD_MONSTER_DATABASE.md), [plans/monster-database-plan.md](./monster-database-plan.md), [ARCHITECTURE.md](../ARCHITECTURE.md), and [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).
2. For monster implementation tasks, read the relevant SRD monster text in `.references/srd-5.2.1/Monsters/` before editing code.
3. Keep monster spellcasting sections reference-only or text-only until `SPELL1`, `SPELL2a`, and the relevant `SPELL2b` slice land.
4. For spell planning and implementation tasks, use [MCP_EVENT_SURFACE_AUDIT.md](./MCP_EVENT_SURFACE_AUDIT.md) as the public-surface dependency ledger, not as the spell-content owner.
5. Treat `SPELL2a` and `SPELL2b` as separate coding loops. Do not merge canonical spell identity work and battle spell family work into one unbounded task unless this plan is updated first.
6. Keep future verification narrow and ownership-focused; do not widen MONDB or SPELL tasks into repo-wide cleanup.

## Task Bodies

### Task 0 - MONDB1 - Canonical Goblin Tracer Bullet

Status: `ready-for-implementation-after-light-research`

Depends on: none

Blocks: `MONDB2`

Scope:

- Replace the current goblin-oriented stat-block shortcuts with the canonical `StatBlock` authored-section shape described in [PRD_MONSTER_DATABASE.md](../PRD_MONSTER_DATABASE.md) and [plans/monster-database-plan.md](./monster-database-plan.md).
- Keep the owned collection in `packages/core`; do not create a second monster registry in MCP, app, or runtime code.
- Add explicit SRD provenance to the goblin-owned records.
- Model authored sections explicitly enough to distinguish executable entries from text-only unsupported entries structurally.
- Preserve existing goblin battle and MCP behavior through the same public surfaces.
- Do not widen this task into spell execution ownership, importer pipelines, or full-dataset expansion.

Next action:

- Perform the light RAW/blast-radius pass, then implement Phase 1.

Research note:

- The phase and acceptance criteria already exist in [plans/monster-database-plan.md](./monster-database-plan.md).
- The goblin tracer bullet should prove vocabulary, provenance, and projection, not advanced execution support.
- If goblin spellcasting or advanced facility pressure appears, stop at the reference/text boundary and leave that work for later tasks.

Verification requirements:

- Confirm the modeled goblin rules and provenance trace to the local SRD corpus.
- Run task-scoped TypeScript tests for the monster catalog, projection, battle, and MCP paths touched by the migration.
- Include `/simplify` convergence, minimum two rounds.
- If battle behavior changed, run only the narrowest relevant verification surface after deterministic tests are green.

### Task 1 - MONDB2 - Second Monster Tracer Bullet

Status: `blocked`

Depends on: `MONDB1`

Blocks: `SPELL1`

Scope:

- Add one non-goblin SRD monster that proves the canonical `StatBlock` shape works beyond the goblin slice.
- Reuse the same owned record and projection path established in `MONDB1`.
- Prefer a monster that exercises a materially different authored-section shape without forcing spell ownership decisions.
- Preserve unsupported abilities as text-only structured data with explicit reasons instead of dropping them.

Next action:

- Unblock after `MONDB1`, then choose the concrete second monster using the now-landed schema.

Research note:

- This task should not define a second spell schema.
- If the chosen monster includes spellcasting, keep that section reference-only/text-only unless `SPELL1`, `SPELL2a`, and the relevant `SPELL2b` slice are pulled forward by an explicit plan update.

Verification requirements:

- Confirm the added monster cites SRD provenance directly on the owned record.
- Verify the monster reaches battle/MCP through the same projection path as goblins.
- Include `/simplify` convergence, minimum two rounds.

### Task 2 - SPELL1 - Freeze Spell Ownership Surface

Status: `blocked`

Depends on: `MONDB2`

Blocks: `SPELL2a`

Scope:

- Freeze the canonical spell-authored record and spell-ownership seam before implementation.
- Inventory where spell identity, metadata, execution semantics, and public battle spell payloads currently live across core, features, battle, and MCP.
- Define the lasting boundary between:
  - authored spell records;
  - spell references used by monsters or characters;
  - battle-owned multi-phase spell resolution;
  - MCP/public input contracts.

Next action:

- After `MONDB2`, write the frozen ownership surface back into this file or a task-specific plan artifact, then update status.

Research note:

- `MCP_EVENT_SURFACE_AUDIT.md` already names the blocked public spell surfaces and why they are blocked.
- The missing piece is the spell-content owner and the spell-to-battle projection contract, not another MCP-specific schema.

Verification requirements:

- Confirm the frozen ownership surface is specific enough that `SPELL2a` can implement it without reopening task scope.
- Confirm the frozen seam prevents monster work from becoming the spell-content owner.

### Task 3 - SPELL2a - Canonical Spell Records And Identity Projection

Status: `blocked`

Depends on: `SPELL1`

Blocks: `SPELL2b`

Scope:

- Implement the canonical spell-owned record and the one-way identity/projection boundary used by character and monster authored content.
- Keep spell identity, provenance, and authored metadata on the spell side.
- Define the minimum projection contract that lets downstream layers reference canonical spells without restating spell facts.
- Do not implement full battle spell resolution in this task.
- Do not expose raw internal event payloads as MCP schemas.

Next action:

- Unblock after `SPELL1`, then implement the frozen spell-owned boundary and identity projection layer.

Research note:

- This task should make spell identity referenceable from monsters, characters, and later battle spell-family projections.
- It should not widen into full content ingestion, app UX redesign, battle event ownership, or adapter-owned spell registries.

Verification requirements:

- Confirm all modeled rules trace to the local SRD corpus plus the repo's ubiquitous language.
- Run the narrowest relevant core tests for the touched spell/projection paths.
- Include `/simplify` convergence, minimum two rounds.

### Task 4 - SPELL2b - Battle Spell Projection For One Generic Spell Family

Status: `blocked`

Depends on: `SPELL2a`

Blocks: `MONDB3`

Scope:

- Implement one battle-facing generic spell family on top of canonical spell records and identity projection.
- Pick one bounded family, such as save spells or concentration spells, and define the projection contract from canonical spell records into battle-owned resolution inputs.
- Keep save/DC/damage loops, counterspell windows, concentration transitions, and per-target resolution battle-owned.
- Do not widen this task to every battle spell family or all `BATTLE_CAST_*` surfaces at once.

Next action:

- Unblock after `SPELL2a`, then choose the smallest spell family that proves the reusable battle projection path.

Research note:

- This task should directly support one future generic battle spell surface without forcing the entire spell system to land in one change.
- Public MCP schemas should still remain narrow and derived from the battle-owned spell family boundary.

Verification requirements:

- Confirm the chosen spell family routes through a reusable generic projection path from canonical spell records into battle-owned semantics.
- Run the narrowest relevant core/battle/MCP tests for the touched spell family path.
- Include `/simplify` convergence, minimum two rounds.

### Task 5 - MONDB3 - Advanced Monster Pattern Tracer Bullet

Status: `blocked`

Depends on: `SPELL2b`

Blocks: `MONDB4a`

Scope:

- Return to monster continuation once spell ownership exists.
- Add one advanced repeated monster pattern through a generic engine facility rather than a monster-specific handler.
- Candidate patterns include recharge, legendary actions, stronger multiattack shapes, or monster spellcasting that now targets the canonical spell boundary.

Next action:

- Unblock after `SPELL2b`, then choose the smallest advanced pattern that proves the reusable facility.

Research note:

- The point of this task is not merely another monster record. It is to prove one durable advanced facility over canonical authored sections.

Verification requirements:

- Confirm the chosen advanced pattern routes through a reusable generic facility.
- Verify public battle and MCP surfaces remain generic after the tracer bullet lands.
- Include `/simplify` convergence, minimum two rounds.

### Task 6 - MONDB4a - Freeze Dataset Expansion Scope

Status: `blocked`

Depends on: `MONDB3`

Blocks: none

Scope:

- Freeze the next SRD dataset expansion slice before bulk implementation starts.
- Choose the initial dataset batch size, the batching strategy for follow-on monster additions, and the unsupported-pattern audit/report shape.
- Convert the old monolithic dataset-expansion phase into explicit future implementation tasks once the scope is frozen.

Next action:

- Unblock after `MONDB3`, then write the frozen dataset-expansion scope back into this file and add the concrete child implementation tasks.

Research note:

- This task exists to keep the queue implementation-sized. Do not treat the full dataset expansion as one coding-loop task.

Verification requirements:

- Confirm the frozen dataset slice and batching strategy are specific enough to open concrete implementation tasks without reopening monster ownership decisions.
- Confirm the unsupported-pattern report shape is explicit enough to guide later generic-facility work.
