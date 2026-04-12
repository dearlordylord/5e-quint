# POST1 - Formal Creation Semantics

Date: 2026-04-11

## Scope

This note closes POST1 as a research/design task. It does not add product code. It defines how Quint should become the durable owner of player-character creation semantics without replacing the landed `CharacterDraft` / `CharacterSheet` domain or pulling battle concerns into character creation.

## RAW Anchors

- `.references/srd-5.2.1/Character-Creation.md`
  - "Create Your Character" step order
  - "Level Advancement"
  - "Starting at Higher Levels"
  - "Multiclassing"
- `UBIQUITOUS_LANGUAGE.md`
  - keep the owned player-facing object a `character sheet`
  - keep runtime data as projection, not a second source of truth

## Current Foundation

The current TypeScript model already has the right ownership split:

- `packages/core/src/character-domain.ts`
  - `CharacterDraft` is the editable surface
  - `finalizeCharacterDraft` is the canonical legality gate
  - `CharacterSheet` is the finalized canonical result
- `packages/core/src/character-advancement.ts`
  - ordered `advancement` is the owned legality record for higher-level starts and multiclass entry timing
- `packages/core/src/character-sheet-derived.ts`
  - creature/battle-facing facts are projected from `CharacterSheet`
- `packages/app/src/components/character-creation/CharacterCreationPage.tsx`
  - the UI persists only `CharacterDraft` and delegates legality/finalization/projection to core
- `creature.qnt`
  - already owns reusable low-level creation/advancement rules such as XP thresholds, ASI helpers, first-level HP, level-up HP, multiclass prerequisites, and multiclass spell-slot math

The gap is not missing product ownership. The gap is that Quint still lacks a creation-side semantic surface that explains the landed TS model directly.

## Decision

Quint should add a creation-specific formal layer that mirrors the owned product concepts:

- editable draft
- finalizable sheet
- ordered advancement attached to that sheet
- one-way projection from finalized sheet to creature runtime

It should not reuse battle state, workflow step state, or existing runtime `CharConfig` as the semantic owner of creation.

## Proposed Formal Surfaces

Add a creation-focused Quint module, preferably separate from battle, for example `character_creation.qnt`, imported by `creature.qnt` where projection helpers are needed.

That module should define:

- `CharacterDraft`
  - partial/incomplete creation input
  - mirrors the owned TS draft shape closely enough for parity tests
- `CharacterSheet`
  - finalized canonical player-character record
  - includes ordered `advancement` as the legality source for class progression
- `CharacterCreationIssue`
  - illegal or contradictory state
- `finalizeCharacterDraft(draft): Option[CharacterSheet]` plus issue-returning companion
  - canonical finalization semantics
- `projectCharacterSheet(sheet)`
  - pure projection into creature-runtime-facing records

POST1 does not require `OpenChoices` yet. POST2 should add that on top of this same draft/sheet foundation rather than inventing a separate workflow model.

## Ownership Boundary

The formal ownership boundary should be:

- creation semantics owned by `CharacterDraft` and `CharacterSheet`
- advancement legality owned by ordered `advancement`
- runtime execution owned by creature/battle projections derived from `CharacterSheet`

It should explicitly not be:

- workflow-step position
- app-local validation state
- battle init payloads
- runtime `CharConfig` itself

`CharConfig` should be treated as a projection target. If its current field names or shape obscure that, POST4 can rename or reshape it, but the ownership decision is already clear now.

## Minimal Function Set

The durable pure-function story should be:

- `draft -> validation issues`
- `draft -> finalized sheet`
- `sheet -> creature runtime projection`

With ordered advancement already present, POST3 should extend this to:

- `sheet -> level-up requirements`
- `sheet + advancement entry -> next sheet`

This keeps higher-level starts explainable as:

1. create a legal level-1 sheet
2. replay legal advancement entries in order
3. project the finalized sheet into runtime

That matches SRD text in "Starting at Higher Levels" and avoids a second bootstrap path.

## Mapping To Existing Quint Work

The new formal layer should reuse, not replace, existing creature helpers:

- XP / total-level helpers
- ASI / Epic Boon timing helpers
- multiclass prerequisite helpers
- first-level and level-up HP helpers
- multiclass spell-slot helpers

What changes is the semantic wrapper around those helpers: they should be applied to `CharacterDraft` / `CharacterSheet`-like records rather than only to ad hoc runtime config paths.

## Projection Boundary

Projection should stay one-way:

- `CharacterSheet`
  -> derived numbers
  -> spellcasting/loadout/resource projections
  -> creature runtime config/state
  -> battle init input

No downstream runtime record should become an alternate owner of:

- background
- species choice history
- languages
- alignment
- feat/subclass advancement choices
- equipment selection history

If runtime needs a fact that already exists on the sheet, project it. Do not duplicate it as a second authored field.

## Consequences For Downstream Tasks

- `POST2` can now build `OpenChoices` and selective invalidation on top of a settled draft/sheet boundary.
- `POST3` can now formalize advancement as repeated sheet transitions instead of inventing a separate leveling abstraction.
- `POST4` should converge app/runtime surfaces onto this formal layer and may need to rename runtime-facing records to make projection ownership more obvious.

## Recommended Implementation Order

1. Add creation-side Quint record types aligned with the landed TS domain.
2. Move or wrap existing creature creation/advancement helpers behind draft/sheet-focused pure functions.
3. Add parity-style tests that compare Quint finalization/projection semantics with the owned TS character domain.
4. Implement `OpenChoices` and dependency-aware invalidation in POST2 on the same records.
5. Implement repeated level-up transitions in POST3 on the same records.

## Non-Goals

- no battle-owned character creation semantics
- no workflow-state semantic ownership
- no adapter-owned registry of player characters
- no parallel "formal draft" with a different fact model than the landed TS draft
- no monster/stat-block refactor as part of POST1
