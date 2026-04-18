# Elven Lineage (Elf) proposal

## Verdict

`structural_widening`

## Why it does not fit honestly

`SpeciesTraitRecord` currently allows only:

- `mechanics.family = "passive"` with one always-on grant bundle
- `mechanics.family = "activation"` with one activated ability payload

`Elven Lineage` is neither. Its core structure is:

1. choose one lineage at build time from a closed table;
2. gain that lineage's level-1 benefit;
3. at character level 3, gain a lineage-specific spell grant;
4. at character level 5, gain another lineage-specific spell grant;
5. for those lineage spells, use a chosen spellcasting ability;
6. for High Elf specifically, replace the granted cantrip after each Long Rest.

That is not one passive bundle. It is a lineage-selection subgraph with deferred unlocks.

## Forced widenings

### 1. Build-time lineage choice subgraph

The unit needs a way to choose exactly one lineage from:

- Drow
- High Elf
- Wood Elf

Each branch carries different mechanics:

- Drow: stronger Darkvision + `Dancing Lights` + later `Faerie Fire` / `Darkness`
- High Elf: cantrip from Wizard list, replaceable on Long Rest + later `Detect Magic` / `Misty Step`
- Wood Elf: speed increase + `Druidcraft` + later `Longstrider` / `Pass without Trace`

This is broader than a normal passive grant list.

Evidence:

> Choose a lineage from the Elven Lineages table. You gain the level 1 benefit of that lineage.

### 2. Character-level-gated trait grants

The current species-trait surface has no per-record notion of “this branch grants more mechanics when the character reaches level 3 / 5”.

Evidence:

> When you reach character levels 3 and 5, you learn a higher-level spell, as shown on the table.

### 3. Replaceable cantrip grant

`grant_spell_access` works for fixed spell grants, including prepared or once-per-long-rest modes, but not for:

- “know one Wizard cantrip from a list”
- “replace it with another from that list whenever you finish a Long Rest”

Evidence:

> Whenever you finish a Long Rest, you can replace that cantrip with a different cantrip from the Wizard spell list.

## Notes on secondary mechanics

- The L3/L5 spell grant mode itself is close to existing `grant_spell_access`:
  - always prepared
  - one free cast per Long Rest
  - can also cast with spell slots
- The blocker is not the spell-grant atom by itself. The blocker is the enclosing lineage-choice + level-gated structure.
- The chosen spellcasting ability (`Intelligence, Wisdom, or Charisma`) is another branch-level choice that would need to live inside the same lineage package.

## Authoring decision

No `content/species_elf_elven_lineage.dhall` was written. Producing one would require flattening the trait into a false single bundle or omitting the lineage-choice core mechanic.
