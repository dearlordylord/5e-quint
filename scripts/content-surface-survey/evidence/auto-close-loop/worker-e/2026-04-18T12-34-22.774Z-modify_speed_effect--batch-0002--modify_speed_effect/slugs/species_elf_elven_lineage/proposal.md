# Elven Lineage (Elf)

Outcome: `surface_widening`

## Why it does not fit cleanly

`Elven Lineage` is still a `species_trait`, but the current surface cannot encode it honestly as either:

- one flat passive grants list, because the trait requires a build-time choice among `Drow`, `High Elf`, and `Wood Elf`;
- or one activated ability, because the lineage benefits are persistent grants rather than an activation with cost/resource/reset.

The missing pieces are surface shape issues, not new v4 atoms:

- The level-1 benefits are existing-style grants:
  - Drow: stronger `grant_sense` and a cantrip `grant_spell_access`
  - High Elf: a cantrip `grant_spell_access`
  - Wood Elf: `modify_speed` and a cantrip `grant_spell_access`
- The level-3 and level-5 benefits are also existing-style `grant_spell_access` grants.

What is missing is the ability to author those grants honestly as one trait.

## Required widenings

### 1. Build-time choose-one lineage bundle

Need a passive-species-trait variant that can say:

- choose one option at character creation;
- each option carries its own grant bundle.

Evidence:

> Choose a lineage from the Elven Lineages table. You gain the level 1 benefit of that lineage.

This is analogous in spirit to existing `choice` shapes, but there is no passive-grant-bundle choice shape today.

### 2. Character-level-gated passive grants

Need a way to gate passive grants by later character levels, for example:

- unlock spell A at character level 3;
- unlock spell B at character level 5.

Evidence:

> When you reach character levels 3 and 5, you learn a higher-level spell, as shown on the table.

Current passive grants are immediate and always-on; there is no wrapper for “this grant becomes active at character level N”.

### 3. Replace a granted cantrip on Long Rest from a constrained list

High Elf needs a replaceable cantrip grant:

- know one wizard cantrip;
- after a Long Rest, replace it with another wizard cantrip.

Evidence:

> Whenever you finish a Long Rest, you can replace that cantrip with a different cantrip from the Wizard spell list.

This is not a new atom. It is a missing authored subgraph using existing ideas like `choose`, `replace`, `grant_spell_access`, and `rest_window`.

### 4. Spellcasting-ability choice for granted spells

The lineage spells need a chosen spellcasting ability source:

- choose `Intelligence`, `Wisdom`, or `Charisma` when selecting the lineage;
- that choice applies to the spells cast with this trait.

Evidence:

> Intelligence, Wisdom, or Charisma is your spellcasting ability for the spells you cast with this trait (choose the ability when you select the lineage).

Current `grant_spell_access` can change mode, target restriction, duration override, area override, and DC override, but it cannot declare the spellcasting ability source for the granted spell access path.

## Why this is not `atom_widening`

The mechanics themselves are already covered by existing atoms:

- `grant_sense`
- `modify_speed`
- `grant_spell_access`

The gap is the authored surface around those atoms: choice-of-bundles, later unlock timing, replace-on-rest behavior, and spellcasting-ability-source metadata.

## Why no `content/species_elf_elven_lineage.dhall` was written

Any current encoding would have to lie by doing at least one of these:

- flatten all three lineages into one grant list;
- drop the level-3/5 unlock structure;
- omit the High Elf cantrip replacement rider;
- omit the chosen spellcasting ability for granted spells.

That would produce a misleading trace, so I stopped at the widening report.
