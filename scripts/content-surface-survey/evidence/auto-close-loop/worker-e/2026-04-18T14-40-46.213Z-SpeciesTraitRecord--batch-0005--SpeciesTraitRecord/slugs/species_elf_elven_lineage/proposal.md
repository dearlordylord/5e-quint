## Verdict

`Elven Lineage` does not fit the current surface honestly as a single `species_trait` record, so no authored content file was created.

## Why It Fails

The existing `SpeciesTraitMechanics` union only allows:

- `passive`
- `activation`

That is enough for atomic traits like Darkvision or Breath Weapon, but not for one trait that:

- asks the player to choose one branch at species selection time;
- gives a different level-1 benefit depending on that branch;
- then grants different level-3 and level-5 spells tied to the same earlier choice.

Encoding all three lineages into one passive record would be false. Splitting the trait into separate records would also be false for this task, because the source text presents one trait whose internal choice owns the later progression.

## Specific Gaps

1. Missing lineage-choice-plus-progression structure

The trait needs a build-time choice over named branches, where each branch carries its own level-gated grants. Nothing in `SpeciesTraitMechanics` or `PassiveMechanics` can express that.

Evidence:

> Choose a lineage from the Elven Lineages table. You gain the level 1 benefit of that lineage.
>
> When you reach character levels 3 and 5, you learn a higher-level spell, as shown on the table.

2. Missing per-grant character-level gating inside a species trait

The later spells are not present from level 1, so plain passive `grant_spell_access` would overstate the rule.

3. Missing replaceable-cantrip spell grant

High Elf's cantrip is not static:

> Whenever you finish a Long Rest, you can replace that cantrip with a different cantrip from the Wizard spell list.

Current `grant_spell_access` modes can grant a known/prepared/once-per-rest spell, but not a long-rest-replaceable cantrip choice from a constrained list.

## What Already Fits

If authored separately, these individual effects mostly fit existing atoms:

- Drow darkvision increase: `grant_sense`
- Wood Elf speed increase: `modify_speed`
- Drow/Wood Elf/High Elf later spell access: `grant_spell_access`
- Trait-level chosen spellcasting ability is already caller-facing and does not by itself force a new atom

The problem is the missing single-trait composition shape, not the absence of those leaf atoms.
