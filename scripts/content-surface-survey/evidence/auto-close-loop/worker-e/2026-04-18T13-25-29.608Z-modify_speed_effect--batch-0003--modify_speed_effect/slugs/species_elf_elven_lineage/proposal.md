# Elven Lineage (Elf) proposal

## Verdict

`surface_widening`

The unit still belongs to the existing `species_trait` top-level kind, but it does not fit the current `SpeciesTraitMechanics = PassiveMechanics | ActivatedAbilityMechanics` surface honestly.

## Why it does not fit cleanly

The trait is not a single always-on passive grant list. It is a build-time choice among three mutually exclusive lineages:

- Drow
- High Elf
- Wood Elf

Each lineage then grants:

- a level-1 passive benefit bundle;
- a level-3 spell unlock;
- a level-5 spell unlock;
- a trait-scoped spellcasting ability choice.

The current passive surface has no way to express:

- choosing one passive branch at species selection time;
- delaying specific grants until character level 3 or 5;
- granting lineage spells with a chosen innate spellcasting ability;
- High Elf's long-rest cantrip replacement from the Wizard cantrip list.

## Existing atoms that already cover the payload pieces

No new v4 atom appears necessary for the underlying mechanics:

- Drow darkvision increase can reuse `grant_sense`
- Wood Elf speed increase can reuse `modify_speed`
- the fixed lineage spells can reuse `grant_spell_access`

The gap is in the authored surface around selection and progression, not in the atom inventory.

## Proposed widenings

### 1. Passive lineage choice

Add a passive-shape variant that lets a species trait present mutually exclusive branch bundles chosen at build time.

Pressure text:

> "Choose a lineage from the Elven Lineages table. You gain the level 1 benefit of that lineage."

### 2. Character-level-gated passive grants

Add a way for a passive species trait to unlock later grants at stated character levels.

Pressure text:

> "When you reach character levels 3 and 5, you learn a higher-level spell, as shown on the table."

### 3. Trait-scoped spellcasting ability choice for spell grants

Extend the spell-grant surface so a species trait can declare which ability those granted spells use, including a choice made when the lineage is selected.

Pressure text:

> "Intelligence, Wisdom, or Charisma is your spellcasting ability for the spells you cast with this trait (choose the ability when you select the lineage)."

### 4. Rest-based reselection of a granted cantrip from a named list

High Elf specifically needs a spell-access variant for a cantrip slot that can be swapped on each Long Rest from the Wizard cantrip list.

Pressure text:

> "Whenever you finish a Long Rest, you can replace that cantrip with a different cantrip from the Wizard spell list."

## What I did not write

I did not author:

- `content/species_elf_elven_lineage.dhall`
- `content/species_elf_elven_lineage.json`
- `content/species_elf_elven_lineage.trace.md`

Doing so would have required flattening lineage choice and level gating into immediate grants, which would be misleading.
