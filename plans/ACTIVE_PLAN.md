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
      "status": "done",
      "title": "Score Generation And Origin Validation"
    },
    {
      "number": 2,
      "id": "CHAR3",
      "status": "done",
      "title": "Proficiencies Features And Level-Gated Character Facts"
    },
    {
      "number": 3,
      "id": "CHAR4",
      "status": "done",
      "title": "Equipment And Loadout Projection"
    },
    {
      "number": 4,
      "id": "CHAR5",
      "status": "ready-for-implementation-after-light-research",
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
| 1 | CHAR2 - Score Generation And Origin Validation | done | CHAR1 | CHAR3, CHAR5 | Landed owned ability-score generation, background score-increase validation, and SRD starting-language validation on the canonical character sheet. | Complete |
| 2 | CHAR3 - Proficiencies Features And Level-Gated Character Facts | done | CHAR1, CHAR2 | CHAR4, CHAR5, CHAR7 | Landed owned build choices for class/background/species/feat-driven proficiencies, subclass ownership/gating, multiclass prerequisite validation, granted-language choices, and class-resource derivation helpers on the canonical character sheet. | Complete |
| 3 | CHAR4 - Equipment And Loadout Projection | done | CHAR1, CHAR3 | CHAR5 | Landed owned starting-equipment choices, leftover starting-gold tracking, bounded combat-equipment ownership, loadout validation, and battle-facing weapon/hand/shield/armor projection sourced from `CharacterSheet`. | Complete |
| 4 | CHAR5 - Sheet-Derived Numbers And Spellcasting Projection | ready-for-implementation-after-light-research | CHAR1, CHAR2, CHAR3, CHAR4 | CHAR6, CHAR7 | Derive executable sheet numbers and spellcasting facts from the owned sheet, reusing CHAR4 equipment ownership/projection rather than reintroducing runtime presets. | Unblocked by CHAR4; next bounded slice |
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

1. **CHAR5 - Sheet-Derived Numbers And Spellcasting Projection**
   CHAR4 landed owned equipment choices and loadout projection. The next slice should derive executable sheet numbers and spellcasting facts from the same canonical sheet instead of widening runtime init surfaces again.

Do not jump ahead to workflow/UI work before the canonical domain exists. Do not solve character creation by widening `DndMachineInput`, `BATTLE_INIT`, or adapter-owned metadata.

## Recommended Coding Loop

1. Read [PRD_CHARACTER_CREATION.md](../PRD_CHARACTER_CREATION.md) and [character-creation-plan.md](./character-creation-plan.md) alongside:
   - [ARCHITECTURE.md](../ARCHITECTURE.md)
   - [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md)
   - [.references/srd-5.2.1/Character-Creation.md](../.references/srd-5.2.1/Character-Creation.md)
   - [.references/srd-5.2.1/Character-Origins.md](../.references/srd-5.2.1/Character-Origins.md)
   - [creature.qnt](../creature.qnt)
2. Execute CHAR3 next.
3. Keep CHAR4+ sequenced behind CHAR3 where the dependency table still requires it.
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

Status: done.

Depends on: CHAR1.

Blocks: CHAR3, CHAR5.

Closeout:

- Extended `CharacterDraft` and `CharacterSheet` with owned SRD score-generation choices, background ability-score increases, and derived final ability scores.
- Added pure score helpers in `packages/core/src/character-ability-scores.ts` and extracted score-validation helpers into `packages/core/src/character-finalization-helpers.ts`.
- Kept final modifiers derived via helpers instead of storing redundant modifier state on the sheet.
- Tightened starting-language validation to the SRD Standard Languages table for this slice: exactly `Common` plus two other standard languages, with rare/special languages left for later feature-driven tasks.

Acceptance criteria:

- All three SRD score-generation modes are represented.
- Point-buy legality is validated.
- Background-based score adjustments are owned choices.
- Species and language choices finalize into owned sheet facts.
- Final scores derive final modifiers automatically.

Verification:

- RAW check completed against `.references/srd-5.2.1/Character-Creation.md` Step 2 and Step 3 plus `.references/srd-5.2.1/Character-Origins.md` background ability-score text, then cross-checked terminology in `UBIQUITOUS_LANGUAGE.md` for Character Sheet, Standard Array, Point Buy, and Ability Modifier.
- Focused tests passed: `pnpm --dir packages/core exec vitest run src/character-domain.test.ts`.
- Focused lint passed on touched files: `pnpm --dir packages/core exec eslint --no-inline-config -c eslint.config.mjs src/character-domain.ts src/character-domain.test.ts src/character-ability-scores.ts src/character-finalization-helpers.ts`.
- Dependency graph check passed: `pnpm circular`.
- Repo verification attempted: `pnpm quality` still fails before typecheck on pre-existing Prettier drift in unrelated core files (`src/context-encoding.ts`, `src/creature.mbt.test.ts`, `src/features/spell-available-actions.ts`, `src/machine-event-extractors.ts`, `src/machine-monk.ts`, `src/machine-queries.ts`, `src/machine-startturn.ts`, `src/machine.ts`).
- Existing repo typecheck baseline remains red outside this task when run directly via `pnpm --dir packages/core exec tsc --noEmit`; failures are in battle/runtime files unrelated to CHAR2.
- `/simplify` convergence:
  - Round 1: kept the canonical sheet as the owner of generation method, background increase choice, and derived final scores while removing the rejected worktree script rewrites from scope.
  - Round 2: extracted score-validation helpers to a dedicated module to satisfy the repo file-size limit without adding duplicate state or parallel character models.
  - Round 3: tightened starting-language validation to Standard Languages only for this slice; no further important simplifications remained.

Plan Impact:

- Status: applied
- Affected tasks:
  - `CHAR2`: marked `done`.
  - `CHAR3`: unblocked and promoted to `ready-for-implementation-after-light-research`.
  - `CHAR5`: remains `blocked`; it still depends on `CHAR3` and `CHAR4` despite inheriting the score/origin baseline from `CHAR2`.

### Task 2 - CHAR3 - Proficiencies Features And Level-Gated Character Facts

Status: done.

Depends on: CHAR1, CHAR2.

Blocks: CHAR4, CHAR5, CHAR7.

Acceptance criteria:

- Class/background/species/feat-driven proficiencies merge into one owned result.
- Subclass gating is level-legal.
- Multiclass prerequisites are validated on the character side.
- Level-gated features and resource pools derive from owned sheet facts.

Closeout:

- Extended `packages/core/src/character-domain.ts` to keep explicit CHAR3 build choices on the canonical sheet rather than pushing them into adapters or runtime-only projections.
- Added owned validation/derivation support for primary-class and multiclass skill picks, background tool picks, species skill picks, human Versatile origin-feat picks, subclass ownership, rogue/ranger granted-language choices, and class-feature choices that change proficiencies (`Divine Order`, `Primal Order`).
- Landed merged proficiency/resource helpers in `packages/core/src/character-proficiencies.ts` and `packages/core/src/character-resources.ts`, with supporting data/types split into focused modules to stay under repo lint limits.
- Kept `CharacterSheet` as the owned source of truth for explicit choices while deriving merged proficiencies and resource pools from those choices instead of storing parallel copies.

Verification:

- RAW check completed against:
  - `.references/srd-5.2.1/Character-Creation.md`
  - `.references/srd-5.2.1/Character-Origins.md`
  - `.references/srd-5.2.1/Classes/Fighter.md`
  - `.references/srd-5.2.1/Classes/Rogue.md`
  - `.references/srd-5.2.1/Classes/Ranger.md`
  - `.references/srd-5.2.1/Classes/Cleric.md`
  - `.references/srd-5.2.1/Classes/Druid.md`
  - `.references/srd-5.2.1/Classes/Paladin.md`
  - `.references/srd-5.2.1/Classes/Bard.md`
  - `.references/srd-5.2.1/Classes/Monk.md`
  - `.references/srd-5.2.1/Feats.md`
  - `UBIQUITOUS_LANGUAGE.md`
- Focused verification passed:
  - `pnpm --dir packages/core exec vitest run src/character-domain.test.ts`
- Repo-wide verification attempted:
  - `pnpm quality`
  - still fails before typecheck on pre-existing Prettier drift in unrelated core files: `src/context-encoding.ts`, `src/creature.mbt.test.ts`, `src/features/spell-available-actions.ts`, `src/machine-event-extractors.ts`, `src/machine-monk.ts`, `src/machine-queries.ts`, `src/machine-startturn.ts`, `src/machine.ts`
- `/simplify` convergence:
  - Round 1: collapsed the two rejected branch shapes into one bounded character-domain model with explicit build choices and no off-scope script edits.
  - Round 2: split oversized validation/proficiency files into smaller modules (`character-build-choice-validation.ts`, `character-proficiency-data.ts`) and removed the remaining important duplication/structure issues.

Plan Impact:

- Status: applied
- Affected tasks:
  - `CHAR3`: marked `done`.
  - `CHAR4`: unblocked and promoted to `ready-for-implementation-after-light-research`.
  - `CHAR5`: no change; remains blocked behind `CHAR4`.
  - `CHAR7`: no change; still blocked behind `CHAR5`.

### Task 3 - CHAR4 - Equipment And Loadout Projection

Status: done.

Depends on: CHAR1, CHAR3.

Blocks: CHAR5.

Next action:

- Replace narrow starter-loadout assumptions with owned sheet equipment/loadout facts and project them into combat-facing hand, armor, shield, and weapon facts.

Acceptance criteria:

- Starting equipment is modeled as actual choices.
- The sheet owns combat-relevant loadout facts.
- Creature and battle projection consume sheet-owned loadout data rather than narrow temporary presets.

Closeout:

- Landed owned `equipment` facts on `CharacterDraft` / `CharacterSheet`, including background/class package-vs-gold choices, purchased combat-relevant items, recorded remaining starting gold, and a bounded combat loadout.
- Added SRD-backed combat equipment catalogs and starting-equipment package data for the current character-domain scope, keeping non-combat inventory simulation out of scope.
- Added loadout validation that enforces ownership counts and hand-occupancy constraints without inventing non-RAW automatic versatile-hand defaults.
- Added one-way battle projection from sheet-owned loadout facts into `mainHandWeapon`, `offHandWeapon`, `hasShieldEquipped`, `isWearingArmor`, and `mainHandUsesTwoHands`.
- Updated the transitional `fighterStartBattleLoadout` / `start_battle` path to source those fields from a finalized canonical `CharacterSheet` instead of a narrow hardcoded preset.
- Fixed the two-die weapon projection path so `greatsword` and `maul` preserve `diceCount: 2` through battle action resolution.

Verification:

- RAW check completed against `.references/srd-5.2.1/Character-Creation.md`, `.references/srd-5.2.1/Character-Origins.md`, `.references/srd-5.2.1/Classes/Fighter.md`, and `.references/srd-5.2.1/Equipment.md`, then cross-checked against `UBIQUITOUS_LANGUAGE.md`.
- Focused tests passed:
  - `pnpm --dir packages/core exec vitest run src/character-domain.test.ts src/available-actions.test.ts`
  - `pnpm --dir packages/mcp exec vitest run src/server.test.ts -t "start_battle promotes the router onto a battle host using the fighter snapshot and monster stat block"`
- Targeted lint passed on touched Task 3 files:
  - `pnpm --filter @dnd/core exec eslint --no-inline-config -c eslint.config.mjs ...`
  - `pnpm --filter @dnd/mcp exec eslint --no-inline-config -c eslint.config.mjs src/start-battle.ts src/server.test.ts`
- Additional repo gates:
  - `pnpm circular` passed.
  - `pnpm quality` is currently blocked by pre-existing Prettier drift in unrelated core files (`context-encoding.ts`, `creature.mbt.test.ts`, `features/spell-available-actions.ts`, `machine-event-extractors.ts`, `machine-monk.ts`, `machine-queries.ts`, `machine-startturn.ts`, `machine.ts`).
  - `pnpm --filter @dnd/core typecheck && pnpm --filter @dnd/mcp typecheck` is currently blocked by pre-existing unrelated core errors outside CHAR4-owned files.
- `/simplify` convergence:
  - Round 1: rejected the candidate branches' implicit versatile-hand defaults, missing ownership-count validation, and off-scope AC derivation; kept CHAR4 bounded to owned equipment/loadout facts plus battle-facing projection.
  - Round 2: split the new equipment implementation into smaller data/projection/validation modules to satisfy repo file-size constraints and removed the remaining important duplication/structure issues.

Plan Impact:

- Status: applied
- Affected tasks:
  - `CHAR4`: marked `done`.
  - `CHAR5`: unblocked and promoted to `ready-for-implementation-after-light-research`; it should now consume the owned equipment/loadout facts instead of re-deriving them from presets.
  - `CHAR6`: no change; remains blocked behind `CHAR5`.
  - `CHAR7`: no change; remains blocked behind `CHAR5`.

### Task 4 - CHAR5 - Sheet-Derived Numbers And Spellcasting Projection

Status: ready-for-implementation-after-light-research.

Depends on: CHAR1, CHAR2, CHAR3, CHAR4.

Blocks: CHAR6, CHAR7.

Next action:

- Derive executable sheet numbers and spellcasting facts from the canonical sheet, then project them into creature runtime and battle runtime while consuming CHAR4-owned equipment/loadout facts instead of hardcoded presets.

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
