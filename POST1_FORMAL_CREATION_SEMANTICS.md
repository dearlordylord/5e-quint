# POST1 - Formal Creation Semantics

Date: 2026-04-11
Status: archived research note; superseded as the primary implementation brief by [PRD_CHARACTER_FORMALIZATION.md](./PRD_CHARACTER_FORMALIZATION.md), [character-creation.qnt](./character-creation.qnt), and [character.qnt](./character.qnt)
Depends on: CHAR6, CHAR7
Blocks: POST2, POST3, POST4

## Scope

## Status Note

This note records the first formal-creation research closeout. It is no longer the current source of truth for the implementation program.

Use [PRD_CHARACTER_FORMALIZATION.md](./PRD_CHARACTER_FORMALIZATION.md) for the current design brief. The current landed authority for the projection boundary is `character.qnt:pCharacterCreatureProjection` plus `character.qnt:pProjectionToCharConfig`, with the TypeScript runtime side implemented through `packages/core/src/character-sheet-creature-projection.ts:characterSheetCreatureProjection()`. In particular, this note predates the later decision to split the formal character work into:

- `character-creation.qnt` for draft, open-choice, incompleteness, legality, and finalization semantics;
- `character.qnt` for finalized-sheet advancement and character-to-creature projection semantics.

This note closes POST1 as a research/design task. It does not add Quint or TypeScript implementation yet. It defines the formal creation surface that later tasks must implement without replacing the landed `CharacterDraft` / `CharacterSheet` domain or moving creation ownership into workflow state or battle/runtime config.

## RAW And Language Anchors

The design is grounded in these local sources:

- `.references/srd-5.2.1/Character-Creation.md`
  - `Create Your Character`
  - `Step 1: Choose a Class`
  - `Step 2: Determine Origin`
  - `Step 3: Ability Scores`
  - `Step 5: Character Creation Details`
  - `Level Advancement`
  - `Starting at Higher Levels`
  - `Multiclassing`
- `.references/srd-5.2.1/Character-Origins.md`
  - background-granted ability increases, feat, skills, tools, and equipment
  - species-owned size, speed, and special traits
- `UBIQUITOUS_LANGUAGE.md`
  - keep the owned player-facing object a `character sheet`
  - keep runtime data as projection rather than a second authored source of truth

## Existing Foundation

The current TypeScript domain already has the right ownership split:

- `packages/core/src/character-domain.ts`
  - `CharacterDraft` is the editable authored surface
  - `CharacterSheet` is the canonical finalized PC record
  - `finalizeCharacterDraft()` is the current legality gate
- `packages/core/src/character-feature-types.ts`
  - `CharacterAdvancementEntry` and feat/subclass choice types already exist
- `packages/core/src/character-advancement.ts`
  - `validateAndReplayAdvancement()` already treats ordered `advancement` as the legality-relevant history
- `packages/core/src/character-sheet-derived.ts`
  - `deriveCharacterSheetNumbers()`
  - `characterSheetCreatureProjection()`
  - `characterSheetMachineInput()`
  - `characterSheetBattleProjection()`
  - all are one-way projections from finalized sheet state
- `packages/app/src/components/character-creation/CharacterCreationPage.tsx`
  - the workflow shell persists only `CharacterDraft` and delegates legality/projection to core
- `creature.qnt`
  - already owns reusable low-level rules such as multiclass prerequisites, total-level aggregation, ASI timing/application, HP growth, and multiclass spell-slot helpers

The gap is not missing product ownership. The gap is that Quint still lacks a creation-side semantic layer that explains this landed draft/sheet/projection model directly.

## Decision

POST1 is additive, not corrective.

- Do not replace `CharacterDraft` / `CharacterSheet` with a second product model.
- Do not make workflow step position the semantic owner of completeness or legality.
- Do not treat `CharConfig`, `DndMachineInput`, or battle init payloads as the canonical character-creation record.

Instead, Quint should own a creation-specific formal layer that mirrors the landed TS boundary:

1. editable draft
2. legal finalized sheet
3. ordered advancement attached to that sheet
4. one-way projection from finalized sheet to creature runtime

## Formal Module

Add a new Quint module named `character.qnt`.

Responsibilities:

- creation-side record types aligned with the landed TS domain
- legality/finalization predicates over draft and finalized sheet state
- legal advancement transitions over finalized sheets
- pure projection from finalized sheet to creature-facing runtime config

Non-responsibilities:

- battle state
- workflow UI state
- MCP-owned character schemas

`character.qnt` should import creation/advancement helper logic from `creature.qnt`; it should not import from `battle.qnt`.

## Core Formal Types

### `CharacterDraft`

An editable, possibly partial record aligned with `packages/core/src/character-domain.ts`.

It owns unresolved authored choices such as:

- class choice
- ordered `advancement`
- background
- species
- ability-score generation inputs
- background ability-score increase
- languages
- alignment
- build/equipment/spellcasting choices

Partiality belongs here.

### `CharacterSheet`

The canonical finalized player-character record aligned with the landed TS `CharacterSheet`.

It owns the same categories of authored facts the rest of the stack consumes:

- primary class
- ordered `advancement`
- class progression facts
- background
- ability-score generation and resolved scores
- species
- languages
- alignment
- legality-relevant build choices
- equipment choices
- spellcasting choices when present

Formal rule: ordered `advancement` is the canonical progression history. Any class-level summary exposed on the sheet is derived from that history in the formal model, even if TS currently caches both.

### `AdvancementEntry`

A formal counterpart to `CharacterAdvancementEntry`:

- `className`
- optional subclass selection for the level where subclass ownership becomes required
- optional feat / ASI / Epic Boon selection for the level where one becomes required

### `AdvancementFeatChoice`

The formal counterpart to the landed feat-selection surface used during advancement.

It must cover, at minimum:

- ASI choices
- general feat choices
- Epic Boon choices

POST1 does not require expanding feat mechanics in Quint yet; it requires defining the owned creation-semantic slot they occupy.

## Core Formal Functions

### `isLegalSheet(sheet: CharacterSheet): bool`

The authoritative legality predicate for a finalized sheet.

This function should express, at minimum:

- finalized sheet completeness
- ordered advancement consistency
- primary-class consistency with first advancement entry
- legal class/level totals
- multiclass prerequisite legality
- subclass timing legality
- ASI / feat / Epic Boon timing legality
- legality of the authored sheet facts needed by runtime projection

Relationship to TS:

- Quint owns the predicate
- `finalizeCharacterDraft()` in TS is a concrete implementation of that predicate over the landed draft/sheet model

### `canAdvance(sheet: CharacterSheet, entry: AdvancementEntry): bool`

Predicate for whether a proposed next advancement entry is legal from the current finalized sheet.

This covers:

- level cap enforcement
- multiclass-entry legality
- subclass timing
- feat / ASI / Epic Boon timing
- any class-specific transition prerequisites already owned by the landed advancement domain

### `advanceLevel(sheet: CharacterSheet, entry: AdvancementEntry): CharacterSheet`

Pure legal transition from one finalized sheet to the next.

Semantically:

- append the ordered advancement entry
- derive the new class progression from that history
- apply the advancement-owned choice consequences
- return the next finalized sheet

This is the durable explanation for higher-level starts. Higher-level characters are not a separate bootstrap path; they are the result of repeated legal transitions from a legal level-1 sheet.

### `sheetToCharConfig(sheet: CharacterSheet): CharConfig`

One-way projection from finalized sheet semantics into creature-facing runtime semantics.

Responsibilities:

- project only execution-facing facts needed by `creature.qnt`
- keep authored ownership on the sheet
- keep battle as a downstream consumer of runtime projection, not a co-owner of creation semantics

This function is the formal boundary that explains the existing TS projection path in `character-sheet-derived.ts`.

## Five Formal Properties

### P1. Advancement Preserves Legality

If `isLegalSheet(sheet)` and `canAdvance(sheet, entry)`, then `isLegalSheet(advanceLevel(sheet, entry))`.

### P2. Projection Is Deterministic

For any legal sheet, repeated evaluation of `sheetToCharConfig(sheet)` yields the same result.

### P3. Higher-Level Start Equivalence

A higher-level character built directly from a legal finalized sheet must be semantically equivalent to one produced by:

1. legal level-1 start
2. repeated legal `advanceLevel` transitions
3. projection through `sheetToCharConfig`

### P4. Advancement History Is Canonical

Ordered `advancement` is the canonical legality history for class progression, multiclass entry, subclass timing, and level-gated feat choices. The formal model must not introduce a second independent leveling source of truth.

### P5. Projection Boundary Is One-Way

Runtime projections may forget authored creation details, but they must never become alternate semantic owners of those details. If a runtime consumer needs a fact already present on the sheet, the system must project it from the sheet rather than re-author it elsewhere.

## MBT Parity Strategy

POST1 itself does not run MBT because it lands only documentation/planning artifacts. The parity strategy for downstream implementation is:

- stay on creature-level verification, not battle MBT, because battle is explicitly out of scope here
- use Tier 1b cost where possible once `character.qnt` exists

Planned parity surfaces:

1. sheet legality parity
   - compare Quint legality/finalization results with TS `finalizeCharacterDraft()`
2. advancement parity
   - compare Quint `canAdvance` / `advanceLevel` with TS `validateAndReplayAdvancement()`
3. projection parity
   - compare Quint `sheetToCharConfig` with the creature-facing subset of `character-sheet-derived.ts`

This keeps the POST1 line honest: creation semantics live in a creation module and project into runtime; battle parity is unnecessary until POST4 convergence work.

## Consequences For Downstream Tasks

### POST2

Build on POST1 by adding:

- `open choices`
- `validation issues`
- dependency-aware invalidation on the draft/sheet boundary

These must remain distinct concepts. Incompleteness is not the same thing as contradiction.

### POST3

Implement:

- `canAdvance`
- `advanceLevel`
- higher-level starts as repeated legal transitions

This task should preserve ordered `advancement` as the canonical legality history rather than inventing a second higher-level-start model.

### POST4

Converge workflow and runtime surfaces onto the formal creation boundary from POST1 plus the concrete implementations from POST2 and POST3.

## Non-Goals

- no battle-owned creation semantics
- no workflow-state semantic ownership
- no adapter-owned player-character registry
- no second creation model detached from the landed TS draft/sheet domain
- no monster/stat-block refactor as part of POST1
