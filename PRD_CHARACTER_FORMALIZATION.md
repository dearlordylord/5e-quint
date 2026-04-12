# PRD: Quint-Driven Character Creation And Advancement

Date: 2026-04-12

Status: Draft

Owner: Core / Quint architecture

## Problem Statement

The repo now has a substantial TypeScript character domain, but the formal ownership line is still incomplete.

Today, the project has:

- a canonical TypeScript `CharacterDraft` / `CharacterSheet` split;
- ordered advancement history as the legality-relevant record for higher-level starts and multiclass continuation;
- one-way projection from finalized sheet state into creature-facing and battle-facing runtime inputs;
- a thin character workflow that correctly avoids becoming a second rules engine.

But it does not yet have:

- a dedicated Quint model for character creation;
- a dedicated Quint model for character advancement over finalized characters;
- formal open-choice and incomplete-state semantics on the character-creation side;
- formal parity between TypeScript character logic and Quint character logic.

This leaves the project in an unstable middle state:

- combat is Quint-driven;
- character creation and leveling are only Quint-aligned by design intent and TypeScript structure;
- the repo has design notes for a formal character layer, but not the formal character layer itself.

The result is a correctness gap. The project has already decided that battle semantics belong in Quint and that runtime surfaces should be projections from canonical authored state. Character creation and level advancement should follow the same principle instead of remaining only partially formalized.

The governing boundary is:

- In peace you're a character; in combat you're a creature.

That means:

- outside combat, the canonical player-facing authored object is a character;
- entering runtime or battle projects character facts into creature-facing execution facts;
- combat must never become the owner of character-creation facts.

## Solution

Introduce two formal Quint modules for the player-character domain:

- `character-creation.qnt`
- `character.qnt`

The split is intentional.

`character-creation.qnt` owns:

- editable draft semantics;
- open required choices;
- incomplete versus illegal state;
- finalization from draft into canonical finalized character state.

`character.qnt` owns:

- finalized character-sheet semantics;
- legal advancement over finalized character sheets;
- higher-level starts as level-1 creation plus repeated legal advancement transitions;
- projection from finalized character semantics into creature-facing execution semantics.

The overall pipeline becomes:

- `CharacterDraft` -> open choices / legality / finalization in `character-creation.qnt`
- finalized `CharacterSheet` -> advancement semantics in `character.qnt`
- finalized `CharacterSheet` -> formal combat-ready character projection
- formal combat-ready character projection -> creature-facing runtime projection
- creature-facing runtime projection -> battle-facing runtime projection

This design preserves the repo's ownership rules:

- player-authored creation facts are owned on the character side;
- runtime facts are derived projections;
- combat owns combat state, not authored character state.

## Goals

- Make character creation Quint-driven rather than only Quint-aligned.
- Make level advancement Quint-driven rather than only Quint-aligned.
- Keep character creation distinct from combat semantics.
- Keep level 1 creation distinct from level advancement.
- Make higher-level starts semantically equal to legal level-1 creation followed by repeated legal level-ups.
- Keep the UI and adapter layers thin and non-authoritative.
- Preserve one-way projection from character semantics into runtime.
- Support all SRD 5.2.1 character-creation facts as first-class formal concepts, including non-combat facts the runtime may later ignore.
- Formalize open choices and incomplete state where technically feasible.
- Keep the semantics reusable for future licensed content without forcing semantic rewrites.

## Non-Goals

- Moving character creation into `battle.qnt`.
- Making battle init, MCP payloads, or app state the canonical owner of player-character facts.
- Replacing the landed TypeScript character domain with a second incompatible product model.
- Flattening PCs and monsters into one authored type.
- Making the formal layer dependent on workflow page order or UI state.
- Building MCP-specific parity as the first correctness target.
- Adding non-SRD shipped content as part of this PRD.

## User Stories

1. As a player, I want my in-progress character choices to exist as a real domain object, so that incompleteness is modeled intentionally rather than treated as malformed runtime input.
2. As a player, I want the system to tell me which required choices are still open, so that missing work is visible without being mislabeled as an error.
3. As a player, I want the system to tell me separately when I made an illegal choice, so that contradiction and incompleteness are not conflated.
4. As a player, I want a level-1 character to be created by character-creation rules, so that creation and advancement are not collapsed into one concept.
5. As a player, I want a higher-level starting character to be explained as level-1 creation plus repeated legal level-ups, so that the same rules apply regardless of starting level.
6. As a player, I want multiclass legality to be checked when I take the new class level, so that later scores or later choices do not retroactively legalize an illegal path.
7. As a player, I want subclass, ASI, feat, and Epic Boon timing to be checked on the actual advancement path, so that timing-sensitive character legality is preserved.
8. As a player, I want all SRD character-creation facts, including alignment and languages, to remain part of my canonical character even if battle does not care about them.
9. As a developer, I want a formal owner for draft/open-choice/finalization semantics, so that TypeScript does not remain the only executable character-creation semantics.
10. As a developer, I want a formal owner for advancement semantics, so that TypeScript does not remain the only executable level-up model.
11. As a developer, I want runtime projections to remain one-way derived data, so that character facts are authored once and projected downward rather than re-authored in runtime layers.
12. As a developer, I want a clean character-side handoff into creature semantics, so that the repo's ubiquitous language stays coherent.
13. As a developer, I want rule semantics hardcoded where they are core SRD mechanics, so that the formal layer remains explicit and trustworthy.
14. As a developer, I want concrete content fed through typed content descriptors where possible, so that future licensed content can use the same semantic engine without semantic rewrites.
15. As a tester, I want parity between Quint character semantics and shared TypeScript character logic, so that creation and leveling do not drift from the formal model.

## Domain Model

### Character Side

The character side owns authored player-character state.

Core concepts:

- `CharacterDraft`
- `OpenChoices`
- `ValidationIssues`
- `CharacterSheet`
- `AdvancementEntry`
- advancement transition inputs

The critical rule is:

- a player character is a character while authored, edited, finalized, reviewed, or advanced outside combat.

### Creature Side

The creature side owns execution-facing creature semantics.

Core concepts:

- creature-facing runtime projection
- `CharConfig`
- battle-facing creature initialization
- battle-owned combatant state

The critical rule is:

- a player character becomes a creature only when projected into execution-facing runtime semantics.

### Monster Side

The monster side remains distinct.

Core concepts:

- `StatBlock`
- monster-authored facts
- monster-side projection into creature-facing runtime semantics

This preserves the ubiquitous-language distinction:

- a player character is not a stat block;
- a stat block is not a character sheet;
- both may project into creature-facing execution semantics.

## Formal Module Design

### `character-creation.qnt`

Responsibilities:

- model editable character-creation draft state;
- model partiality explicitly;
- derive open required choices from the current draft;
- derive legality and contradiction from the current draft;
- finalize a legal draft into a canonical `CharacterSheet`.

Required formal outputs:

- `draft -> open choices`
- `draft -> validation issues`
- `draft -> finalizable?`
- `draft -> finalized character sheet` when legal and complete

What it must not own:

- battle state
- workflow page position
- MCP transport shapes
- monster semantics

### `character.qnt`

Responsibilities:

- own finalized character-sheet semantics;
- own legal advancement transitions over finalized sheets;
- explain higher-level starts as repeated legal advancement transitions from a legal level-1 sheet;
- project finalized character semantics into creature-facing execution semantics.

Required formal outputs:

- `isLegalSheet`
- `canAdvance`
- `advanceLevel`
- finalized sheet -> formal combat-ready character projection
- formal combat-ready character projection -> creature-facing runtime projection

What it must not own:

- draft-step UI state
- battle state
- adapter-specific schemas

## Formal Projection Strategy

Do not project finalized sheets directly to raw runtime config as the first formal boundary.

Instead, introduce a narrow intermediate formal projection owned by the character side.

Proposed name:

- `CharacterCreatureProjection`

Purpose:

- represent the last character-owned formal projection before the character becomes a creature for runtime purposes.

Benefits:

- keeps the character/creature handoff explicit in domain language;
- reduces coupling between character semantics and whatever exact runtime wire shape `CharConfig` currently has;
- allows the formal layer to say what combat-relevant facts a character contributes without making raw runtime config the semantic owner.

Costs:

- adds one more projection layer;
- requires one extra mapping step into `CharConfig`.

Decision:

- use `CharacterCreatureProjection` as the formal projection target in `character.qnt`;
- keep the mapping from `CharacterCreatureProjection` to `CharConfig` thin and downstream.

## Content Strategy

The formal layer must distinguish rules from content.

### Hardcode In Formal Semantics

Hardcode SRD mechanics that are rules, not catalog entries, such as:

- level-advancement shape;
- multiclass prerequisite semantics;
- subclass timing semantics;
- ASI / feat / Epic Boon timing semantics;
- higher-level-start semantics;
- projection-boundary semantics.

These are stable rules and belong directly in Quint semantics.

### Parameterize Through Typed Content Descriptors

Do not hardwire all future content into the semantics layer.

Character semantics should consume typed content descriptors for things like:

- classes and class progression descriptors;
- backgrounds and granted-choice descriptors;
- species and species-choice descriptors;
- feat and spell-selection descriptors where they matter for legality or projection.

This allows:

- direct shipped SRD content where the repo owns the content;
- future licensed content without semantic forks;
- a stable formal engine that does not need a rewrite for every new content family.

### SRD-Shipped Content

If content is directly part of the shipped SRD corpus the repo chooses to own, it may be represented concretely.

But the semantic model should still be written so that:

- rules are the owner of legality and transition logic;
- content enters through typed descriptors rather than ad hoc rule branches.

## Level-1 Creation Versus Level Advancement

The formal model must preserve this distinction:

- creating a level-1 character is not a level-up;
- creating a level-3 starting character is level-1 character creation plus two legal level-up transitions.

This rule affects both module boundaries:

- `character-creation.qnt` is responsible for producing the first legal finalized sheet;
- `character.qnt` is responsible for producing later legal sheets from that first one.

Direct higher-level authored inputs may exist as convenience surfaces in TypeScript, but the formal owner must explain them through equivalence to:

1. legal level-1 creation
2. repeated legal advancement

## Open Choices And Incomplete State

Open choices and incomplete state should be formalized if technically feasible.

The intended rule is:

- incomplete does not mean illegal;
- illegal does not mean incomplete;
- open choices are unresolved requirements implied by the current authored state;
- validation issues are contradictions or disallowed authored states.

This belongs in `character-creation.qnt`, not only in TypeScript.

Constraint:

- formalize authored incompleteness and choice requirements;
- do not formalize workflow-page state or UI progression.

## Parity Plan

The initial correctness target should be as deep as possible without binding the formal model to adapters.

### First-Class Parity Targets

Compare Quint against shared TypeScript domain functions for:

- draft assessment and finalization;
- advancement legality and advancement transition;
- finalized-sheet derivation;
- projection into shared creature-facing runtime inputs.

### Secondary Parity Targets

Where useful, compare Quint against shared reusable projection/state helper surfaces consumed by multiple frontends.

### Excluded From First Pass

Do not make first-pass parity depend on:

- app UI structure;
- MCP transport schemas;
- MCP-specific request/response payloads.

The formal layer should bind to deep reusable semantics, not to adapter shells.

## Testing Decisions

- `character-creation.qnt` should have deterministic Quint tests for open choices, incompleteness, legality, and finalization.
- `character.qnt` should have deterministic Quint tests for advancement legality, advancement transitions, and higher-level-start equivalence.
- `character.qnt` should have deterministic Quint tests for `CharacterCreatureProjection`.
- TypeScript parity tests should compare shared domain logic against Quint legality/finalization behavior.
- TypeScript parity tests should compare shared advancement logic against Quint advancement behavior.
- TypeScript parity tests should compare shared projection logic against Quint projection behavior.
- The first parity harness should stay at creature/character level rather than battle MBT.
- Battle MBT remains out of scope unless character formalization changes battle semantics directly.

## Implementation Decisions

- Add `character-creation.qnt` as the formal owner of draft/open-choice/finalization semantics.
- Add `character.qnt` as the formal owner of finalized-sheet advancement and projection semantics.
- Keep `character.qnt` separate from `battle.qnt`.
- Let both character-side modules reuse helper semantics from `creature.qnt`.
- Keep the landed TypeScript domain as the concrete implementation boundary that Quint parity will check, not replace.
- Use `CharacterCreatureProjection` as the formal handoff between character semantics and creature runtime semantics.
- Treat higher-level starts as creation plus repeated legal advancement, not as a separate semantic product.
- Formalize all SRD-mentioned character-creation facts, including non-combat facts, on the character side.
- Parameterize content through typed descriptors where possible so licensed content can reuse the semantic engine later.
- Keep the workflow shell thin and non-authoritative.

## Out Of Scope

- Implementing the Quint modules as part of this PRD.
- Refactoring battle semantics as part of this PRD.
- MCP-specific API redesign.
- Monster-domain redesign beyond the explicit character/creature/monster language boundary.
- Shipping new non-SRD content.

## Further Notes

- Existing docs already contain the foundation for this work, but they are spread across PRDs, plan closeouts, and design notes.
- This PRD is intended to become the primary design artifact for the remaining formalization work.
- Historical notes such as `POST1_FORMAL_CREATION_SEMANTICS.md` and `POST3_FORMAL_ADVANCEMENT_AND_HIGHER_LEVEL_STARTS.md` should remain as supporting rationale, not as the main implementation brief.
- The implementation program after this PRD should be sequenced as:
  1. `character-creation.qnt`
  2. `character.qnt`
  3. deterministic Quint tests
  4. TypeScript parity harness
  5. plan/task updates for implementation rollout
