# PBA25A Plan - Refactor Character Build Projection Boundary

Task: PBA25A - Refactor Character Build Projection Boundary

Status: blocked until PBA25 lands the widened Unit-backed choice path.

## Purpose

Make `CharacterBuild` a durable post-creation identity and choice-evidence
boundary instead of a flattened copy of every executable projection fact.
Derived battle/session facts should be computed from
`CharacterBuild + UnitCatalog + CharacterSession` at the owning projection
boundary.

This task is the bridge between PBA25 character-choice widening and PBA26
Character Sheet/session migration. PBA26 should not migrate app workflows onto a
build shape that stores derivable facts beside their sources.

## Decisions From Design Grill

- Unit legal choice space comes from Surface Unit facts. Support profiles are
  temporary executable capability boundaries, not duplicate authored option
  catalogs.
- Creation holes exposed in a supported session should only expose fillable
  supported options unless option support is represented in the option type
  itself.
- Discovery, fill validation, and finalization must share one support-sliced
  executable hole projection path. Finalization must not reconstruct parallel
  hole families.
- Class- or feature-specific choice keys such as `fighter_skill_choices`,
  `wizard_skill_choices`, and `fighting_style_feat` should collapse into
  domain keys where the source Unit already carries identity.
- `CharacterBuild` should store durable identity plus non-derivable selections
  and evidence. It should not store granted class/background/species feature
  lists, proficiencies, armor training, maximum HP, resources, or spell slot
  capacities when those can be derived from retained facts and the catalog.
- `CharacterBuildSpellcasting` should become source-scoped spell access plus
  rigid slot pools. Spell access records carry the class/feature/source that
  grants the spell, its spellcasting ability, and focus permissions. Slot pools
  are at most regular `spellcasting` slots and `pact_magic` slots.
- Equipment should split owned equipment from active/elected loadout. Loadout
  entries should reference owned item ids so wielding unowned equipment is not
  representable.

## Scope

1. Replace duplicated choice keys with source-shaped domain keys.
   - One class skill-proficiency choice key.
   - One class-feature feat choice key.
   - Keep keys only for the domain slot, not for the owning class or feature.
2. Introduce a shared support-sliced creation-hole projection helper.
   - Discovery returns unfilled projected holes.
   - Fill validation validates against the projected hole payload.
   - Finalization uses the same projection in an include-filled/expected mode.
3. Tighten supported progression semantics.
   - A progression offered as fillable must be finalizable.
   - Remove level-1 fallback options that bypass the support profile.
4. Reshape `CharacterBuild`.
   - Keep progression, background, species, final ability score evidence/output,
     non-derivable selected feature grants, spell choices, equipment ownership,
     and initial loadout choices.
   - Derive class features, background origin feat, species traits,
     proficiencies, armor training, max HP, hit dice totals, resources, and
     spell slot capacity at projection boundaries.
5. Reshape spellcasting.
   - Replace global `spellcastingAbility`, `cantrips`, `preparedSpells`,
     `spellbook`, `spellSlots`, and `spellcastingFocuses` with source-scoped
     spell access plus explicit slot pools.
   - Derive spell levels from spell Units, not copied spellbook entries.
   - Derive focus permissions from spellcasting source; model actual usable
     focus objects through equipment/inventory when component legality becomes
     executable.
6. Reshape equipment.
   - Represent owned equipment separately from active loadout.
   - Make loadout reference owned item ids.
   - Keep mutable in-play equipment changes out of character creation unless
     PBA26 assigns them to Character Sheet/session state.
7. Update MCP/session/battle projection code to compute executable facts from
   the new build boundary.
8. Update `README.md` and `VOCABULARY.md` to describe the new
   `CharacterBuild`/`CharacterSession`/projection ownership line.

## Out Of Scope

- Migrating app Character Sheet workflows. That remains PBA26.
- Adding broad multiclass spellcasting support beyond the minimum type shape
  needed to avoid invalid flattened state.
- Adding Warlock content unless needed as a focused slot-pool fixture.
- Battle MBT fuzzing unless changed build projection affects battle replay
  semantics.

## RAW / PHB Evidence To Recheck

- `.references/srd-5.2.1/Character-Creation.md`
  - class features gained by level;
  - multiclass Spellcasting;
  - prepared spells associated with one class;
  - Spellcasting slots vs Pact Magic slots.
- `.references/srd-5.2.1/Classes/Wizard.md`
  - Wizard cantrips, spellbook, prepared spells, spell slots, ability, focus.
- `.references/srd-5.2.1/Classes/Warlock.md`
  - Pact Magic slots and Warlock spellcasting focus.
- `.references/srd-5.2.1/Rules-Glossary.md`
  - Spellcasting Focus.
- `.references/srd-5.2.1/Character-Origins.md`
  - background Origin feat and species traits.
- `.references/rules/`
  - PHB-era cross-check for multiclass spellcasting and class-specific focuses.
- `UBIQUITOUS_LANGUAGE.md`
  - Spellcasting, Pact Slot, Character Build, Character Sheet/session terms.

## Verification

- RAW agent check before implementation confirms every modeled rule traces to
  local SRD/PHB text and no source-specific spell/focus/slot facts are
  flattened.
- Focused Surface reader/schema tests for any changed class spellcasting or
  feature-choice facts.
- Focused character-creation tests for projected holes, fill rejection,
  finalization, build shape, and impossible-state regression cases.
- MCP/session/battle projection tests for build-to-session and build-to-battle
  handoff.
- Update package docs: `packages/character-creation-runtime/README.md` and
  `packages/character-creation-runtime/VOCABULARY.md`.
- `pnpm --filter @dnd/character-creation-runtime typecheck`
- `pnpm --filter @dnd/character-creation-runtime test`
- `pnpm --filter @dnd/mcp typecheck`
- `pnpm --filter @dnd/mcp test`
- `pnpm check:authored-id-dispatch`
- Character-creation MBT only if reducer protocol or bridge shape changes.
- No battle MBT unless changed projection affects battle-runtime behavior.
- `/simplify` convergence, minimum two rounds.
