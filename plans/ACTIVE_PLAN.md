# Active Plan

Date: 2026-04-11

This is the single active planning queue.

The previous MCP/battle follow-up queue is complete and has been removed from the active file. The active queue now contains two coordinated tracks:

- the character-creation program defined in [PRD_CHARACTER_CREATION.md](../PRD_CHARACTER_CREATION.md);
- the monster-database tracer-bullet rollout defined in [PRD_MONSTER_DATABASE.md](../PRD_MONSTER_DATABASE.md) and [monster-database-plan.md](./monster-database-plan.md).

## Batch Objective

Land the current bounded implementation slices for SRD 5.2.1 character creation/character-sheet projection and the SRD monster database without:

- duplicating character facts across app, MCP, creature runtime, or battle runtime;
- duplicating monster-authored facts across core, MCP, app, or battle/runtime projections;
- widening the main battle machine into a character builder;
- introducing adapter-owned character registries;
- introducing adapter-owned monster registries;
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
      "status": "done",
      "title": "Sheet-Derived Numbers And Spellcasting Projection"
    },
    {
      "number": 5,
      "id": "CHAR6",
      "status": "done",
      "title": "Guided Workflow Shell"
    },
    {
      "number": 6,
      "id": "CHAR7",
      "status": "ready-for-implementation-after-light-research",
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
    },
    {
      "number": 13,
      "id": "MON1",
      "status": "done",
      "title": "Canonical Goblin Tracer Bullet"
    },
    {
      "number": 14,
      "id": "MON2",
      "status": "ready-for-implementation-after-light-research",
      "title": "Second Monster Tracer Bullet"
    },
    {
      "number": 15,
      "id": "MON3",
      "status": "blocked",
      "title": "Advanced Pattern Tracer Bullet"
    },
    {
      "number": 16,
      "id": "MON4",
      "status": "blocked",
      "title": "Hand-Authored SRD Dataset Expansion"
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
| 4 | CHAR5 - Sheet-Derived Numbers And Spellcasting Projection | done | CHAR1, CHAR2, CHAR3, CHAR4 | CHAR6, CHAR7 | Landed owned spellcasting selections plus one `CharacterSheet` derivation path for sheet numbers, `DndMachineInput`, and battle init projection. | Complete |
| 5 | CHAR6 - Guided Workflow Shell | done | CHAR1, CHAR2, CHAR5 | none | Landed a thin `/character` workflow shell that persists `CharacterDraft`, keeps step order in the app surface, and renders canonical finalization plus derived projection outputs without UI-owned validation. | Complete |
| 6 | CHAR7 - Level Advancement And Multiclass Continuation | ready-for-implementation-after-light-research | CHAR1, CHAR3, CHAR5 | none | Implement ordered level-up transitions over `CharacterDraft` / `CharacterSheet` with advancement history as the canonical legality record for higher-level starts and multiclass continuation. Model the full level-gated advancement choice surface needed for legality and downstream derivation: class taken each level, subclass selections when they occur, Ability Score Improvement feat choices, alternative feat choices where allowed, and level-19 Epic Boon choices. Reuse `creature.qnt` as the semantic source for XP thresholds, multiclass legality, HP growth, hit-die growth, proficiency progression, and caster-level/slot behavior, but align any stale helper semantics to SRD 5.2.1 before relying on them. Keep finalized `CharacterSheet` and `deriveCharacterSheetNumbers` as the single downstream projection path, and do not keep `classLevels` and advancement history as contradictory peer-owned facts. | Ready only if implementation treats ordered advancement as the canonical legality surface, includes feat/ASI/Epic Boon choices where they affect legality or derivation, and removes stale SRD cadence assumptions before landing |
| 7 | H - PassiveModifiers Sub-Record | deferred | none | none | Keep deferred. Do not pick up unless the batch objective changes back toward MCP/action-surface cleanup. | Explicitly outside the current batch |
| 8 | I - Build-Map / Hole Metadata | deferred | none | none | Keep deferred. Do not pick up unless the batch objective changes back toward MCP/action-surface cleanup. | Explicitly outside the current batch |
| 9 | POST1 - Formal Creation Semantics | blocked | CHAR6, CHAR7 | POST2, POST4 | Once the current `CHAR` sequence is complete, formalize the creation draft/sheet semantics in Quint, keeping the landed TS character domain as the implementation baseline and parity target rather than rewriting the product shape from scratch. | Future post-`CHAR` phase; depends on current workflow and advancement research landing |
| 10 | POST2 - Open Choices And Selective Invalidation | blocked | POST1 | POST4 | Build the explicit `open choices` / `validation issues` / dependency-aware invalidation model on top of the immutable `CHAR` foundation so guided workflows can distinguish incompleteness from illegality. | Depends on formal creation semantics |
| 11 | POST3 - Formal Advancement And Higher-Level Starts | blocked | CHAR7, POST1 | POST4 | Formalize advancement as repeated legal level-up transitions over the same canonical sheet, then use that path for higher-level starts rather than bespoke bootstrapping. | Depends on advancement research plus formal creation semantics |
| 12 | POST4 - Workflow And Projection Convergence | blocked | POST1, POST2, POST3 | none | Converge the guided workflow shell and runtime projections onto the formal creation/advancement surfaces without introducing a second semantic model. | Final post-`CHAR` integration phase |
| 13 | MON1 - Canonical Goblin Tracer Bullet | done | none | MON2 | Landed canonical goblin `StatBlock` records with explicit SRD provenance and one projection path into generic battle/MCP surfaces. | Complete |
| 14 | MON2 - Second Monster Tracer Bullet | ready-for-implementation-after-light-research | MON1 | MON3, MON4 | Add one non-goblin SRD monster through the same core-owned `StatBlock` and projection path. Prefer a monster that proves a materially different slice, but avoid new shared generic facilities unless the RAW forces them. | Ready if kept to catalog/schema/projection work and scoped away from shared runtime refactors owned by post-`CHAR` convergence |
| 15 | MON3 - Advanced Pattern Tracer Bullet | blocked | MON2 | MON4 | Add one advanced monster that proves a repeated pattern such as recharge, legendary actions, or a stronger multiattack shape through a generic facility. Sequence this after MON2 and coordinate with shared runtime/projection work so it does not race `POST4`. | Blocked on a stable non-goblin baseline plus shared-surface sequencing |
| 16 | MON4 - Hand-Authored SRD Dataset Expansion | blocked | MON2, MON3 | none | Expand from the tracer bullets to the agreed SRD monster dataset, keeping unsupported patterns explicit and preserving core-owned provenance. | Blocked on tracer-bullet validation of schema and advanced-generic-facility path |

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
- Monster-authored data must remain core-owned and project exactly once into runtime/battle surfaces; MCP and app consume IDs or projections, not their own monster registries.
- Shared battle/runtime facilities are sequenced resources: character and monster work may both use them, but only one task should reshape them at a time.

Planning note:

- `CHAR1` through `CHAR7` are treated as immutable foundation for any appended work below.
- The post-`CHAR` queue is additive only; it does not revise the completed or in-flight `CHAR` tasks.
- New work should extend the landed character-domain/product shape toward the revised PRD semantics rather than reopening the earlier ownership decisions.
- `MON1` through `MON4` are the active monster track. They should reuse the landed monster ownership/provenance boundary and avoid racing `POST4` on shared projection/runtime refactors.

## Task Selection Guidance

Recommended next coding-loop task:

1. **CHAR7 - Level Advancement And Multiclass Continuation**
   CHAR6 landed the thin workflow shell. The next slice should research how advancement extends the same owned character domain and reuses the landed sheet-derived projection path instead of inventing a parallel higher-level-start surface.
2. **MON2 - Second Monster Tracer Bullet**
   This is the safe parallel monster task as long as it stays on catalog/schema/provenance/projection work and does not introduce a new shared generic runtime facility.

Do not jump ahead to workflow/UI work before the canonical domain exists. Do not solve character creation by widening `DndMachineInput`, `BATTLE_INIT`, or adapter-owned metadata.
Do not start `MON3` before checking whether the needed generic facility would collide with active shared-surface work in `POST4` or other runtime/projection refactors.

## Recommended Coding Loop

1. Read [PRD_CHARACTER_CREATION.md](../PRD_CHARACTER_CREATION.md) and [character-creation-plan.md](./character-creation-plan.md) alongside:
   - [ARCHITECTURE.md](../ARCHITECTURE.md)
   - [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md)
   - [.references/srd-5.2.1/Character-Creation.md](../.references/srd-5.2.1/Character-Creation.md)
   - [.references/srd-5.2.1/Character-Origins.md](../.references/srd-5.2.1/Character-Origins.md)
   - [creature.qnt](../creature.qnt)
2. Execute CHAR7 next.
3. Monster work may proceed in parallel only on MON2 while it remains a catalog/provenance/projection slice and does not add a new shared generic runtime facility.
4. Keep `POST1` through `POST4` as the additive post-`CHAR` queue described above once CHAR7 lands.
5. Keep `MON3` and `MON4` blocked until the tracer-bullet sequence proves the shared-surface path.
6. Keep H and I deferred unless this file is explicitly reprioritized.

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

Status: done.

Depends on: CHAR1, CHAR2, CHAR3, CHAR4.

Blocks: CHAR6, CHAR7.

Closeout:

- Extended `CharacterDraft` / `CharacterSheet` with owned class-keyed spellcasting selections, including Wizard spellbooks where the SRD requires them.
- Landed `character-sheet-derived.ts` as the single derivation path for HP, Hit Dice, AC, initiative, saves, skills, passive Perception, slot state, spell save DC, spell attack bonus, machine input projection, and battle init projection.
- Threaded battle init to consume projected slot state and projected readyable spell payloads instead of rebuilding them from the old caster preset.
- Kept generic non-sheet runtime fallbacks intact for existing callers, but the owned sheet projection path now supplies prepared spells and slots directly so the character path no longer relies on runtime guessing.

Acceptance criteria:

- HP, Hit Dice, AC, initiative, saves, skills, passive Perception, slot structures, spell save DC, and spell attack bonus derive from one owned path.
- Known/prepared spell choices are owned sheet facts, not runtime guesses.
- Creature and battle runtime projection consume those owned facts without re-deriving them elsewhere.

Verification:

- RAW check completed against `.references/srd-5.2.1/Classes/Bard.md`, `Cleric.md`, `Ranger.md`, `Sorcerer.md`, `Wizard.md`, and `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`, then cross-checked with `UBIQUITOUS_LANGUAGE.md` entries for Spell Save DC, Spell Attack, and Caster Type.
- Focused tests passed: `cd packages/core && pnpm exec vitest run src/character-domain.test.ts src/character-sheet-derived.test.ts`.
- Repo-required verification ran: `pnpm quality`. It still fails in pre-existing `packages/core` Prettier-check files outside CHAR5 (`src/context-encoding.ts`, `src/creature.mbt.test.ts`, `src/machine-event-extractors.ts`, `src/machine-monk.ts`, `src/machine-queries.ts`, `src/machine-startturn.ts`, `src/machine.ts`).
- `/simplify` convergence:
  - Round 1: extracted spellcasting tables/rule-threshold helpers into `character-spellcasting-data.ts` and trimmed the integration slice to stay under repo file-size limits.
  - Round 2: removed unnecessary `character-domain.ts` spellcasting re-exports and kept the owned derivation path split at the canonical-domain boundary; no further important simplifications remained.

Plan Impact:

- Status: applied
- Affected tasks:
  - `CHAR5`: marked `done`.
  - `CHAR6`: unblocked and promoted to `ready-for-research`.
  - `CHAR7`: unblocked and promoted to `ready-for-research`.
- Plan edits: updated task statuses, queue guidance, and CHAR5 closeout/verification notes.

### Task 5 - CHAR6 - Guided Workflow Shell

Status: done.

Depends on: CHAR1, CHAR2, CHAR5.

Blocks: none.

Closeout:

- Landed `/character` in `packages/app` as the thinnest product shell that keeps the SRD step order in UI state while storing only `CharacterDraft`.
- Added local-storage draft persistence, example loaders, and step navigation without draft sanitization or workflow-owned derivation tables.
- Reused direct domain finalization plus `deriveCharacterSheetNumbers`, `characterSheetMachineInput`, and `characterSheetBattleProjection` for the review surface.
- Kept complex Step 5 ownership in the draft by editing `choices`, `equipment`, and `spellcasting` as raw JSON instead of recreating class-specific rule logic in the app.

Acceptance criteria:

- The product can guide a user through SRD creation steps while persisting `CharacterDraft`.
- The workflow shell does not duplicate derivation or validation logic.
- Finalization produces the same `CharacterSheet` as direct domain-level finalization.

Verification:

- RAW/product-language check completed against `.references/srd-5.2.1/Character-Creation.md`, `.references/srd-5.2.1/Character-Origins.md`, and `UBIQUITOUS_LANGUAGE.md` to keep the UI step order aligned with the SRD sequence and with the repo's `CharacterDraft` / `CharacterSheet` terminology.
- Focused app verification passed: `pnpm --filter @dnd/app test -- CharacterCreationPage`
- Focused touched-file lint passed: `pnpm --filter @dnd/app exec eslint src/components/character-creation src/entry.tsx`
- `/simplify` convergence:
  - Round 1: rejected both Ralph candidate patches, then replaced them with a thinner shell that removed UI-side issue-code mapping and destructive draft sanitization.
  - Round 2: split the page into shell, step-content, presets, and shared helpers to satisfy the app file-size cap and remove mutable helper code; no further important simplifications remained.

Plan Impact:

- Status: applied
- Affected tasks:
  - `CHAR6`: marked `done`.
  - `CHAR7`: no dependency change, but it becomes the recommended next task now that the workflow shell exists.
  - `POST1`: no status change; it remains blocked on `CHAR7` in addition to `CHAR6`.

### Task 6 - CHAR7 - Level Advancement And Multiclass Continuation

Status: ready-for-implementation-after-light-research.

Depends on: CHAR1, CHAR3, CHAR5.

Blocks: none.

Next action:

- Implement an owned `advancement` / level-history record on the character domain and make it the canonical source for validating higher-level starts and multiclass continuation.
- Record every legality-relevant advancement choice in order: gained class each level, subclass picks when they occur, Ability Score Improvement feat choices, alternative feat choices, and level-19 Epic Boon choices.
- Validate multiclass entry against the character state that existed at the moment the new class level was taken, not only against final-sheet scores.
- Derive aggregate class totals, proficiency-sensitive values, HP/hit dice growth, and caster-level/slot projections from that ordered history through the existing finalization and sheet-derivation path.
- Align TS helpers, `creature.qnt`, and `UBIQUITOUS_LANGUAGE.md` to SRD 5.2.1 where current repo helpers still encode stale level-19 ASI assumptions.
- Model the full ordered advancement choice surface rather than only class totals: each gained class level, score-changing feat/ASI choices, and level-19 Epic Boon choices where they affect legality or downstream derivation.
- Align repo-owned traceability helpers to SRD 5.2.1 before depending on them; level 19 is an Epic Boon feature, not an Ability Score Improvement.

Acceptance criteria:

- Higher-level starts are represented as legal ordered advancement over the same owned character domain, not a bespoke bootstrap path.
- The character domain can represent all advancement choices needed to determine legality and downstream derivation for this slice, including feat/ASI and level-19 Epic Boon decisions.
- Multiclass legality is checked at the time of class entry using the character state that existed at that step.
- The implementation does not keep contradictory peer-owned `classLevels` and advancement history state.
- Advancement updates HP, hit dice, proficiency-sensitive values, features, and slot structures through one derivation path.

Research closeout:

- RAW check completed against `.references/srd-5.2.1/Character-Creation.md` multiclassing and higher-level-start text, plus `UBIQUITOUS_LANGUAGE.md`.
- `creature.qnt` already owns the reusable advancement semantics this task needs: XP thresholds (`pXpForLevel`), ASI levels (`ASI_LEVELS` / `pIsASILevel` / `pApplyASI`), multiclass prerequisite helpers, first-level HP, level-up HP, class-level aggregation, and multiclass caster-level/slot helpers.
- The landed TS character layer already has the downstream projection path this task should feed: `deriveCharacterSheetNumbers`, class-resource derivation, and battle-init projection from finalized `CharacterSheet`.
- Therefore CHAR7 should not ship a standalone TS advancement rules engine. The implementation should add the minimal ordered advancement input needed to reuse the existing sheet finalization/projection flow and to preserve parity with Quint-owned semantics.
- Higher-level starts must preserve the ordered advancement history needed to verify each multiclass entry when it happened. Terminal validation against only the final post-ASI ability scores is too weak and would admit illegal builds.

Verification:

- Read `.references/srd-5.2.1/Character-Creation.md` for multiclass prerequisites, level advancement, and higher-level starts.
- Read `UBIQUITOUS_LANGUAGE.md` to confirm advancement remains on the owned `CharacterDraft` / `CharacterSheet` boundary and runtime facts remain projections.
- Inspected the current TS and Quint ownership surfaces (`packages/core/src/character-domain.ts`, `packages/core/src/character-sheet-derived.ts`, `packages/core/src/features/class-tables.ts`, `packages/core/src/machine-spells.ts`, `creature.qnt`) plus both Ralph implementation worktrees and review reports.
- Did not run MBT because CHAR7 closeout in this merge is research/plan-only and the repo guidance forbids battle MBT for research tasks.

Plan Impact:

- Status: applied
- Affected tasks:
  - `CHAR7`: keep the task open and tighten the implementation handoff around ordered advancement choices, feat/ASI recording, and SRD-accurate Epic Boon handling.
  - `POST3`: no status change; formal advancement should consume the same ordered-transition model discovered here.

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

- Formalize the creation-side semantic model in Quint using the landed `CharacterDraft` / `CharacterSheet` product shape as foundation rather than replacing it.
- Model the canonical creation surfaces needed to explain an editable draft, a finalizable sheet, and projection from sheet to creature runtime.
- Keep battle out of character creation while making the formal layer the durable owner of creation semantics that should not drift over time.

Acceptance criteria:

- The plan for formal creation semantics treats the existing `CHAR` work as foundation, not as throwaway implementation.
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

### Task 13 - MON1 - Canonical Goblin Tracer Bullet

Status: done.

Depends on: none.

Blocks: MON2.

Closeout:

- Landed canonical goblin `StatBlock` records with explicit SRD provenance and authored sections.
- Landed structural executable-vs-text-only monster ability types.
- Landed one projection path from core-owned monster records into generic battle/MCP monster-init surfaces.

Verification:

- Verified in code via `packages/core/src/monster-types.ts`, `packages/core/src/monster-catalog.ts`, `packages/core/src/monster-catalog-goblins.ts`, and the focused catalog/MCP tests already present in the repo.

### Task 14 - MON2 - Second Monster Tracer Bullet

Status: ready-for-implementation-after-light-research.

Depends on: MON1.

Blocks: MON3, MON4.

Next action:

- Add one non-goblin SRD monster through the same owned `StatBlock` and projection path.
- Prefer a monster that proves a materially different slice from goblins, such as spellcasting structure or a text-only unsupported authored ability.
- Keep the slice bounded to catalog/schema/provenance/projection work unless the RAW makes a new shared generic facility unavoidable.

Acceptance criteria:

- At least one non-goblin SRD monster can be added without introducing a monster-specific runtime handler.
- The new monster cites SRD provenance directly on the owned record.
- The new monster reuses the same `StatBlock` and projection path as goblins.
- Any unsupported authored ability on this monster is preserved structurally as text-only data instead of being dropped or silently improvised.

Verification:

- Read the relevant SRD monster passage in `.references/srd-5.2.1/Monsters/` and cross-check `UBIQUITOUS_LANGUAGE.md` before implementation.
- Prefer focused catalog/projection tests over MBT. Do not run battle MBT unless the task actually changes battle semantics.

### Task 15 - MON3 - Advanced Pattern Tracer Bullet

Status: blocked.

Depends on: MON2.

Blocks: MON4.

Next action:

- After MON2 lands, add one monster that proves a repeated advanced pattern such as recharge, legendary actions, or a stronger multiattack shape through a generic facility.
- If a new shared runtime/projection facility is required, coordinate that change against the post-`CHAR` convergence queue before implementation so the same files are not being reshaped in parallel.

Acceptance criteria:

- At least one repeated advanced monster pattern is handled through a generic facility.
- The chosen monster uses that generic facility through canonical authored sections rather than bespoke runtime code.
- Unsupported advanced clauses remain present as text-only entries with explicit reasons instead of being silently discarded.
- Public battle and MCP surfaces remain generic after the slice lands.

### Task 16 - MON4 - Hand-Authored SRD Dataset Expansion

Status: blocked.

Depends on: MON2, MON3.

Blocks: none.

Next action:

- Expand from the tracer-bullet monsters to the agreed hand-authored SRD dataset once the schema and advanced-pattern path are proven.
- Keep unsupported patterns explicit so later generic-facility work has a grounded queue.

Acceptance criteria:

- The agreed SRD monster dataset exists as hand-authored core-owned stat block data with explicit SRD provenance.
- New monster additions are primarily data entry and projection, not monster-specific engine work.
- The project has an explicit report or audit view of unsupported ability patterns to drive later generic-facility work.
- MCP, app, and other adapters continue consuming the core-owned stat block collection instead of maintaining parallel monster registries.
