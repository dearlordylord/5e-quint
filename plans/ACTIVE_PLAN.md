# Active Plan

Date: 2026-04-11

This is the single active planning queue.

The previous MCP/battle follow-up queue is complete and has been removed from the active file. The next coding-loop batch is the character-creation program defined in [PRD_CHARACTER_CREATION.md](../PRD_CHARACTER_CREATION.md).

## Batch Objective

Land the first bounded implementation slices for SRD 5.2.1 character creation and character-sheet projection without:

- duplicating character facts across app, MCP, creature runtime, or battle runtime;
- widening the main battle machine into a character builder;
- introducing adapter-owned character registries;
- drifting away from the existing Quint construction/leveling semantics in `creature.qnt`.

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
      "id": "CHAR1",
      "status": "done",
      "title": "Canonical Character Domain"
    },
    {
      "number": 1,
      "id": "CHAR2",
      "status": "ready-for-implementation-after-light-research",
      "title": "Score Generation And Origin Validation"
    },
    {
      "number": 2,
      "id": "CHAR3",
      "status": "blocked",
      "title": "Proficiencies Features And Level-Gated Character Facts"
    },
    {
      "number": 3,
      "id": "CHAR4",
      "status": "blocked",
      "title": "Equipment And Loadout Projection"
    },
    {
      "number": 4,
      "id": "CHAR5",
      "status": "blocked",
      "title": "Sheet-Derived Numbers And Spellcasting Projection"
    },
    {
      "number": 5,
      "id": "CHAR6",
      "status": "blocked",
      "title": "Guided Workflow Shell"
    },
    {
      "number": 6,
      "id": "CHAR7",
      "status": "blocked",
      "title": "Level Advancement And Multiclass Continuation"
    },
    {
      "number": 7,
      "id": "H",
      "status": "deferred",
      "title": "PassiveModifiers Sub-Record"
    },
    {
      "number": 8,
      "id": "I",
      "status": "deferred",
      "title": "Build-Map / Hole Metadata"
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
- Update the task status before ending the loop:
  - `done` if implementation/research and verification are complete;
  - `ready-for-implementation-after-light-research` if research made it implementable;
  - `blocked` if a required ownership/API decision is still unresolved;
  - `deferred` if research shows the task should not be in the current batch.
- When a task is marked `done` or `deferred`, inspect every task listed in its `Blocks` column. If all dependencies for a blocked task are now satisfied, update that task from `blocked` to `ready-for-research` or `ready-for-implementation-after-light-research`, and update its `Next action` / `Handoff readiness` if needed.
- For any implementation task, read the relevant SRD text in `.references/srd-5.2.1/` and check `UBIQUITOUS_LANGUAGE.md` before editing code.
- For any task that changes modeled D&D rule semantics, make the RAW/ASSUMPTIONS decision in Quint first, then update XState/TS/MCP to match. Adapter-only tasks, documentation-only tasks, and pure workflow-shell tasks are exempt.
- For any implementation task, include `/simplify` convergence in the task closeout: minimum two rounds unless the changeset is trivial, and continue until no important fixes remain.
- Do not run battle MBT for research-only tasks. For implementation tasks, use the narrowest verification tier that matches the touched ownership surface.

## DAG / Queue Order

| Order | Task | Status | Depends on | Blocks | Next action | Handoff readiness |
| ----- | ---- | ------ | ---------- | ------ | ----------- | ----------------- |
| 0 | CHAR1 - Canonical Character Domain | done | none | CHAR2, CHAR3, CHAR4, CHAR5, CHAR6, CHAR7 | Landed `CharacterDraft` / `CharacterSheet` in `packages/core/src/character-domain.ts` with finalization that rejects incomplete or contradictory class/background/species/language/alignment state. | Complete |
| 1 | CHAR2 - Score Generation And Origin Validation | ready-for-implementation-after-light-research | CHAR1 | CHAR3, CHAR5 | Extend the canonical draft/sheet with ability-score generation and origin validation on top of the landed `primaryClass + classLevels` baseline; re-read the relevant SRD/background text before editing. | Unblocked by CHAR1; bounded follow-up |
| 2 | CHAR3 - Proficiencies Features And Level-Gated Character Facts | blocked | CHAR1, CHAR2 | CHAR4, CHAR5, CHAR7 | After CHAR1-2, extend the sheet to own proficiencies, subclass gating, feats/feature choices, multiclass prerequisites, and class-resource derivations. | Shape understood; depends on draft/sheet baseline |
| 3 | CHAR4 - Equipment And Loadout Projection | blocked | CHAR1, CHAR3 | CHAR5 | Replace narrow starter-loadout assumptions with owned sheet equipment/loadout facts and project them into combat-facing hand, armor, shield, and weapon facts. | Depends on sheet feature/proficiency ownership |
| 4 | CHAR5 - Sheet-Derived Numbers And Spellcasting Projection | blocked | CHAR1, CHAR2, CHAR3, CHAR4 | CHAR6, CHAR7 | Derive executable sheet numbers and spellcasting facts from the owned sheet, then project them into creature runtime and battle init without duplicated derivation. | Depends on prior sheet ownership slices |
| 5 | CHAR6 - Guided Workflow Shell | blocked | CHAR1, CHAR2, CHAR5 | none | Once the owned domain and projections are stable, add a thin workflow shell over `CharacterDraft` rather than a second semantic model. | Product-shell work; intentionally later |
| 6 | CHAR7 - Level Advancement And Multiclass Continuation | blocked | CHAR1, CHAR3, CHAR5 | none | Extend the same character domain into advancement, higher-level starts, ASI/feat choice points, and multiclass continuation. | Depends on executable sheet baseline |
| 7 | H - PassiveModifiers Sub-Record | deferred | none | none | Keep deferred. Do not pick up unless the batch objective changes back toward MCP/action-surface cleanup. | Explicitly outside the current batch |
| 8 | I - Build-Map / Hole Metadata | deferred | none | none | Keep deferred. Do not pick up unless the batch objective changes back toward MCP/action-surface cleanup. | Explicitly outside the current batch |

## Current Integrated Baseline

Already wired on `master` and relevant to this batch:

- The repo's authoritative combat boundary remains `battle.qnt` plus `battle-machine.ts`.
- `creature.qnt` already contains substantial construction and leveling helpers:
  - `CharConfig`;
  - point-buy validation;
  - XP/level helpers;
  - ASI helpers;
  - multiclass prerequisite helpers;
  - first-level and level-up HP helpers;
  - class-level aggregation helpers.
- TypeScript already contains several partial character-facing derivations:
  - hit dice and multiclass prerequisites in `class-tables.ts`;
  - slot derivation in `machine-spells.ts`;
  - partial species combat traits in `species-traits.ts`.
- The current TS runtime starts from pre-derived combat inputs rather than an owned character-sheet model.
- `start_battle` and current player loadouts are intentionally narrow and should be treated as transitional, not the long-term character architecture.

Current architecture decisions for this batch:

- `CharacterSheet` is the PC-owned canonical record; `StatBlock` remains monster-only language.
- Canonical class/level ownership is `primaryClass + classLevels`; total level is derived from `classLevels` instead of being stored twice.
- Character creation must not be generalized into the main battle machine.
- Runtime projections must flow from owned character data to creature/battle runtime, not the reverse.

## Task Selection Guidance

Recommended next coding-loop task:

1. **CHAR2 - Score Generation And Origin Validation**
   CHAR1 landed the canonical ownership boundary. The next slice should add SRD score-generation and origin-validation semantics to the draft/sheet rather than introducing a second character representation elsewhere.

Do not jump ahead to workflow/UI work before the canonical domain exists. Do not solve character creation by widening `DndMachineInput`, `BATTLE_INIT`, or adapter-owned metadata.

## Recommended Coding Loop

1. Read [PRD_CHARACTER_CREATION.md](../PRD_CHARACTER_CREATION.md) and [character-creation-plan.md](./character-creation-plan.md) alongside:
   - [ARCHITECTURE.md](../ARCHITECTURE.md)
   - [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md)
   - [.references/srd-5.2.1/Character-Creation.md](../.references/srd-5.2.1/Character-Creation.md)
   - [.references/srd-5.2.1/Character-Origins.md](../.references/srd-5.2.1/Character-Origins.md)
   - [creature.qnt](../creature.qnt)
2. Execute CHAR2 next.
3. Keep CHAR3+ blocked until CHAR2 lands, since proficiencies and derived sheet numbers depend on validated score/origin ownership.
4. Keep H and I deferred unless this file is explicitly reprioritized.

### Task 0 - CHAR1 - Canonical Character Domain

Status: done.

Depends on: none.

Blocks: CHAR2, CHAR3, CHAR4, CHAR5, CHAR6, CHAR7.

Closeout:

- Landed `packages/core/src/character-domain.ts` with explicit `CharacterDraft` and `CharacterSheet` concepts.
- Chose `primaryClass + classLevels` as the canonical class/level shape to match `creature.qnt` and avoid duplicating total level on the sheet.
- Kept the sheet bounded to owned creation facts for this slice: primary class, class-level progression, background, species, languages, and alignment.
- Left ability scores, subclass gating, proficiencies, and equipment/spellcasting derivations for downstream tasks instead of front-loading them into CHAR1.

Problem:

- The repo can already project some combat-ready creature facts, but it does not own a canonical player-character model.
- Current TS runtime inputs are combat-facing and pre-derived.
- Current battle init wants projected combatants, not creation-time choices.
- Future character-creation work will fragment immediately if the repo does not first define one owned PC domain model.

Inputs:

- [PRD_CHARACTER_CREATION.md](../PRD_CHARACTER_CREATION.md)
- [character-creation-plan.md](./character-creation-plan.md)
- [ARCHITECTURE.md](../ARCHITECTURE.md)
- [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md)
- [.references/srd-5.2.1/Character-Creation.md](../.references/srd-5.2.1/Character-Creation.md)
- [.references/srd-5.2.1/Character-Origins.md](../.references/srd-5.2.1/Character-Origins.md)
- [creature.qnt](../creature.qnt)
- current TS runtime surfaces that consume pre-derived character facts

Implementation output:

- A canonical `CharacterDraft` model that can represent incomplete creation choices without fabricating finalized results.
- A canonical `CharacterSheet` model that represents a validated SRD player character and remains distinct from monster `StatBlock`.
- A documented boundary between:
  - owned sheet facts;
  - derived sheet results;
  - runtime projection outputs.
- A durable serialized sheet shape that keeps `languages` as an array and derives total level from `classLevels`.

Acceptance criteria:

- `CharacterDraft` and `CharacterSheet` exist as explicit owned concepts in core planning and implementation.
- The canonical model records creation-time facts the SRD requires, including at minimum class, level, background, species, languages, and alignment.
- The canonical model is not battle-owned and is not adapter-owned.
- Finalization from draft to sheet rejects incomplete or contradictory states.
- The chosen shape clearly distinguishes sheet-owned facts from projection-only runtime facts.

Verification:

- RAW check completed against `.references/srd-5.2.1/Character-Creation.md` and `.references/srd-5.2.1/Character-Origins.md`, then `UBIQUITOUS_LANGUAGE.md`.
- Cross-check completed against `creature.qnt` construction/leveling helpers, especially `CharConfig.className`, `CharConfig.classLevels`, `ZERO_CLASS_LEVELS`, `singleClassLevels`, and `pTotalLevel`.
- Focused tests added for the canonical-model finalization boundary in `packages/core/src/character-domain.test.ts`.
- `/simplify` convergence:
  - Round 1: removed the persistence-hostile `Set` language storage from the candidate design and kept total level derived instead of stored.
  - Round 2: kept the module bounded to durable CHAR1 facts only; no further important simplifications remained.

Plan Impact:

- Status: applied
- Affected tasks:
  - `CHAR1`: marked `done`.
  - `CHAR2`: unblocked and promoted to `ready-for-implementation-after-light-research`.
  - `CHAR3`, `CHAR4`, `CHAR5`, `CHAR6`, `CHAR7`: no dependency change beyond inheriting the clarified `primaryClass + classLevels` ownership baseline.

### Task 1 - CHAR2 - Score Generation And Origin Validation

Status: ready-for-implementation-after-light-research.

Depends on: CHAR1.

Blocks: CHAR3, CHAR5.

Next action:

- Re-read the relevant Character Creation / Character Origins SRD text, then extend the canonical domain with ability-score generation and origin validation.
- Implement the first end-to-end SRD creation slice: class, background, species, languages, ability-score generation, alignment, and finalized score/modifier validation.

Acceptance criteria:

- All three SRD score-generation modes are represented.
- Point-buy legality is validated.
- Background-based score adjustments are owned choices.
- Species and language choices finalize into owned sheet facts.
- Final scores derive final modifiers automatically.

### Task 2 - CHAR3 - Proficiencies Features And Level-Gated Character Facts

Status: blocked.

Depends on: CHAR1, CHAR2.

Blocks: CHAR4, CHAR5, CHAR7.

Next action:

- After CHAR1-2, extend the sheet to own proficiencies, subclass gating, feat/feature choices, multiclass prerequisites, and class-resource derivations.

Acceptance criteria:

- Class/background/species/feat-driven proficiencies merge into one owned result.
- Subclass gating is level-legal.
- Multiclass prerequisites are validated on the character side.
- Level-gated features and resource pools derive from owned sheet facts.

### Task 3 - CHAR4 - Equipment And Loadout Projection

Status: blocked.

Depends on: CHAR1, CHAR3.

Blocks: CHAR5.

Next action:

- Replace narrow starter-loadout assumptions with owned sheet equipment/loadout facts and project them into combat-facing hand, armor, shield, and weapon facts.

Acceptance criteria:

- Starting equipment is modeled as actual choices.
- The sheet owns combat-relevant loadout facts.
- Creature and battle projection consume sheet-owned loadout data rather than narrow temporary presets.

### Task 4 - CHAR5 - Sheet-Derived Numbers And Spellcasting Projection

Status: blocked.

Depends on: CHAR1, CHAR2, CHAR3, CHAR4.

Blocks: CHAR6, CHAR7.

Next action:

- Derive executable sheet numbers and spellcasting facts from the canonical sheet, then project them into creature runtime and battle runtime.

Acceptance criteria:

- HP, Hit Dice, AC, initiative, saves, skills, passive Perception, slot structures, spell save DC, and spell attack bonus derive from one owned path.
- Known/prepared spell choices are owned sheet facts, not runtime guesses.
- Creature and battle runtime projection consume those owned facts without re-deriving them elsewhere.

### Task 5 - CHAR6 - Guided Workflow Shell

Status: blocked.

Depends on: CHAR1, CHAR2, CHAR5.

Blocks: none.

Next action:

- Once the owned domain and projections are stable, add a thin workflow shell around `CharacterDraft`.

Acceptance criteria:

- The product can guide a user through SRD creation steps while persisting `CharacterDraft`.
- The workflow shell does not duplicate derivation or validation logic.
- Finalization produces the same `CharacterSheet` as direct domain-level finalization.

### Task 6 - CHAR7 - Level Advancement And Multiclass Continuation

Status: blocked.

Depends on: CHAR1, CHAR3, CHAR5.

Blocks: none.

Next action:

- Extend the same character domain into advancement, higher-level starts, ASI/feat choice points, and multiclass continuation.

Acceptance criteria:

- Creation and advancement use the same owned character domain.
- Advancement updates HP, hit dice, proficiency-sensitive values, features, and slot structures through one derivation path.
- Higher-level starts do not require bespoke runtime bootstrapping.

### Task 7 - H - PassiveModifiers Sub-Record

Status: deferred.

Depends on: none.

Blocks: none.

Next action: Keep deferred. It is not part of the current character-creation batch.

### Task 8 - I - Build-Map / Hole Metadata

Status: deferred.

Depends on: none.

Blocks: none.

Next action: Keep deferred. It is not part of the current character-creation batch.
