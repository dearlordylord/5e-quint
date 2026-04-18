# Elven Lineage (Elf) widening proposal

## Verdict

`Elven Lineage` does not fit the current `SpeciesTraitRecord` surface honestly, so no authored `content/species_elf_elven_lineage.dhall` was produced.

Outcome: `structural_widening`

## Why it does not fit

The current species-trait surface only allows:

- `passive`
- `activation`

That is too narrow for this unit.

`Elven Lineage` is one trait that requires a build-time choice among three different lineage packages:

- Drow
- High Elf
- Wood Elf

Each package then carries different benefits:

- Drow: darkvision increases to 120 feet and grants fixed spells
- High Elf: grants a Wizard cantrip that is replaceable on each Long Rest, plus later fixed spells
- Wood Elf: speed increases to 35 feet and grants fixed spells

Encoding all three packages as one flat passive grant list would be false. Splitting the trait into three separate authored units would also be false for this task, because the source text defines one trait whose first step is choosing a lineage.

## Specific gaps

### 1. Species-trait branch choice

Need a species-trait mechanics shape that can represent:

- one source trait
- a required player choice at acquisition/build time
- branch-specific mechanics bundles

The closest existing precedent is composite mechanics on class features and magic items, but species traits do not have that option, and there is no choice-over-bundles form for non-spell traits.

### 2. Character-level-gated grants inside a species trait

The trait grants more benefits at character levels 3 and 5:

> When you reach character levels 3 and 5, you learn a higher-level spell, as shown on the table.

Current passive grants are unconditional once present. `grant_spell_access` can describe prepared/free-cast behavior, but not “this grant turns on when the character reaches level N.”

### 3. High Elf cantrip replacement

High Elf pressures a further surface gap:

> Whenever you finish a Long Rest, you can replace that cantrip with a different cantrip from the Wizard spell list.

`grant_spell_access` currently names a fixed `spellId`. It cannot express:

- choosing from a spell list
- replacing the chosen cantrip on Long Rest

## What already fits

Several subpieces do fit existing atoms once the higher-level structure exists:

- Drow darkvision increase: `grant_sense`
- Wood Elf speed increase: `modify_speed`
- Drow/Wood fixed cantrip + L3/L5 spells: `grant_spell_access`
- “always prepared + once per long rest free cast + also cast with slots”: `grant_spell_access.mode = "prepared_once_per_long_rest"`

The blocker is not those atoms. The blocker is the missing species-trait structure that can own them honestly.
