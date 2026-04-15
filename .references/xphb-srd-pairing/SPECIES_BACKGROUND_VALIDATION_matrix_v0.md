# Species and Background Validation Matrix v0

Purpose:

- validate `TAXONOMY_atoms_graph_v3.md` against the last untouched origin-side source roots (`species_trait_root` and `background_trait_root`);
- confirm `v3`'s new grant atoms (`grant_sense`, `grant_proficiency`, `grant_resistance`, `grant_spell_access`) under wide sampling;
- check whether species with level-scaling traits (Dragonborn Breath Weapon) provide a second independent data point for the typed scaling split residue recorded in `v3`'s post-class-feature notes;
- stress the Scope-First Nested Selection pattern (Elven Lineage, Fiendish Legacy, Giant Ancestry, Gnomish Lineage) against class-feature Spellcasting and feat-level Magic Initiate.

This is the second-to-last source-root validation pass. Item properties are covered in the companion matrix `ITEM_PROPERTY_VALIDATION_matrix_v0.md`.

## Why This Sample

The full SRD 5.2.1 origin catalog is small (9 species, 4 backgrounds), so Round 1 covers the whole catalog in one pass.

Origin-side pressure is expected to mostly confirm `v3` rather than drive new atoms. Species and backgrounds heavily use exactly the grant atoms `v3` introduced:

- `grant_sense` for Darkvision and Tremorsense (Dragonborn, Dwarf, Elf, Gnome, Orc, Tiefling);
- `grant_proficiency` for skill, tool, and language proficiencies (every background; Elf Keen Senses; Human Skillful);
- `grant_resistance` for type-specific resistance (Dwarf Poison, Tiefling legacy, Dragonborn ancestry);
- `grant_spell_access` for lineage-granted spells (Elf, Tiefling, Gnome, Acolyte/Sage backgrounds via Magic Initiate);
- `modify_roll_advantage` for ancestry/condition advantages (Dwarven Resilience, Fey Ancestry, Gnomish Cunning, Halfling Brave, Goliath Powerful Build).

The primary architectural questions are:

1. Does Dragonborn Breath Weapon's tier-scaled damage (`1d10` → `2d10` → `3d10` → `4d10`) provide a second stream of pressure for the typed scaling split?
2. Does the Scope-First Nested Selection pattern (Elven / Tiefling / Gnomish / Goliath lineages) scale from one class-feature case and one feat case to multiple species cases?
3. Does the `refund`-adjacent "use this trait N times per rest" cadence (Dragonborn Breath, Dwarf Stonecunning, Gnome/Tiefling spell casts, Goliath Giant Ancestry, Orc Adrenaline Rush) introduce any new resource shape not already captured by `use_count` + `rest_window`?

## Canonical Sample

### Species (9)

1. `Dragonborn`
2. `Dwarf`
3. `Elf`
4. `Gnome`
5. `Goliath`
6. `Halfling`
7. `Human`
8. `Orc`
9. `Tiefling`

### Backgrounds (4)

10. `Acolyte`
11. `Criminal`
12. `Sage`
13. `Soldier`

Source text: `.references/srd-5.2.1/Character-Origins.md`.

## Grouping For Review

### Group A: simple-ancestry species

- `Dwarf`
- `Halfling`
- `Human`
- `Orc`

Shape: flat lists of discrete traits without tiered lineage selection. Tests `grant_sense`, `grant_resistance`, `modify_roll_advantage`, `use_count` + `rest_window`, and "drop to 1 instead of 0" pattern (Relentless Endurance) that echoes Barbarian's Relentless Rage.

### Group B: lineage / scope-selection species

- `Dragonborn`
- `Elf`
- `Gnome`
- `Tiefling`
- `Goliath`

Shape: ancestry / legacy / lineage choice that scopes subsequent trait content; several include `grant_spell_access` for lineage-granted spells. Tests the Scope-First Nested Selection pattern across multiple origin-side cases and provides the Dragonborn Breath Weapon scaling data point.

### Group C: backgrounds

- `Acolyte`
- `Criminal`
- `Sage`
- `Soldier`

Shape: uniform five-part composition (ability score bumps, origin feat grant, skill proficiencies, tool proficiency, equipment choice). Tests whether backgrounds are a single composed subgraph rather than each a unique shape.

## Validation Questions

For each unit, check:

1. which `v3` nodes and edges actually fit?
2. does the unit force any new top-level node or edge family?
3. does Dragonborn Breath Weapon provide the second independent data point for typed scaling (dice-count scaling, tiered by character level)?
4. does any lineage-selection trait pressure a new scope-selection shape beyond the pattern already named?
5. does any background element require an atom not already in `v3`?
6. does the per-proficiency-bonus resource cadence ("uses equal to your Proficiency Bonus, recharge on long rest") fit cleanly as `use_count` with a level-scaled maximum?

## Expected Pressure Areas

- second independent data point for `grant_sense` (Darkvision, Tremorsense);
- strong multi-species data for `grant_proficiency` and `grant_resistance`;
- second independent data point for typed scaling split (Dragonborn Breath Weapon dice scaling);
- multiple scope-first nested selection data points (Elven Lineage, Fiendish Legacy, Gnomish Lineage, Giant Ancestry) reinforcing the pattern;
- uniform background subgraph shape;
- per-PB use cadence (uses equal to Proficiency Bonus, rechargeable on long rest) as a narrow variant of `use_count` with level-scaled maximum.

## Outcome Rule

If this pass exposes only:

- second data points for `v3` atoms;
- reinforcement of the typed scaling split pressure (with Dragonborn Breath providing the cross-stream data);
- reinforcement of the Scope-First Nested Selection pattern;
- narrow resource-cadence observations;

then the correct next step is to promote the typed scaling split to `TAXONOMY_atoms_graph_v4.md`.

If this pass exposes a structurally missing node or edge family, record it before considering `v4`.
