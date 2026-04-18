`Elven Lineage (Elf)` does not fit the current surface honestly.

Primary classification: `structural_widening`.

Why the current families fail:

- `SpeciesTraitRecord.mechanics` only allows `passive` or `activation`.
- `Elven Lineage` is neither a single always-on grant list nor a single activated ability.
- The trait is a build-time choice over three lineage packages, and each package grants additional benefits at later character levels.

Rules pressure from the unit:

- Build-time branch selection:
  - "Choose a lineage from the Elven Lineages table. You gain the level 1 benefit of that lineage."
- Level-gated future grants:
  - "When you reach character levels 3 and 5, you learn a higher-level spell, as shown on the table."
- Prepared + free-cast spell access:
  - "You always have that spell prepared. You can cast it once without a spell slot, and you regain the ability to cast it in that way when you finish a Long Rest."
- Chosen spellcasting ability for the granted spells:
  - "Intelligence, Wisdom, or Charisma is your spellcasting ability for the spells you cast with this trait (choose the ability when you select the lineage)."
- High Elf mutable cantrip:
  - "Whenever you finish a Long Rest, you can replace that cantrip with a different cantrip from the Wizard spell list."

Concrete gaps:

1. Missing species-trait progression/choice shape.
   - Needed shape: a species-trait analogue of a composite/choice progression that can express:
     - choose one lineage at build time;
     - apply that lineage's level-1 grant immediately;
     - unlock additional grants at character levels 3 and 5.
   - This is the structural blocker and drives the outcome.

2. Missing way to bind a chosen spellcasting ability to trait-granted spells.
   - Existing `grant_spell_access` can express the spell grants themselves, including `prepared_once_per_long_rest`.
   - It cannot say that the trait's spells use a build-time choice of `int | wis | cha` as their spellcasting ability.

3. Missing representation for the High Elf cantrip replacement rule.
   - The current surface can grant a known cantrip, but not "replace it with a different cantrip from the Wizard spell list whenever you finish a Long Rest."

4. Drow's darkvision increase would need an honest way to modify an existing granted sense range rather than re-authoring a second standalone Darkvision trait inside this trait package.

If a future widening adds a species-lineage progression container, the per-lineage payloads mostly look reusable:

- Drow:
  - level 1: darkvision range increase to 120 ft; `grant_spell_access` for `dancing_lights` at will/known
  - level 3: `grant_spell_access` for `faerie_fire` with `prepared_once_per_long_rest`
  - level 5: `grant_spell_access` for `darkness` with `prepared_once_per_long_rest`
- High Elf:
  - level 1: grant one mutable Wizard cantrip
  - level 3: `detect_magic` prepared + 1/long rest
  - level 5: `misty_step` prepared + 1/long rest
- Wood Elf:
  - level 1: `modify_speed` +5 ft; `grant_spell_access` for `druidcraft`
  - level 3: `longstrider` prepared + 1/long rest
  - level 5: `pass_without_trace` prepared + 1/long rest

But without the structural container, encoding any one of those as the whole `Elven Lineage` trait would be misleading.
