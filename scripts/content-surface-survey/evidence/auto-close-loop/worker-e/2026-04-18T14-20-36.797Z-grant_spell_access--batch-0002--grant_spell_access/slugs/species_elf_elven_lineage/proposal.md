# Elven Lineage (Elf) proposal

## Verdict

`Elven Lineage` does not fit the current authored surface honestly. This is `surface_widening`, not `structural_widening`: the existing top-level kind (`species_trait`) and broad family (`passive`) are correct, but several required variants are missing.

I did not author `content/species_elf_elven_lineage.dhall` or derived artifacts.

## Why the current surface is insufficient

The trait is not a flat always-on grants list.

It requires all of these at once:

1. A build-time choice among named lineage bundles.
   Evidence: "Choose a lineage from the Elven Lineages table. You gain the level 1 benefit of that lineage."

2. Additional grants unlocked later by character level.
   Evidence: "When you reach character levels 3 and 5, you learn a higher-level spell, as shown on the table."

3. Trait-scoped spellcasting ability selection for the granted spells.
   Evidence: "Intelligence, Wisdom, or Charisma is your spellcasting ability for the spells you cast with this trait (choose the ability when you select the lineage)."

4. High Elf's rest-refreshing cantrip replacement from the Wizard spell list.
   Evidence: "Whenever you finish a Long Rest, you can replace that cantrip with a different cantrip from the Wizard spell list."

Current `PassiveMechanics` only carries a single unconditional `grants` list. Current `grant_spell_access` assumes a fixed `spellId` and a fixed access mode; it does not encode a chosen spellcasting ability for the grant, a list-backed replacement choice, or level-threshold activation of later grants.

## Narrowest widening that would unblock this trait

- Add a passive-family variant for "choose one named grant bundle at acquisition/build time".
- Add a passive-family variant for "grant becomes active at character level N".
- Add a trait-scoped spellcasting-ability selector for `grant_spell_access`.
- Add an optional replaceable-spell/list-choice shape for `grant_spell_access` or a sibling grant atom.

## Why I did not partially encode it

Encoding only one lineage, or encoding all three lineages at once, would both be false.

- One-lineage-only would drop the required build-time choice.
- All-lineages-at-once would incorrectly stack Drow, High Elf, and Wood Elf benefits.
- Omitting the level-3/5 spell unlocks or the High Elf cantrip replacement would under-model core mechanical text, not a minor rider.
