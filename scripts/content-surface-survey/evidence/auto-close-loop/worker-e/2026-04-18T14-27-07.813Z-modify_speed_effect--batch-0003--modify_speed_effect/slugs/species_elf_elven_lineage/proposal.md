# Elven Lineage (Elf) — surface widening

`Elven Lineage` fits the existing `species_trait` top-level kind in spirit, but not the current authored surface honestly.

## Why it does not fit cleanly

The current surface can encode the individual mechanical leaves:

- Drow darkvision increase: existing passive sense grant.
- Wood Elf speed increase: existing passive speed modifier.
- Fixed lineage spells at levels 3 and 5: existing `grant_spell_access` modes can represent always-prepared plus one free cast per Long Rest.

The problem is the trait-level structure:

- one trait asks the player to choose one lineage at build time;
- that lineage grants a heterogeneous bundle of benefits;
- parts of that bundle unlock later at character levels 3 and 5;
- all lineage spells use a chosen spellcasting ability tied to the trait;
- High Elf's cantrip is chosen from the Wizard cantrip list and can be replaced after each Long Rest.

The existing `PassiveMechanics` shape is just an unconditional `grants` list. It has no honest way to express:

- build-time choice among passive bundles;
- threshold-gated passive grants by character level;
- grant-scoped spellcasting-ability selection;
- spell-list cantrip choice with long-rest replacement.

## Narrowest honest classification

`surface_widening`

No new v4 atom is forced here. The mechanical leaves reuse existing atoms. What is missing is surface structure around them.

## Suggested widenings

1. Add a passive build-time choice wrapper for heterogeneous option bundles.

This would let a single species trait say "choose Drow, High Elf, or Wood Elf" without splitting the authored unit into three fake traits.

2. Add character-level-gated passive grants.

The lineage needs "grant this at level 1, then add this at level 3, then add this at level 5" inside one trait.

3. Extend `grant_spell_access` with spellcasting-ability metadata.

The trait needs "casts granted by this trait use Int, Wis, or Cha chosen when the lineage is selected."

4. Extend spell-access grants to support spell-list cantrip choice plus replacement cadence.

High Elf needs:

- choose one cantrip from the Wizard spell list at level 1;
- replace that cantrip when finishing a Long Rest.

## Why I stopped before authoring

Any current Dhall would have to lie in at least one of these ways:

- hardcode one lineage and lose the required choice;
- flatten all three lineages into one combined grant bundle;
- omit the level-3/5 unlock structure;
- omit the chosen spellcasting ability for granted spells;
- omit High Elf's cantrip replacement rule.

That would produce a misleading trace, so no `content/species_elf_elven_lineage.dhall` or derived JSON/trace was written.
