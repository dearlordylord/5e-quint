# Elven Lineage (Elf)

Outcome: `surface_widening`

## Why this does not fit honestly today

The top-level unit kind exists: `species_trait`.

The problem is not the root kind or the existence of passive spell/sense/speed grants. The problem is that this one trait is a **build-time choice among three different mechanics bundles**, and the chosen bundle then **unlocks further grants at character levels 3 and 5**.

Current `SpeciesTraitMechanics` can express:

- one fixed passive grants list
- or one activated ability

It cannot honestly express:

- a closed build-time choice among grant bundles
- passive grants that appear only once the character reaches later levels
- High Elf's rest-based cantrip replacement from a spell list
- a build-time spellcasting-ability choice that applies to all spells granted by the trait

Encoding this as one fixed passive bundle would be false, and splitting it into lineage-specific separate traits would change the unit being surveyed.

## Narrowest widening

This is `surface_widening`, not `structural_widening`.

Reasons:

- `species_trait` already exists.
- The underlying mechanics are still passive-style grants.
- The missing pieces are surface variants around choice, progression gating, and spell-access parameterization.

## Concrete pressure points

### 1. Build-time lineage selection

RAW:

> "Choose a lineage from the Elven Lineages table. You gain the level 1 benefit of that lineage."

Needed surface shape:

- a passive mechanics variant that lets one species trait carry a closed set of named options, each with its own grant bundle

### 2. Character-level-gated passive grants

RAW:

> "When you reach character levels 3 and 5, you learn a higher-level spell, as shown on the table."

Needed surface shape:

- a wrapper that says a given passive grant becomes active at `character >= N`

Without that, `Faerie Fire`, `Darkness`, `Detect Magic`, `Misty Step`, `Longstrider`, and `Pass without Trace` would all appear too early.

### 3. High Elf cantrip replacement

RAW:

> "Whenever you finish a Long Rest, you can replace that cantrip with a different cantrip from the Wizard spell list."

Needed surface shape:

- either a `grant_spell_access` variant that can grant a chosen spell from a closed/open list
- plus a rest-bound `replace` path for that grant

The current `grant_spell_access` requires a fixed `spellId`, so it cannot represent this honestly.

### 4. Shared spellcasting-ability choice for lineage spells

RAW:

> "Intelligence, Wisdom, or Charisma is your spellcasting ability for the spells you cast with this trait (choose the ability when you select the lineage)."

Needed surface shape:

- a build-time spellcasting-ability selector attached to the lineage spell grants

The current surface can override DCs, but it does not model this kind of chosen spellcasting-ability source on the grant itself.

## What already fits once the missing shape exists

These pieces do not require new atoms:

- Drow darkvision increase: existing `grant_sense`
- Wood Elf speed increase: existing `modify_speed`
- fixed known/prepared/free-cast spell grants: existing `grant_spell_access`

So the pressure is on the authored surface shape, not the v4 atom inventory.
