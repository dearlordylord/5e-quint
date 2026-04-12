# PRD: SRD Character Creation and Character Sheet Projection

Date: 2026-04-11

Status: Historical foundation; superseded as the primary implementation brief by [PRD_CHARACTER_FORMALIZATION.md](./PRD_CHARACTER_FORMALIZATION.md)

Owner: Core / creature architecture

## Status Note

This document remains useful as the original product/domain PRD for the landed TypeScript character foundation.

Use [PRD_CHARACTER_FORMALIZATION.md](./PRD_CHARACTER_FORMALIZATION.md) as the current primary design artifact for the remaining Quint-driven work. That newer PRD incorporates later decisions that are not reflected here, including:

- splitting formal work into `character-creation.qnt` and `character.qnt`;
- formalizing open choices and incomplete state on the creation side;
- keeping level-1 creation distinct from level advancement;
- introducing the explicit character-to-creature handoff;
- distinguishing hardcoded rules from parameterized content descriptors for future licensed-content support.

## Problem Statement

The project can already model many combat-facing creature facts, but it does not yet own the full SRD 5.2.1 player-character creation process as a first-class domain.

Today, the system is strongest at:

- formal combat semantics;
- battle/runtime state transitions;
- some class, species, spell-slot, and feature derivations;
- projecting an already-built combatant into combat.

It is weak or incomplete at:

- representing a full player-facing character sheet as a canonical owned model;
- representing character-creation choices before they become combat state;
- validating the SRD character-creation workflow end to end;
- projecting one canonical character model into creature runtime and battle runtime without temporary or narrow adapters.

From the user's perspective, the missing capability is:

- creating a character using SRD 5.2.1 rules;
- seeing the resulting character sheet as an owned repo concept;
- using that same created character consistently in creature-level runtime, battle runtime, MCP, and UI surfaces;
- leveling and multiclassing that character later without re-encoding the same facts in multiple places.

Without this, the repo risks growing two disconnected worlds:

- a combat engine that expects pre-derived inputs;
- a future character builder that would need to duplicate rules, state, and derivations outside the current core model.

## Solution

Introduce a canonical owned character domain that separates three concerns clearly:

- a character-creation draft that records user choices and incomplete selections;
- a finalized character sheet that records the completed SRD-legal character;
- runtime projections that derive creature-level and battle-level execution facts from that finalized sheet.

The solution should make the following invalid states hard or impossible to represent:

- a character with contradictory class, level, proficiency, or spell-slot facts;
- a character whose creation choices and derived combat facts drift apart;
- a battle projection that duplicates facts already owned by the character sheet;
- a mixed abstraction where battle state becomes the source of truth for character-creation data;
- a creation flow that cannot distinguish missing required choices from illegal choices;
- a higher-level-start path that diverges semantically from normal level advancement.

The resulting system should let the project:

- model SRD 5.2.1 character creation directly;
- reuse one owned character sheet across app, MCP, creature runtime, and battle runtime;
- keep battle authoritative for combat semantics while keeping character creation out of the battle machine;
- align the TypeScript layer with the existing Quint construction and leveling facilities instead of building a second rules engine.

The SRD presents character creation as a sequential process:

1. choose a class;
2. determine origin;
3. determine ability scores;
4. choose alignment;
5. fill in details.

The product should preserve that sequential shape for guided workflows without making workflow position the semantic owner of character state. The semantic core should remain an editable draft that can be analyzed at any time for:

- open required choices that still need to be made;
- validation issues that represent illegal or contradictory state;
- finalizable status, meaning the draft can become a canonical character sheet;
- projection eligibility into creature and battle runtime.

The same principle should govern higher-level starts. A higher-level character is not a separate semantic product; it is a level 1 character created using the normal creation flow and then advanced one level at a time using the level-advancement rules until the target level is reached.

## User Stories

1. As a player, I want to choose a class, so that my character starts from an SRD-legal class identity.
2. As a player, I want to choose a background, so that my origin feat, ability-score adjustment options, proficiencies, and equipment options come from one owned source.
3. As a player, I want to choose a species, so that my size, speed, creature type, and species traits are derived consistently.
4. As a player, I want to choose the required language options, so that my sheet records SRD-legal language knowledge.
5. As a player, I want to choose or generate ability scores using the SRD methods, so that the builder enforces the legal score-generation rules.
6. As a player, I want point-buy validation, so that illegal point-buy totals are rejected immediately.
7. As a player, I want standard-array support, so that I can assign the six canonical scores without manual re-entry mistakes.
8. As a player, I want random-generation support as an input mode, so that the builder can accept rolled values without owning dice randomness.
9. As a player, I want background-based ability-score adjustments to apply cleanly, so that the sheet reflects my final legal scores.
10. As a player, I want ability modifiers derived automatically from scores, so that the sheet does not require duplicated manual entry.
11. As a player, I want to choose alignment, so that my completed sheet reflects the SRD creation steps even when alignment has little runtime consequence.
12. As a player, I want to choose my level and starting XP, so that higher-level starts are modeled legally.
13. As a player, I want subclass selection to appear only when the starting level requires it, so that the workflow matches the SRD.
14. As a player, I want class proficiencies and background proficiencies merged into one owned result, so that no downstream layer needs to reconstruct them.
15. As a player, I want skill choices and tool choices represented explicitly, so that the resulting sheet records the actual choices I made rather than a class/background template only.
16. As a player, I want origin feats and later feat choices to be first-class selections, so that the builder can validate eligibility and derive resulting character facts.
17. As a player, I want class features granted at my current level to appear on the sheet automatically, so that I do not need to manually curate them.
18. As a player, I want species choices with sub-options to be represented directly, so that lineages, ancestries, and other SRD species options are not flattened away.
19. As a player, I want starting equipment choices to be represented as choices, so that my actual loadout can later project into combat without hardcoded starter presets.
20. As a player, I want armor, weapons, shields, and free-hand-relevant equipment choices to project into combat faithfully, so that created characters enter battle with their real owned loadout.
21. As a player, I want saving throw modifiers, skill modifiers, passive Perception, AC, HP, Hit Dice, initiative, spell save DC, and spell attack bonus derived automatically, so that the final sheet is executable rather than decorative.
22. As a player, I want prepared-spell and cantrip selections represented as owned sheet data, so that runtime spell access reflects my real choices rather than default approximations.
23. As a player, I want class-specific resource pools derived from my sheet, so that battle and creature runtimes start from the correct charges, uses, and refresh boundaries.
24. As a player, I want Dwarf, Dragonborn, Goliath, Halfling, Human, Orc, Tiefling, Elf, and Gnome origin effects to project into my sheet and runtime consistently, so that character creation and combat use the same source of truth.
25. As a player, I want my character sheet to remain distinct from a monster stat block, so that the repo's ubiquitous language stays coherent.
26. As a player, I want the builder to tell me which required choices are still open, so that incomplete character state is visible without being mislabeled as an error.
27. As a player, I want the builder to tell me separately when I have made an illegal choice, so that I can distinguish missing work from invalid work.
28. As a player, I want to move through character creation step by step and still go back to earlier steps, so that the guided workflow does not trap me in a linear one-way flow.
29. As a player, if I change an earlier choice, I want only dependent later choices to be invalidated, so that unrelated later choices are preserved.
30. As a player, I want to review and edit a complete character before finalizing it, so that "all choices present" and "finalized" are not treated as the same thing.
31. As a player, I want a higher-level starting character to be built by creating a level 1 character first and then leveling up repeatedly, so that the same rules apply whether the character started at level 1 or entered the campaign later.
32. As a developer, I want one owned character-sheet model, so that MCP, app, battle initialization, and feature hooks stop inventing their own partial character representations.
33. As a developer, I want creation-time validation separated from combat-time transitions, so that the battle machine stays focused on combat semantics.
34. As a developer, I want pure derivation functions from character sheet to runtime projections, so that the same sheet can feed creature runtime and battle runtime without duplicated logic.
35. As a developer, I want character creation to reuse existing Quint construction and leveling logic where possible, so that the project does not maintain two parallel rules engines.
36. As a developer, I want the TypeScript character domain to match the repo's ownership rules, so that loadouts, proficiencies, and spell choices are not duplicated across layers.
37. As a developer, I want multiclass prerequisites and multiclass progression modeled on the character side, so that runtime slot and proficiency derivations stay grounded in owned sheet facts.
38. As a developer, I want higher-level starts to reuse the same domain model as level-1 starts, with level advancement applied repeatedly after initial creation, so that there is not a separate advanced-character path.
39. As a developer, I want level advancement to be an extension of the same character-sheet model, so that creation and leveling are not split into incompatible abstractions.
40. As a developer, I want the builder to represent incomplete drafts safely, so that the UI can support step-by-step editing without fabricating finalized values too early.
41. As a developer, I want explicit open-choice analysis in addition to validation errors, so that UI and automation surfaces can distinguish incompleteness from illegality.
42. As a developer, I want earlier edits to invalidate only downstream dependent choices, so that the system preserves user intent whenever a later choice is still semantically valid.
43. As a developer, I want finalized character sheets to be serializable and stable, so that MCP and app surfaces can persist and transmit them predictably.
44. As a developer, I want runtime projections to be one-way derived data, so that battle state never becomes the source of truth for character-creation facts.
45. As a developer, I want a clear place to model non-combat sheet facts that still matter to character creation, so that languages, alignment, and background choices do not get lost merely because battle does not need them.
46. As a developer, I want to validate equipment and spell-preparation choices before combat starts, so that battle init stays narrow and executable.
47. As a developer, I want a future character-creation UI to be able to drive a guided multi-step workflow, so that the product can support wizard-style character building without making the draft shape step-dependent.
48. As a developer, I want a future MCP or automation surface to create or inspect characters through the owned character domain, so that no adapter-owned character registry appears.
49. As a tester, I want derivation logic tested at the boundaries users care about, so that changes to the character domain do not silently break combat projections.
50. As a tester, I want parity-sensitive creation rules covered against the formal model where applicable, so that construction and leveling behavior stay aligned with the existing Quint approach.
51. As a maintainer, I want unsupported or deferred character-sheet facets called out explicitly, so that the PRD does not silently imply support the repo does not actually own.
52. As a maintainer, I want the product to stay SRD 5.2.1-only, so that creation support does not drift into proprietary PHB-only content or homebrew assumptions.

## Implementation Decisions

- The system will introduce a canonical player-character domain rather than extending battle initialization or the battle machine into a character builder.
- The primary abstraction will be a two-stage model: character draft for in-progress choices and finalized character sheet for validated, owned results.
- The semantic core will distinguish incomplete state from invalid state. Open required choices are unresolved holes in the current draft; validation issues represent illegal or contradictory choices.
- Runtime creature state and runtime battle state will be projections derived from the finalized character sheet, not independent character models.
- Character creation workflow state and character domain state will be distinct. A guided step-by-step UI may use a state machine, but the source of truth remains the draft, its open choices, its validation issues, and finalized sheet models.
- The battle machine will remain authoritative only for combat behavior. It will not become the owner of creation-time choices such as background, languages, alignment, or loadout selection.
- The creature-level formal model will remain the correct place for construction and leveling semantics that affect executable creature facts. TypeScript should align to that model rather than inventing alternative rules.
- The character-sheet domain must keep PCs in ubiquitous language as character sheets, not stat blocks, while still projecting both PCs and monsters into the shared creature abstraction for combat.
- Background, species, class, feat, spell-selection, and equipment choices will be modeled as first-class typed choices rather than flattened into ad hoc flags or narrow starter presets.
- The character domain will own starting equipment choices and later loadout facts so that battle entry no longer depends on narrow hardcoded starter-loadout helpers as the long-term path.
- Character spellcasting data will distinguish owned sheet choices from runtime projection. Prepared spells, cantrips, and known/always-prepared grants will be character-sheet facts; battle-ready spell payloads remain runtime projections.
- The model will support higher-level starts and later level advancement through the same core abstractions rather than separate product concepts.
- A higher-level start will be modeled as level 1 character creation followed by repeated legal level-up transitions until the target level is reached.
- Multiclassing eligibility, level totals, hit-die pools, and spell-slot derivation will be owned by the character domain and then projected into runtime.
- Alignment and languages will be recorded on the owned character sheet even when they have little or no direct combat impact, because they are part of SRD character creation and should not be dropped.
- When an upstream choice changes, the system should preserve later user choices unless those choices depend on the changed fact and are no longer valid or meaningful.
- Runtime projections must avoid redundant state. If a fact already exists on the canonical character sheet, downstream layers should project or reference it rather than duplicating it.
- The solution should favor deep modules: validation, derivation, sheet projection, and loadout projection should each expose small stable interfaces over substantial internal logic.

## Core Domain Model

The product should explicitly model the following domain surfaces:

- `CharacterDraft`: editable in-progress player-character state.
- `OpenChoices`: required unresolved choices implied by the current draft and stage of creation or advancement.
- `ValidationIssues`: illegal or contradictory choices present in the current draft.
- `CharacterSheet`: finalized canonical player-character state.
- `LevelUpDraft` or equivalent advancement input: the explicit choices required to move a finalized sheet to the next legal level.
- Runtime projections: execution-facing projections derived from a finalized sheet.

In a Quint-first formulation, the most important pure functions are:

- `draft -> open choices`
- `draft -> validation issues`
- `draft -> finalized sheet when valid`
- `sheet -> next-level open choices`
- `sheet + level-up choices -> next-level sheet`
- `sheet -> creature runtime projection`
- later `sheet -> battle init projection`

## Testing Decisions

- A good test verifies externally observable behavior from the user's perspective and from the public domain-model perspective. It should assert legal and illegal inputs, derived outputs, and projection results rather than internal implementation details.
- Validation tests should cover score-generation legality, multiclass prerequisites, level-gated choices, background adjustment legality, finalized-sheet completeness rules, and the distinction between open choices and illegal choices.
- Derivation tests should cover HP, Hit Dice, proficiencies, skill and save modifiers, passive Perception, spell save DC, spell attack bonus, multiclass spell slots, and class/species-derived resources.
- Projection tests should verify that a finalized character sheet projects consistently into creature runtime and battle runtime without inventing extra data or losing owned choices.
- Where the existing formal model already covers a rule area, new tests should prefer parity-style assertions against the owned semantics rather than inventing a weaker duplicate interpretation.
- Existing test style in the repo favors pure-function tests, scenario tests, and MBT parity. The new character domain should follow the same pattern: pure-function tests first, projection tests second, and formal-alignment tests where the Quint model already owns the rule.
- Modules that should definitely be tested include the draft validator, finalized-sheet validator, derivation layer, loadout projection layer, and runtime projection layer.
- Workflow-state tests, if a guided creation machine is added later, should focus on externally visible allowed transitions, surfaced open choices, selective invalidation after backtracking edits, and persisted draft results rather than internal statechart structure.
- Advancement tests should verify that higher-level starts and normal post-play level advancement share the same legal transition behavior.

## Out of Scope

- Extending the main battle machine to act as the character-creation workflow.
- Treating battle initialization as the long-term character-creation API.
- Adding non-SRD character options, proprietary PHB-only options, or homebrew creation content.
- Building a general automation language or freeform character-scripting system.
- Modeling campaign-level narrative biography, personality prompts, or non-SRD worldbuilding prompts beyond what the SRD explicitly includes in character creation.
- Full inventory simulation beyond the level needed to own sheet-equipment choices and project combat-relevant loadout facts.
- Full downstream UX design for every app or MCP surface; this PRD defines the owned product/domain shape first.
- Reworking monster stat-block architecture as part of this effort, except where shared creature abstractions naturally overlap.

## Further Notes

- The strongest architectural constraint is that character creation and combat are related but not the same domain. Character creation chooses and validates sheet facts; combat consumes projections of those facts.
- The SRD's step order should shape the guided workflow, but not become the semantic owner of character state. The draft remains editable before finalization, and the system should recompute open choices and validation issues after every edit.
- The repo already contains important construction and leveling semantics in the formal creature layer. That is an asset and should be used as the alignment target.
- The current system already demonstrates the correct downstream shape: battle wants a combat-ready projection, not an interactive builder. The missing layer is therefore the owned character-sheet domain between SRD creation and combat execution.
- If this work lands, future product slices can be staged cleanly: canonical character domain first, open-choice and finalization analysis second, derivation/projection third, guided creation and advancement workflows fourth, MCP/app surfaces last.
