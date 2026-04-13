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
      "status": "done",
      "title": "Canonical Goblin Tracer Bullet"
    },
    {
      "number": 1,
      "id": "MONDB1a",
      "status": "done",
      "title": "Battle Participation Semantics And Goblin Add Flow"
    },
    {
      "number": 2,
      "id": "MONDB2",
      "status": "done",
      "title": "Second Monster Tracer Bullet"
    },
    {
      "number": 3,
      "id": "SPELL1",
      "status": "done",
      "title": "Freeze Spell Ownership Surface"
    },
    {
      "number": 4,
      "id": "SPELL2a",
      "status": "done",
      "title": "Canonical Spell Records And Identity Projection"
    },
    {
      "number": 5,
      "id": "SPELL2b",
      "status": "ready-for-implementation-after-light-research",
      "title": "Battle Spell Projection For One Generic Spell Family"
    },
    {
      "number": 6,
      "id": "MONDB3",
      "status": "blocked",
      "title": "Advanced Monster Pattern Tracer Bullet"
    },
    {
      "number": 7,
      "id": "MONDB4a",
      "status": "blocked",
      "title": "Freeze Dataset Expansion Scope"
    },
    {
      "number": 8,
      "id": "CHAREDIT1",
      "status": "deferred",
      "title": "Mandatory Character Draft Update Preview"
    },
    {
      "number": 9,
      "id": "CHARMCP1",
      "status": "deferred",
      "title": "Stored Character MCP Surface"
    },
    {
      "number": 10,
      "id": "CHAROWN1",
      "status": "deferred",
      "title": "Character Ownership Gap Cleanup"
    },
    {
      "number": 11,
      "id": "CHAROWN2",
      "status": "deferred",
      "title": "Fighting Style Authored Ownership"
    },
    {
      "number": 12,
      "id": "CHARAUTH1",
      "status": "deferred",
      "title": "Character Quint Authority Convergence"
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

| Order | Task                                                           | Status                                        | Depends on         | Blocks    | Next action                                                                                                                                                                                                                                                                                                                                                             | Handoff readiness                                                                                                                                                          |
| ----- | -------------------------------------------------------------- | --------------------------------------------- | ------------------ | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | MONDB1 - Canonical Goblin Tracer Bullet                        | done                                          | none               | MONDB1a   | Landed on `integration`: goblin stock-weapon projection now reuses the shared SRD equipment weapon table, keeping one source of weapon identity while preserving existing goblin battle and MCP behavior.                                                                                                                                                               | Complete. Goblin stat blocks remain SRD-backed authored `StatBlock` data and deterministic verification is green.                                                          |
| 1     | MONDB1a - Battle Participation Semantics And Goblin Add Flow   | done                                          | MONDB1             | MONDB2    | Landed on `integration`: battle-participation wording is now explicit across the documented `BATTLE_INIT` / `BATTLE_ADD_CREATURE` surfaces, and deterministic regressions cover one initial goblin projection and one mid-battle goblin projection.                                                                                                                     | Complete. Goblins are now regression-covered through the same generic projection semantics at battle init and mid-battle add time.                                         |
| 2     | MONDB2 - Second Monster Tracer Bullet                          | done                                          | MONDB1a            | SPELL1    | Landed on `integration`: `Harpy` now serves as the task-owned non-goblin tracer bullet in this batch, preserving `Luring Song` as explicit text-authored unsupported data while `Claw` projects through the same generic stat-block, battle-init, and battle-add paths used by goblins.                                                                                 | Complete. A materially different non-spellcasting monster now proves the shared `StatBlock` and MCP/battle projection seam without pulling spell ownership forward.         |
| 3     | SPELL1 - Freeze Spell Ownership Surface                        | done                                          | MONDB2             | SPELL2a   | Landed on `integration`: [SPELL1_SPELL_OWNERSHIP_SURFACE.md](./SPELL1_SPELL_OWNERSHIP_SURFACE.md) now freezes the canonical spell owner, canonical `SpellId` identity, provenance/supporting-input split, and the exact authored-reference/battle/MCP boundary for the spell stack.                                                                                    | Complete. `SPELL2a` can now implement one canonical spell-owned record and one-way projection layer without reopening ownership or identity scope.                          |
| 4     | SPELL2a - Canonical Spell Records And Identity Projection      | done                                          | SPELL1             | SPELL2b   | Landed on `integration`: canonical spell records now own `SpellId`, SRD provenance, and spell-authored mechanics/projection hooks in `packages/core/src/features/spell-registry.ts`, while character summaries, monster spell references, and current battle payload builders consume those records without restating authored spell facts.                                | Complete. Spell identity/provenance now lives on the spell side, and downstream layers reference the same canonical `SpellId` seam rather than parallel name-based spell owners. |
| 5     | SPELL2b - Battle Spell Projection For One Generic Spell Family | ready-for-implementation-after-light-research | SPELL2a            | MONDB3    | Start with the save-spell family already modeled in the canonical registry (`burning_hands`, `fireball`, `hold_person`) and route one reusable battle spell path through the record-owned `modeling` / `toBattleReadyablePayload` projection seam rather than battle-local lookup tables.                                                                             | Ready after a light pass over the remaining battle spell entry points so the first generic family consumes the new canonical registry seam consistently end to end.         |
| 6     | MONDB3 - Advanced Monster Pattern Tracer Bullet                | blocked                                       | SPELL2b            | MONDB4a   | Return to the monster database once one canonical spell/battle spell family path exists. Add one advanced repeated monster pattern such as recharge, legendary actions, stronger multiattack, or monster spellcasting through generic facilities rather than monster-specific handlers.                                                                                 | Blocked on SPELL2b because advanced monster continuation should consume the canonical spell/generic execution surfaces rather than inventing temporary ones.               |
| 7     | MONDB4a - Freeze Dataset Expansion Scope                       | blocked                                       | MONDB3             | none      | After the advanced tracer bullet lands, freeze the next SRD monster dataset slice, batching strategy, and unsupported-pattern report shape before opening implementation tasks for bulk expansion.                                                                                                                                                                      | Blocked on MONDB3 because dataset expansion should be decomposed only after the reusable schema and facility set are proven.                                               |
| 8     | CHAREDIT1 - Mandatory Character Draft Update Preview           | deferred                                      | none               | CHARMCP1  | After the current monster/spell staircase, implement the core-domain preview-before-commit operation for destructive character draft edits using [PRD_CHARACTER_DRAFT_EDITABILITY.md](../PRD_CHARACTER_DRAFT_EDITABILITY.md) and the convergence direction in [PRD_CHARACTER_FORMALIZATION.md](../PRD_CHARACTER_FORMALIZATION.md).                                      | The shape is already stable enough for implementation, but it is intentionally parked behind the current active batch.                                                     |
| 9     | CHARMCP1 - Stored Character MCP Surface                        | deferred                                      | CHAREDIT1          | CHARAUTH1 | After `CHAREDIT1`, add the stored-server-side character MCP surface over canonical `CharacterDraft` / `CharacterSheet` operations using [PRD_CHARACTER_MCP_SURFACE.md](../PRD_CHARACTER_MCP_SURFACE.md).                                                                                                                                                                | The contract is now well-scoped, but it should consume the preview-before-commit semantics rather than inventing adapter-local draft mutation behavior.                    |
| 10    | CHAROWN1 - Character Ownership Gap Cleanup                     | deferred                                      | none               | CHAROWN2  | After the current monster/spell staircase, clean up stale character-side ownership residue, starting with subclass validation scaffolding that no longer matches advancement-owned subclass semantics, using [PRD_CHARACTER_SHEET_OWNERSHIP_GAPS.md](../PRD_CHARACTER_SHEET_OWNERSHIP_GAPS.md) and [PRD_CHARACTER_FORMALIZATION.md](../PRD_CHARACTER_FORMALIZATION.md). | Small and well-scoped, but lower priority than the current batch and easier to land before broader character-side ownership additions.                                     |
| 11    | CHAROWN2 - Fighting Style Authored Ownership                   | deferred                                      | CHAROWN1           | CHARAUTH1 | After `CHAROWN1`, add Fighting Style selections as authored character-side facts and thread them through validation, sanitization, projection, and Quint parity using [PRD_CHARACTER_SHEET_OWNERSHIP_GAPS.md](../PRD_CHARACTER_SHEET_OWNERSHIP_GAPS.md) and [PRD_CHARACTER_FORMALIZATION.md](../PRD_CHARACTER_FORMALIZATION.md).                                        | This is a real missing authored-owner gap, not cleanup. It should land before the final convergence push so projection stops carrying placeholder empty sets.              |
| 12    | CHARAUTH1 - Character Quint Authority Convergence              | deferred                                      | CHARMCP1, CHAROWN2 | none      | After the MCP surface and character-side ownership gaps land, tighten parity and ownership rules until the character stack is operationally Quint-led and TS is clearly adapter/runtime code, following [PRD_CHARACTER_FORMALIZATION.md](../PRD_CHARACTER_FORMALIZATION.md).                                                                                            | This is the convergence capstone, not the starting slice. It needs the MCP boundary and remaining character-side authored facts settled first.                             |

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
- Battle owns participation, not creature existence. `BATTLE_INIT` should be understood as the initial batch add of already-authored creatures into a new battle, and `BATTLE_ADD_CREATURE` as the same projection semantics later in the battle lifecycle.
- Monster work may reference spell identities and authored spellcasting prose, but it must not become the owner of spell execution semantics.
- Spell work must first define canonical spell records and identity projection, then one narrow battle spell family slice, before advanced monster continuation depends on them.
- Canonical spell identity is `SpellId`; display names and open `SpellName` strings are adapter/input conveniences rather than a second identity system.
- Canonical spell provenance follows the same split already required for monsters: provenance on the authored record, supporting machine-readable inputs separate, runtime payloads separate from both.
- Canonical spell records now live in `packages/core/src/features/spell-registry.ts`; record-owned `modeling` and `projections` carry the reusable authored spell mechanics and one-way battle payload projection hooks that later spell-family work should consume.

Planning note:

- The completed character-formalization and MCP monster-control work is intentionally removed from the active queue. Use git history and the supporting PRDs for context when needed; do not re-open that finished batch here.
- The newly documented character-tail tasks below are parked intentionally. They are not blocked by monster or spell ownership in the abstract; they are deferred only because this file currently encodes one active staircase at a time.

Structure note:

- This file is strong at expressing one serial architecture staircase.
- It is weaker at representing multiple independent future batches at once. The character tasks below are real and already shaped, but in this single-queue format they necessarily look more linearly blocked or deferred than the underlying ownership graph really is.
- If the repo starts carrying multiple parallel future batches often, split this file into:
  - one truly active queue;
  - one parked next-batch queue;
  - shared durable ownership notes referenced by both.

## Task Selection Guidance

Recommended next coding-loop task:

1. `SPELL2a - Canonical Spell Records And Identity Projection`

Do not skip ahead to spell execution or advanced monster facilities before the canonical goblin tracer bullet lands. The current sequence is deliberate:

1. prove the canonical stat-block owner on the narrowest monster slice;
2. lock battle participation semantics on the goblin flow before widening the monster pattern;
3. prove the schema on a second monster without preempting spell ownership;
4. freeze the spell-content owner;
5. implement canonical spell identity/projection;
6. implement one battle spell family on top of that projection;
7. resume advanced monster continuation on top of that settled spell boundary.

## Recommended Coding Loop

1. Start with [PRD_MONSTER_DATABASE.md](../PRD_MONSTER_DATABASE.md), [plans/monster-database-plan.md](./monster-database-plan.md), [ARCHITECTURE.md](../ARCHITECTURE.md), and [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).
2. For monster implementation tasks, read the relevant SRD monster text in `.references/srd-5.2.1/Monsters/` before editing code.
3. Keep monster spellcasting sections reference-only or text-only until `SPELL1`, `SPELL2a`, and the relevant `SPELL2b` slice land.
4. For spell planning and implementation tasks, use [MCP_EVENT_SURFACE_AUDIT.md](./MCP_EVENT_SURFACE_AUDIT.md) as the public-surface dependency ledger, and use [SPELL1_SPELL_OWNERSHIP_SURFACE.md](./SPELL1_SPELL_OWNERSHIP_SURFACE.md) as the frozen spell-content owner and projection-boundary note.
5. Treat `SPELL2a` and `SPELL2b` as separate coding loops. Do not merge canonical spell identity work and battle spell family work into one unbounded task unless this plan is updated first.
6. Keep future verification narrow and ownership-focused; do not widen MONDB or SPELL tasks into repo-wide cleanup.

## Task Bodies

### Task 0 - MONDB1 - Canonical Goblin Tracer Bullet

Status: `done`

Depends on: none

Blocks: `MONDB1a`

Scope:

- Replace the current goblin-oriented stat-block shortcuts with the canonical `StatBlock` authored-section shape described in [PRD_MONSTER_DATABASE.md](../PRD_MONSTER_DATABASE.md) and [plans/monster-database-plan.md](./monster-database-plan.md).
- Keep the owned collection in `packages/core`; do not create a second monster registry in MCP, app, or runtime code.
- Add explicit SRD provenance to the goblin-owned records.
- Model authored sections explicitly enough to distinguish executable entries from text-only unsupported entries structurally.
- Preserve existing goblin battle and MCP behavior through the same public surfaces.
- Do not widen this task into spell execution ownership, importer pipelines, or full-dataset expansion.

Next action:

- None. This task is complete on `integration`.

Research note:

- The phase and acceptance criteria already exist in [plans/monster-database-plan.md](./monster-database-plan.md).
- The goblin tracer bullet should prove vocabulary, provenance, and projection, not advanced execution support.
- If goblin spellcasting or advanced facility pressure appears, stop at the reference/text boundary and leave that work for later tasks.

Verification requirements:

- Confirm the modeled goblin rules and provenance trace to the local SRD corpus.
- Run task-scoped TypeScript tests for the monster catalog, projection, battle, and MCP paths touched by the migration.
- Include `/simplify` convergence, minimum two rounds.
- If battle behavior changed, run only the narrowest relevant verification surface after deterministic tests are green.

Closeout note:

- Integrated result keeps goblin stock-weapon projection (`Dagger`, `Scimitar`, `Shortbow`) on the shared SRD equipment weapon table rather than duplicating weapon identity inside monster battle projection code.

### Task 1 - MONDB1a - Battle Participation Semantics And Goblin Add Flow

Status: `done`

Depends on: `MONDB1`

Blocks: `MONDB2`

Scope:

- Lock the durable domain rule that creatures exist outside battle and are projected into battle participation rather than created by battle lifecycle commands.
- Make `BATTLE_INIT` explicitly mean initial batch add into battle, not creature creation.
- Make `BATTLE_ADD_CREATURE` explicitly mean the same projection semantics later in the battle lifecycle.
- Prove one initial goblin add flow and one mid-battle goblin add flow through the existing MCP/core surfaces.
- Allow wording cleanup in `plans/ACTIVE_PLAN.md`, [ARCHITECTURE.md](../ARCHITECTURE.md), MCP tool descriptions/examples, and implementation-facing code comments where current wording implies creature creation at battle start.
- Do not rename public command types or change payload shapes in this task.

Next action:

- None. This task is complete on `integration`.

Research note:

- This is intentionally a hard-gate semantic cleanup task, not a request for new monster-addition mechanics.
- The existing MCP/core paths already support goblin add flows; the task is to make their shared semantics explicit and regression-covered.

Verification requirements:

- Confirm the cleaned-up wording consistently states battle participation rather than creature creation.
- Verify both flows:
  - initial goblin batch add via `BATTLE_INIT`;
  - mid-battle goblin add via `BATTLE_ADD_CREATURE`.
- Include `/simplify` convergence, minimum two rounds.

Closeout note:

- The integrated result keeps `BATTLE_INIT` and `BATTLE_ADD_CREATURE` aligned on the same battle-participation projection semantics, with explicit goblin regression coverage in core battle and MCP control-command tests.

### Task 2 - MONDB2 - Second Monster Tracer Bullet

Status: `done`

Depends on: `MONDB1a`

Blocks: `SPELL1`

Scope:

- Add one non-goblin SRD monster that proves the canonical `StatBlock` shape works beyond the goblin slice.
- Reuse the same owned record and projection path established in `MONDB1`.
- Prefer a monster that exercises a materially different authored-section shape without forcing spell ownership decisions.
- Preserve unsupported abilities as text-only structured data with explicit reasons instead of dropping them.

Next action:

- None. This task is complete on `integration`.

Research note:

- `Harpy` is the chosen task-owned monster because it widens authored-section shape without pulling spell ownership forward.
- `Luring Song` remains explicit text-authored unsupported data with a recorded reason, while `Claw` projects through the generic battle path.

Verification requirements:

- RAW / terminology traceability: reviewed `.references/srd-5.2.1/Monsters/Monsters-H-L.md` (`Harpy`) and `UBIQUITOUS_LANGUAGE.md` terms `Stat Block`, `Creature`, `Attack Roll`, `Initiative`, `Charmed`, `Incapacitated`, and `Opportunity Attack` before finalizing the owned record.
- Deterministic verification:
  - `pnpm --filter @dnd/core exec vitest run src/monster-catalog.test.ts`
  - `pnpm --filter @dnd/core typecheck`
  - `pnpm --filter @dnd/core lint`
  - `pnpm --filter @dnd/mcp exec vitest run src/server.test.ts -t Harpy`
  - `pnpm --filter @dnd/mcp lint`
  - `pnpm quality`
- `/simplify` convergence:
  - Round 1: removed catalog-side attack-name special cases and moved compatible attack projection facts into authored `MonsterAttack.battleProfile` data so Harpy, goblins, and existing natural-weapon monsters share one generic projector.
  - Round 2: removed redundant stock-weapon identity from authored attack records so compatible stock-weapon projection remains single-source-of-truth on attack name, then confirmed no further important dedup or simplification issues remained on the task-owned surface.

### Task 3 - SPELL1 - Freeze Spell Ownership Surface

Status: `done`

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

- None. This task is complete on `integration`; use [SPELL1_SPELL_OWNERSHIP_SURFACE.md](./SPELL1_SPELL_OWNERSHIP_SURFACE.md) as the frozen boundary note.

Research note:

- `MCP_EVENT_SURFACE_AUDIT.md` already names the blocked public spell surfaces and why they are blocked.
- The missing piece is the spell-content owner and the spell-to-battle projection contract, not another MCP-specific schema.

Verification requirements:

- Confirm the frozen ownership surface is specific enough that `SPELL2a` can implement it without reopening task scope.
- Confirm the frozen seam prevents monster work from becoming the spell-content owner.

Closeout note:

- The integrated ownership freeze names core spell-owned data as the canonical spell owner, fixes canonical spell identity on `SpellId`, keeps display names separate from identity, and forbids character, monster, battle, and MCP layers from becoming shadow owners of spell provenance or authored mechanics.

### Task 4 - SPELL2a - Canonical Spell Records And Identity Projection

Status: `done`

Depends on: `SPELL1`

Blocks: `SPELL2b`

Scope:

- Implement the canonical spell-owned record and the one-way identity/projection boundary used by character and monster authored content.
- Keep spell identity, provenance, and authored metadata on the spell side.
- Define the minimum projection contract that lets downstream layers reference canonical spells without restating spell facts.
- Do not implement full battle spell resolution in this task.
- Do not expose raw internal event payloads as MCP schemas.

Next action:

- None. This task is complete on `integration`.

Research note:

- This task should make spell identity referenceable from monsters, characters, and later battle spell-family projections.
- The main blast radius is the current split between canonical `SpellId`, adapter-facing `SpellName`, and remaining raw-string spell fields in character, battle, and MCP surfaces.
- It should not widen into full content ingestion, app UX redesign, battle event ownership, or adapter-owned spell registries.

Verification requirements:

- Confirm all modeled rules trace to the local SRD corpus plus the repo's ubiquitous language.
- Run the narrowest relevant core tests for the touched spell/projection paths.
- Include `/simplify` convergence, minimum two rounds.

Closeout note:

- The integrated result keeps canonical spell identity, provenance, and modeled spell-authored mechanics on the spell side; characters, monsters, battle-init payloads, and MCP-facing tests now project or reference `SpellId` instead of restating spell facts.

### Task 5 - SPELL2b - Battle Spell Projection For One Generic Spell Family

Status: `ready-for-implementation-after-light-research`

Depends on: `SPELL2a`

Blocks: `MONDB3`

Scope:

- Implement one battle-facing generic spell family on top of canonical spell records and identity projection.
- Pick one bounded family, such as save spells or concentration spells, and define the projection contract from canonical spell records into battle-owned resolution inputs.
- Keep save/DC/damage loops, counterspell windows, concentration transitions, and per-target resolution battle-owned.
- Do not widen this task to every battle spell family or all `BATTLE_CAST_*` surfaces at once.

Next action:

- Start with the save-spell family already carried by canonical record projections, then wire one reusable battle spell path through that seam without widening to every spell event at once.

Research note:

- This task should directly support one future generic battle spell surface without forcing the entire spell system to land in one change.
- Public MCP schemas should still remain narrow and derived from the battle-owned spell family boundary.

Verification requirements:

- Confirm the chosen spell family routes through a reusable generic projection path from canonical spell records into battle-owned semantics.
- Run the narrowest relevant core/battle/MCP tests for the touched spell family path.
- Include `/simplify` convergence, minimum two rounds.

### Task 6 - MONDB3 - Advanced Monster Pattern Tracer Bullet

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

### Task 7 - MONDB4a - Freeze Dataset Expansion Scope

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

### Task 8 - CHAREDIT1 - Mandatory Character Draft Update Preview

Status: `deferred`

Depends on: none

Blocks: `CHARMCP1`

Scope:

- Implement the core-domain preview-before-commit operation for destructive character draft edits described in [PRD_CHARACTER_DRAFT_EDITABILITY.md](../PRD_CHARACTER_DRAFT_EDITABILITY.md).
- Keep the semantic owner on the character side; do not make app or MCP invent their own draft-impact interpretation.
- Compute, at minimum:
  - candidate next draft;
  - authored facts dropped by the change;
  - newly opened required choices;
  - newly introduced illegal issues.
- Keep commit separate from preview.
- Do not widen this task into rollback, undo, redo, checkpoints, or multi-user history.

Next action:

- When this batch is reprioritized, start from the current `applyCharacterDraftUpdate()` and `assessCharacterDraft()` surfaces and design the stable preview result shape before editing callers.

Research note:

- The key fact is already settled: current sanitization is post-change only, and the next slice requires mandatory preview before commit.
- Rollback/checkpoints are intentionally deferred and should remain documented as deferred rather than pulled into this slice.

Verification requirements:

- Confirm preview does not mutate stored/current draft state.
- Verify destructive upstream changes surface dropped facts, reopened holes, and new illegal issues before commit.
- Run task-scoped character-domain tests only; battle MBT is out of scope.
- Include `/simplify` convergence, minimum two rounds.

### Task 9 - CHARMCP1 - Stored Character MCP Surface

Status: `deferred`

Depends on: `CHAREDIT1`

Blocks: `CHARAUTH1`

Scope:

- Add the stored-server-side character MCP surface described in [PRD_CHARACTER_MCP_SURFACE.md](../PRD_CHARACTER_MCP_SURFACE.md).
- Keep canonical stored records as core-owned `CharacterDraft` / `CharacterSheet` state.
- Expose narrow MCP operations over that stored state:
  - inspect draft/sheet state;
  - preview draft update;
  - apply accepted draft update;
  - assess/finalize/advance/project through core-owned semantics.
- Do not invent an MCP-only character schema or a second character registry.
- Keep MCP downstream of the owned character domain and the preview-before-commit semantics.

Next action:

- When reprioritized, inventory the current MCP storage/runtime facilities and choose the minimal stored-record pattern that keeps the adapter thin.

Research note:

- The repo already contains an explicit transitional note in `packages/core/src/player-loadouts.ts` that MCP still lacks the honest caller-facing character-sheet boundary.
- This task is the adapter completion slice for that gap, not a request to redesign character semantics.

Verification requirements:

- Confirm MCP stores and returns canonical `CharacterDraft` / `CharacterSheet`-shaped data rather than adapter-owned alternates.
- Verify preview and apply remain separate MCP operations.
- Run the narrowest relevant MCP and character-domain tests for the touched surface.
- Include `/simplify` convergence, minimum two rounds.

### Task 10 - CHAROWN1 - Character Ownership Gap Cleanup

Status: `deferred`

Depends on: none

Blocks: `CHAROWN2`

Scope:

- Clean up stale character-side ownership residue documented in [PRD_CHARACTER_SHEET_OWNERSHIP_GAPS.md](../PRD_CHARACTER_SHEET_OWNERSHIP_GAPS.md).
- Start with subclass validation scaffolding that no longer matches the current advancement-owned subclass model.
- Remove or rewrite dead helper paths so the codebase reflects one clear owner for subclass timing and legality.
- Keep subclass legality on ordered advancement replay; do not reintroduce a second side channel.
- Do not widen this task into new authored features such as Fighting Style ownership.

Next action:

- When reprioritized, trace the residual subclass helper path from current code and tests, then remove or narrow it so the ownership line becomes explicit.

Research note:

- This task already has a durable root cause: subclass ownership moved from a draft-side side channel into ordered `advancement` entries, and the remaining stub is residue from that migration.

Verification requirements:

- Confirm subclass legality still surfaces correctly through advancement replay and assessment after cleanup.
- Run narrow character-domain and parity tests only.
- Include `/simplify` convergence, minimum two rounds.

### Task 11 - CHAROWN2 - Fighting Style Authored Ownership

Status: `deferred`

Depends on: `CHAROWN1`

Blocks: `CHARAUTH1`

Scope:

- Add Fighting Style selections as authored character-side facts using [PRD_CHARACTER_SHEET_OWNERSHIP_GAPS.md](../PRD_CHARACTER_SHEET_OWNERSHIP_GAPS.md) and [PRD_CHARACTER_FORMALIZATION.md](../PRD_CHARACTER_FORMALIZATION.md).
- Thread those facts through:
  - draft/sheet ownership;
  - legality and timing validation;
  - sanitization;
  - character-creature projection;
  - Quint parity.
- Remove the current placeholder empty-set projection behavior once the authored owner exists.
- Do not widen this task into unrelated class-feature backlog.

Next action:

- When reprioritized, freeze the authored Fighting Style shape and timing semantics on the character side first, then thread them through projection.

Research note:

- Both TypeScript and Quint currently document the same gap explicitly: the character side does not yet own Fighting Style selections, so projection can only thread the empty set.

Verification requirements:

- Confirm Fighting Style selections persist on the character side before projection consumes them.
- Verify legality/timing, sanitization, and projection outputs through task-scoped tests.
- Add or extend Quint parity where the new authored fact crosses the formal boundary.
- Include `/simplify` convergence, minimum two rounds.

### Task 12 - CHARAUTH1 - Character Quint Authority Convergence

Status: `deferred`

Depends on: `CHARMCP1`, `CHAROWN2`

Blocks: none

Scope:

- Tighten the remaining character stack until it is operationally Quint-led and TypeScript is clearly adapter/runtime code, following [PRD_CHARACTER_FORMALIZATION.md](../PRD_CHARACTER_FORMALIZATION.md).
- Expand parity and ownership checks across:
  - draft assessment/finalization;
  - advancement;
  - character-creature projection;
  - newly added edit-preview and MCP surfaces where they consume owned character semantics.
- Harden the repo rule that new character semantics land in Quint first and TypeScript/MCP/app follow.
- Do not widen this task into unrelated product/UI redesign.

Next action:

- When reprioritized, inventory the remaining places where character semantics still feel operationally TypeScript-first, then narrow them one by one behind parity-backed ownership decisions.

Research note:

- This is a convergence capstone. It should not start until the stored MCP boundary and the remaining authored character-side gaps are settled enough that parity can target the durable seams.

Verification requirements:

- Confirm the touched character semantics have explicit Quint ownership and parity coverage.
- Run the narrowest relevant character-domain, parity, and adapter tests for the changed surfaces.
- Include `/simplify` convergence, minimum two rounds.
