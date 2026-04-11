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
      "status": "ready-for-research",
      "title": "Canonical Character Domain"
    },
    {
      "number": 1,
      "id": "CHAR2",
      "status": "blocked",
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
    },
    {
      "number": 9,
      "id": "POST1",
      "status": "blocked",
      "title": "Formal Creation Semantics"
    },
    {
      "number": 10,
      "id": "POST2",
      "status": "blocked",
      "title": "Open Choices And Selective Invalidation"
    },
    {
      "number": 11,
      "id": "POST3",
      "status": "blocked",
      "title": "Formal Advancement And Higher-Level Starts"
    },
    {
      "number": 12,
      "id": "POST4",
      "status": "blocked",
      "title": "Workflow And Projection Convergence"
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
| 0 | CHAR1 - Canonical Character Domain | ready-for-research | none | CHAR2, CHAR3, CHAR4, CHAR5, CHAR6, CHAR7 | Confirm the minimal durable shape for `CharacterDraft` and `CharacterSheet`, align it against `creature.qnt` construction fields and current TS runtime inputs, then either land the canonical models directly or update this file with the final owned-model decision. | Highest-priority active task |
| 1 | CHAR2 - Score Generation And Origin Validation | blocked | CHAR1 | CHAR3, CHAR5 | Wait for canonical character-domain ownership to land, then implement the first end-to-end SRD creation slice: class, background, species, languages, ability-score generation, alignment, and finalized score/modifier validation. | Blocked only on canonical model landing |
| 2 | CHAR3 - Proficiencies Features And Level-Gated Character Facts | blocked | CHAR1, CHAR2 | CHAR4, CHAR5, CHAR7 | After CHAR1-2, extend the sheet to own proficiencies, subclass gating, feats/feature choices, multiclass prerequisites, and class-resource derivations. | Shape understood; depends on draft/sheet baseline |
| 3 | CHAR4 - Equipment And Loadout Projection | blocked | CHAR1, CHAR3 | CHAR5 | Replace narrow starter-loadout assumptions with owned sheet equipment/loadout facts and project them into combat-facing hand, armor, shield, and weapon facts. | Depends on sheet feature/proficiency ownership |
| 4 | CHAR5 - Sheet-Derived Numbers And Spellcasting Projection | blocked | CHAR1, CHAR2, CHAR3, CHAR4 | CHAR6, CHAR7 | Derive executable sheet numbers and spellcasting facts from the owned sheet, then project them into creature runtime and battle init without duplicated derivation. | Depends on prior sheet ownership slices |
| 5 | CHAR6 - Guided Workflow Shell | blocked | CHAR1, CHAR2, CHAR5 | none | Once the owned domain and projections are stable, add a thin workflow shell over `CharacterDraft` rather than a second semantic model. | Product-shell work; intentionally later |
| 6 | CHAR7 - Level Advancement And Multiclass Continuation | blocked | CHAR1, CHAR3, CHAR5 | none | Extend the same character domain into advancement, higher-level starts, ASI/feat choice points, and multiclass continuation. | Depends on executable sheet baseline |
| 7 | H - PassiveModifiers Sub-Record | deferred | none | none | Keep deferred. Do not pick up unless the batch objective changes back toward MCP/action-surface cleanup. | Explicitly outside the current batch |
| 8 | I - Build-Map / Hole Metadata | deferred | none | none | Keep deferred. Do not pick up unless the batch objective changes back toward MCP/action-surface cleanup. | Explicitly outside the current batch |
| 9 | POST1 - Formal Creation Semantics | blocked | CHAR6, CHAR7 | POST2, POST4 | After the current `CHAR` sequence lands, formalize the creation draft/sheet semantics in Quint while preserving the already-planned product/domain shape rather than reopening the earlier ownership decisions. | Future post-`CHAR` phase; blocked on the current batch landing |
| 10 | POST2 - Open Choices And Selective Invalidation | blocked | POST1 | POST4 | Build the explicit `open choices` / `validation issues` / dependency-aware invalidation model on top of the `CHAR` foundation so guided workflows can distinguish incompleteness from illegality. | Depends on formal creation semantics |
| 11 | POST3 - Formal Advancement And Higher-Level Starts | blocked | CHAR7, POST1 | POST4 | Formalize advancement as repeated legal level-up transitions over the same canonical sheet, then use that path for higher-level starts rather than bespoke bootstrapping. | Depends on advancement ownership plus formal creation semantics |
| 12 | POST4 - Workflow And Projection Convergence | blocked | POST1, POST2, POST3 | none | Converge the guided workflow shell and runtime projections onto the formal creation/advancement surfaces without introducing a second semantic model. | Final post-`CHAR` integration phase |

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
- Character creation must not be generalized into the main battle machine.
- Runtime projections must flow from owned character data to creature/battle runtime, not the reverse.

Post-`CHAR` planning note:

- The appended `POST*` tasks are additive only and should not cause mid-batch rewrites of `CHAR1` through `CHAR7`.
- On `master`, treat the `CHAR` sequence as the foundation that must land first; the post-`CHAR` queue captures the next layer of work implied by the revised PRD.
- New work should extend the planned character-domain/product shape toward the revised PRD semantics rather than reopening the earlier ownership decisions.

## Task Selection Guidance

Recommended next coding-loop task:

1. **CHAR1 - Canonical Character Domain**
   This is the enabling slice for the entire batch. Until the repo owns `CharacterDraft` and `CharacterSheet` explicitly, every later slice risks recreating character state in whichever layer happens to need it first.

Do not jump ahead to workflow/UI work before the canonical domain exists. Do not solve character creation by widening `DndMachineInput`, `BATTLE_INIT`, or adapter-owned metadata.

## Recommended Coding Loop

1. Read [PRD_CHARACTER_CREATION.md](../PRD_CHARACTER_CREATION.md) and [character-creation-plan.md](./character-creation-plan.md) alongside:
   - [ARCHITECTURE.md](../ARCHITECTURE.md)
   - [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md)
   - [.references/srd-5.2.1/Character-Creation.md](../.references/srd-5.2.1/Character-Creation.md)
   - [.references/srd-5.2.1/Character-Origins.md](../.references/srd-5.2.1/Character-Origins.md)
   - [creature.qnt](../creature.qnt)
2. Execute CHAR1 first.
3. If CHAR1 lands cleanly, update this file in the same loop:
   - mark CHAR1 `done`;
   - promote CHAR2 to `ready-for-implementation-after-light-research` or `ready-for-research`;
   - revise downstream task notes if the canonical model shape changed.
4. Keep H and I deferred unless this file is explicitly reprioritized.

### Task 0 - CHAR1 - Canonical Character Domain

Status: ready-for-research.

Depends on: none.

Blocks: CHAR2, CHAR3, CHAR4, CHAR5, CHAR6, CHAR7.

Next action:

- Confirm the minimal durable shape for `CharacterDraft` and `CharacterSheet`.
- Align that shape with the existing construction/leveling surface in `creature.qnt` and the current TS runtime/battle projection needs.
- Decide which facts belong on the finalized canonical sheet versus projection-only derived outputs.
- Either land the canonical models directly if the research resolves cleanly, or update this file with the final ownership decision and promote follow-up tasks accordingly.

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
- If research discovers a better durable split, update this file before implementation continues.

Acceptance criteria:

- `CharacterDraft` and `CharacterSheet` exist as explicit owned concepts in core planning and implementation.
- The canonical model records creation-time facts the SRD requires, including at minimum class, level, background, species, languages, and alignment.
- The canonical model is not battle-owned and is not adapter-owned.
- Finalization from draft to sheet rejects incomplete or contradictory states.
- The chosen shape clearly distinguishes sheet-owned facts from projection-only runtime facts.

Verification:

- RAW check: read `.references/srd-5.2.1/Character-Creation.md` and `.references/srd-5.2.1/Character-Origins.md`, then re-check `UBIQUITOUS_LANGUAGE.md` before editing.
- Cross-check the chosen canonical model against `creature.qnt` construction/leveling facilities before implementation.
- `/simplify` convergence: minimum two rounds after implementation, continuing until no important fixes remain.
- Add focused tests for the canonical-model finalization boundary if implementation lands in this loop.

Plan Impact:

- Status: update-required
- Affected tasks:
  - `CHAR1`: will become `done` or stay `ready-*` with a clarified scope.
  - `CHAR2` and downstream character tasks: status and wording should be updated based on the final canonical model shape.

### Task 1 - CHAR2 - Score Generation And Origin Validation

Status: blocked.

Depends on: CHAR1.

Blocks: CHAR3, CHAR5.

Next action:

- Wait for CHAR1 to land.
- Then implement the first end-to-end SRD creation slice: class, background, species, languages, ability-score generation, alignment, and finalized score/modifier validation.

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

### Task 9 - POST1 - Formal Creation Semantics

Status: blocked.

Depends on: CHAR6, CHAR7.

Blocks: POST2, POST4.

User stories:

- 32, 33, 35, 40, 41, 44, 47, 48, 50, 52

What to build:

- Formalize the creation-side semantic model in Quint using the planned `CharacterDraft` / `CharacterSheet` product shape as foundation rather than replacing it.
- Model the canonical creation surfaces needed to explain an editable draft, a finalizable sheet, and projection from sheet to creature runtime.
- Keep battle out of character creation while making the formal layer the durable owner of creation semantics that should not drift over time.

Acceptance criteria:

- The formal creation-semantics task treats the `CHAR` work as foundation, not as throwaway implementation.
- The formal model owns canonical creation semantics rather than relying on workflow state or battle init as a proxy.
- A clear projection boundary from finalized sheet to creature runtime is part of the formal design.

### Task 10 - POST2 - Open Choices And Selective Invalidation

Status: blocked.

Depends on: POST1.

Blocks: POST4.

User stories:

- 26, 27, 28, 29, 30, 41, 42, 47

What to build:

- Add explicit product/domain support for `open choices` distinct from `validation issues`.
- Define dependency-aware invalidation so changing an earlier choice only invalidates later choices that actually depend on it.
- Preserve the sequential SRD workflow shape without making step position the owner of legality or completeness.

Acceptance criteria:

- The system can distinguish missing required choices from illegal choices.
- Backtracking semantics preserve unrelated later choices whenever they remain valid.
- The guided workflow can surface open holes, illegal state, and reviewable complete state separately.

### Task 11 - POST3 - Formal Advancement And Higher-Level Starts

Status: blocked.

Depends on: CHAR7, POST1.

Blocks: POST4.

User stories:

- 12, 13, 16, 17, 31, 37, 38, 39, 46, 50

What to build:

- Model level advancement as a repeated legal transition over a finalized character sheet.
- Use that same advancement path to explain higher-level starts: create the level 1 character, then advance repeatedly until the target level is reached.
- Keep multiclass continuation, subclass gating, HP/hit-dice growth, feat/ASI picks, and spellcasting expansion on the same advancement path.

Acceptance criteria:

- Higher-level starts do not require a bespoke semantic path separate from creation plus advancement.
- Advancement uses the same canonical sheet model as creation.
- The design makes repeated level-up transitions the durable explanation for reaching higher-level characters.

### Task 12 - POST4 - Workflow And Projection Convergence

Status: blocked.

Depends on: POST1, POST2, POST3.

Blocks: none.

User stories:

- 28, 30, 31, 34, 39, 43, 44, 47, 48, 49, 50

What to build:

- Converge the guided workflow shell and runtime projections on the formal creation and advancement surfaces.
- Keep the UI/workflow thin: it should persist draft state, surface open choices and issues, and render derived sheet/runtime outputs instead of re-deriving semantics locally.
- Align higher-level starts, advancement, and battle-ready projection around the same finalized-sheet contract.

Acceptance criteria:

- Workflow, formal semantics, and runtime projections all use one canonical draft/sheet story.
- The workflow shell does not become a second rules engine.
- Runtime projection remains one-way derived from finalized owned character state.
