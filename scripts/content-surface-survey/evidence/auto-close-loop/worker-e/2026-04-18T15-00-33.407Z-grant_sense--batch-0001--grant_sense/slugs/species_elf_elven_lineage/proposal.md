`Elven Lineage (Elf)` does not fit the current authored surface honestly, so no `content/species_elf_elven_lineage.dhall` was written.

Why it fails:

- The trait is a build-time choice among three lineage packages (`Drow`, `High Elf`, `Wood Elf`), but `SpeciesTraitMechanics` has no choice/composite wrapper for mutually exclusive option bundles.
- The chosen lineage grants benefits at character levels 1, 3, and 5, but the surface has no character-level-gated grant container for non-activation species traits.
- The trait-scoped spellcasting ability choice (`Intelligence, Wisdom, or Charisma`) is not representable on `grant_spell_access`.
- High Elf's cantrip swap on each Long Rest is not representable by existing spell-access modes or reset cadence shapes.
- Drow's level-1 benefit increases the range of the separate `Darkvision` trait from 60 feet to 120 feet. Per the repo's no-redundant-state rule, this should not be re-authored as a second `grant_sense`; it needs a distinct sense-modification atom.

Proposed widenings:

1. `new_atom`: `modify_sense_range`
   - Needed so Drow can increase an existing Darkvision grant from 60 feet to 120 feet without duplicating state.
   - Evidence: "The range of your Darkvision increases to 120 feet."

2. `new_variant`: lineage-choice bundle for `SpeciesTraitMechanics`
   - A species trait needs to choose one of several mutually exclusive effect/spell bundles at build time.
   - Evidence: "Choose a lineage from the Elven Lineages table. You gain the level 1 benefit of that lineage."

3. `new_variant`: character-level-gated grants
   - The chosen lineage adds more grants at character levels 3 and 5.
   - Evidence: "When you reach character levels 3 and 5, you learn a higher-level spell, as shown on the table."

4. `new_variant`: trait-scoped spellcasting ability selector on `grant_spell_access`
   - The granted spells use one chosen ability score for this trait's spellcasting.
   - Evidence: "Intelligence, Wisdom, or Charisma is your spellcasting ability for the spells you cast with this trait (choose the ability when you select the lineage)."

5. `new_subgraph`: long-rest cantrip replacement
   - High Elf can replace the granted cantrip after each Long Rest; this is not simple known/prepared access.
   - Evidence: "Whenever you finish a Long Rest, you can replace that cantrip with a different cantrip from the Wizard spell list."
