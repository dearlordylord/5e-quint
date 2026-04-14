# PRD: Quint-Driven Character Creation And Advancement

Date: 2026-04-12

Status: Current primary design artifact for the remaining character-side ownership, MCP, and editability work

Owner: Core / Quint architecture

## Problem Statement

The repo has landed a substantial character domain and a substantial formal character layer, but the end state is not yet fully converged.

Today, the project has:

- a canonical TypeScript `CharacterDraft` / `CharacterSheet` split;
- `character-creation.qnt` as the formal owner of draft/open-choice/finalization semantics;
- `character.qnt` as the formal owner of advancement and character-to-creature projection semantics;
- ordered advancement history as the legality-relevant record for higher-level starts and multiclass continuation;
- one-way projection from finalized sheet state into creature-facing and battle-facing runtime inputs;
- a thin character workflow shell that avoids becoming a second rules engine.

But it does not yet have:

- full convergence where Quint is unmistakably the semantic owner and TypeScript is unmistakably the adapter/runtime implementation;
- a public MCP character surface over stored server-side character records;
- first-class preview-before-commit semantics for destructive draft edits;
- full authored ownership for every projection-relevant character fact;
- complete cleanup of stale helper structure left behind by earlier ownership migrations.

This leaves the project in a middle state:

- combat is already Quint-authoritative;
- character creation and leveling are formally modeled, but the product/runtime path still feels operationally TypeScript-first;
- app and MCP surfaces are not yet symmetric downstream consumers of the owned character domain;
- some projection paths still carry placeholder behavior because the character side does not yet own the authored choice they want to project.

The governing boundary remains:

- In peace you're a character; in combat you're a creature.

That means:

- outside combat, the canonical player-facing authored object is a character;
- entering runtime or battle projects character facts into creature-facing execution facts;
- combat must never become the owner of character-creation facts;
- MCP and app must remain downstream consumers of the owned character domain rather than becoming parallel owners.

## Solution

Keep the current formal split and drive it to completion.

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

The overall pipeline remains:

- `CharacterDraft` -> open choices / legality / finalization in `character-creation.qnt`
- finalized `CharacterSheet` -> advancement semantics in `character.qnt`
- finalized `CharacterSheet` -> formal character-creature projection
- formal character-creature projection -> runtime/battle-facing projections

The remaining work should make that pipeline operationally explicit too:

- TypeScript remains the runtime implementation and adapter layer over the owned semantics;
- app and MCP become thin consumers of the same canonical draft/sheet/projection path;
- destructive draft edits gain mandatory preview before commit;
- missing authored facts are added on the character side instead of guessed in projections or adapters.

## Goals

- Make character creation Quint-driven rather than only Quint-aligned.
- Make level advancement Quint-driven rather than only Quint-aligned.
- Keep character creation distinct from combat semantics.
- Keep level-1 creation distinct from level advancement.
- Make higher-level starts semantically equal to legal level-1 creation followed by repeated legal level-ups.
- Keep the UI and adapter layers thin and non-authoritative.
- Preserve one-way projection from character semantics into runtime.
- Support all SRD 5.2.1 character-creation facts as first-class formal concepts, including non-combat facts the runtime may later ignore.
- Converge on a state where new character semantics land in Quint first and TypeScript/MCP/app follow.
- Add explicit preview-before-commit semantics for destructive draft edits.
- Close the remaining character-sheet ownership gaps that still force placeholder projection behavior.

## Non-Goals

- Moving character creation into `battle.qnt`.
- Making battle init, MCP payloads, or app state the canonical owner of player-character facts.
- Replacing the landed TypeScript character domain with a second incompatible product model.
- Flattening PCs and monsters into one authored type.
- Making the formal layer dependent on workflow page order or UI state.
- Building MCP-specific parity as the first correctness target.
- Adding rollback/checkpoint history in the first editability slice.
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
9. As a user, I want destructive draft edits to require an explicit preview before commit, so that I can see which later choices would be dropped or reopened before accepting the change.
10. As a user of a downstream adapter surface, I want character records to be stored server-side and manipulated through canonical operations, so that I am not forced to resend the whole character every time.
11. As a developer, I want a formal owner for draft/open-choice/finalization semantics, so that TypeScript does not remain the only executable character-creation semantics.
12. As a developer, I want a formal owner for advancement semantics, so that TypeScript does not remain the only executable level-up model.
13. As a developer, I want runtime projections to remain one-way derived data, so that character facts are authored once and projected downward rather than re-authored in runtime layers.
14. As a developer, I want MCP and app to consume stored canonical draft/sheet state rather than alternate adapter-specific schemas, so that the owned domain remains singular.
15. As a developer, I want subclass legality to remain owned by ordered advancement replay, so that there is not a second side-channel subclass validator drifting from the canonical history model.
16. As a developer, I want projection-relevant choices such as Fighting Style selections to exist on the character side before projection, so that runtime layers stop carrying placeholder empty sets for authored facts the sheet does not yet own.
17. As a tester, I want parity between Quint character semantics and shared TypeScript character logic, so that creation and leveling do not drift from the formal model.

## Recent Decisions

- **Target end state is "moved," not merely "moving."** In this repo, that means Quint is the semantic owner for character creation and advancement, while TypeScript is the adapter/runtime implementation and parity guardrail.
- **Character MCP is downstream, stored server-side, and non-authoritative.** MCP should operate on stored draft/sheet records and thin core calls rather than caller-supplied alternate character schemas.
- **Destructive draft edits require mandatory preview before commit.** The current `applyCharacterDraftUpdate()` behavior is a post-change sanitizer. The next slice must add a first-class preview-of-loss surface before mutation is accepted.
- **Rollback/checkpoints are deferred.** The current scope is preview-of-loss only. History/checkpoint semantics should be documented explicitly as follow-on work rather than implied or silently omitted.
- **Subclass legality is advancement-owned.** Earlier versions validated subclass choices through a side-channel draft field. That ownership moved into ordered `advancement` entries, and replay is now the canonical legality path. Any remaining stub validator should be cleaned up to reflect that ownership line.
- **Fighting Style ownership is still incomplete on the character side.** Both TypeScript and Quint currently project an empty set because the authored `CharacterSheet` surface does not yet own Fighting Style selections. This is an explicit ownership gap, not an accidental omission.
- **Expertise ownership is also incomplete on the character side.** The projection surface already includes `expertiseSkills`, but both TypeScript and Quint currently thread the empty set because the character side does not yet own or derive those facts explicitly enough.
- **Some public TypeScript result shapes are looser than the domain they represent.** In particular, assessment/finalization result types and advancement failure shapes should be strengthened so impossible combinations become unrepresentable at the result boundary even though drafts themselves remain editable and partial.

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
- stored draft/sheet handles for downstream adapter surfaces such as MCP

The critical rule is:

- a player character is a character while authored, edited, finalized, reviewed, or advanced outside combat.

### Creature Side

The creature side owns execution-facing creature semantics.

Core concepts:

- character-creature projection
- creature-facing runtime projection
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
- finalized sheet -> formal character-creature projection
- formal character-creature projection -> creature-facing runtime projection

What it must not own:

- draft-step UI state
- battle state
- adapter-specific schemas

## Formal Projection Strategy

Do not project finalized sheets directly to raw runtime config as the first formal boundary.

Instead, use a narrow intermediate formal projection owned by the character side:

- `CharacterCreatureProjection`

Purpose:

- represent the last character-owned formal projection before the character becomes a creature for runtime purposes;
- keep the character/creature handoff explicit in domain language;
- reduce coupling between character semantics and any exact runtime wire shape;
- let the formal layer say what combat-relevant facts a character contributes without making raw runtime config the semantic owner.

Decision:

- use `CharacterCreatureProjection` as the formal projection target in `character.qnt`;
- keep the mapping from `CharacterCreatureProjection` to runtime/battle inputs thin and downstream.

## Adapter And Editability Boundaries

### Adapter Boundary

- MCP and app surfaces are downstream consumers of the owned character domain.
- Stored server-side draft/sheet state may exist for MCP usability, but those stored records must still be canonical `CharacterDraft` / `CharacterSheet` data rather than adapter-owned alternate schemas.
- Public adapter contracts should expose narrow operations over the owned domain:
  - inspect stored draft/sheet state;
  - preview a draft update;
  - apply an accepted draft update;
  - assess/finalize/advance/project through core-owned semantics.

### Editability Boundary

- Current TypeScript sanitization is post-change and destructive when later choices become invalid.
- The next slice must add a domain-level preview operation that computes:
  - the proposed next draft;
  - authored fields that would be dropped;
  - newly opened required choices;
  - newly introduced illegal issues.
- Commit remains a separate step after preview acceptance.
- History, rollback, and checkpoints remain intentionally deferred for now.
- The same domain should eventually expose an advancement-assessment/preview surface so callers can see open level-up holes separately from illegal advancement issues instead of receiving only the finalization-style failure result.

## Testing Decisions

- A good test verifies externally visible domain behavior from the user's perspective and from the public character-domain perspective.
- Formal parity should compare core character-domain behavior against the corresponding Quint outputs instead of re-encoding weaker interpretations in adapter code.
- Modules and surfaces that should definitely be tested include:
  - draft assessment and finalization;
  - advancement legality and replay;
  - character-creature projection;
  - draft-edit preview behavior once added;
  - MCP character operations once added.
- Existing test style in the repo favors pure-function tests, scenario tests, and parity-style assertions. The remaining character work should follow the same pattern.
- Adapter tests should assert that app/MCP surfaces route through the owned character domain rather than duplicating legality or projection logic locally.

## Out of Scope

- Moving character creation into `battle.qnt`.
- Making battle init, app workflow state, or MCP payloads the semantic owner of player-character facts.
- Adding rollback/checkpoint history in the first editability slice.
- Replacing the landed `CharacterDraft` / `CharacterSheet` model with a second incompatible product model.
- Adding non-SRD shipped content as part of this PRD.

## Further Notes

- The repo already has the right ownership direction. The remaining work is convergence and explicitness, not invention of a new model.
- The `/character` page is useful as a thin exercise shell, but it is not itself the long-term product center or semantic owner.
- Stored server-side MCP character state is a usability decision, not an ownership exception.
