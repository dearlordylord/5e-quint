# Elven Lineage (Elf)

## Verdict

`Elven Lineage` does not fit the current authored surface as a single honest `species_trait` record. The blocker is not one missing atom; it is the trait's overall shape:

- build-time choice among persistent lineage branches
- later character-level grants within the same chosen branch
- lineage-scoped spellcasting-ability choice
- branch-specific replacement behavior for the High Elf cantrip

That makes the narrowest honest classification `structural_widening`.

## What Already Fits

Several individual branch effects already have surface support:

- Drow Darkvision increase: `grant_sense` with `rangeFeet = 120`
- Wood Elf speed increase: `modify_speed` with `delta = 5`
- L3/L5 lineage spells: `grant_spell_access` with `mode = "prepared_once_per_long_rest"`
- L1 cantrips: `grant_spell_access` with `mode = "known"`

If the branches were authored as separate units, much of the payload would trace cleanly.

## Missing Shape

### 1. Build-time lineage choice

The trait is fundamentally "pick one persistent branch and keep it."

RAW:

> "Choose a lineage from the Elven Lineages table. You gain the level 1 benefit of that lineage."

Current surface choice support is activation-scoped (`CastTimeChoice`, `CastTimeEffectModeChoice`). There is no equivalent for species traits / passive mechanics.

Suggested widening:

- Add a build-time non-spell choice subgraph for species/feat/class-feature branches, or
- Add a `choice`-capable non-spell mechanics family whose options each carry passive/level-gated grants.

### 2. Character-level gated grants inside one trait

The chosen lineage grants more content later:

> "When you reach character levels 3 and 5, you learn a higher-level spell, as shown on the table."

Current `SpeciesTraitMechanics` has no way to say "this trait grants X now, Y at level 3, Z at level 5" while keeping them as one unit.

Suggested widening:

- Add character-level gating on non-spell grants, or
- Add a trait-progression container for species traits.

### 3. Chosen spellcasting ability for granted spells

The lineage spells are cast using a user-chosen ability:

> "Intelligence, Wisdom, or Charisma is your spellcasting ability for the spells you cast with this trait (choose the ability when you select the lineage)."

`grant_spell_access` can describe the access mode, but not the ability that governs those granted casts.

Suggested widening:

- Add an ability-choice field on `grant_spell_access`, or
- Add a species-trait-level spellcasting header inherited by its granted spells.

### 4. High Elf cantrip replacement rider

The High Elf branch adds a long-rest replacement loop:

> "Whenever you finish a Long Rest, you can replace that cantrip with a different cantrip from the Wizard spell list."

This is not just a different grant mode; it is a recurring replace-from-list behavior for a previously granted spell.

Suggested widening:

- Add a replace-granted-spell subgraph keyed to a reset cadence and spell-list source.

## Why I Did Not Author a Placeholder

Any current encoding would have to lie in at least one of these ways:

- flatten the lineage choice into unconditional grants
- omit the level 3/5 progression
- omit the chosen casting ability
- omit the High Elf replacement rider

That would produce a misleading trace for the unit, so I did not create `content/species_elf_elven_lineage.dhall`, `.json`, or `.trace.md`.
