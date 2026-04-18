## Why this is not a clean fit

`Elven Lineage` is not a single flat passive grant. It is a build-time choice among three closed lineage bundles, and each chosen bundle has staged progression:

- level 1: lineage-specific passive and/or cantrip grant
- level 3: lineage-specific spell grant
- level 5: lineage-specific spell grant
- lineage-wide spellcasting ability choice: `Int` / `Wis` / `Cha`

The current `SpeciesTraitRecord` surface only allows one `passive` or one `activation` payload. That is enough for `Darkvision` or `Dwarven Resilience`, but not for a chosen lineage package that unlocks more grants later.

## Missing surface shapes

### 1. Unit-level lineage choice

Needed shape: a species-trait variant that chooses one closed bundle of grants at build time.

Why existing surface is insufficient:

- `PassiveMechanics.grants` is one unconditional list.
- There is no species-trait equivalent of a build-time option bundle.
- Authoring only Drow, High Elf, or Wood Elf as `Elven Lineage` would be false.

Relevant text:

> "Choose a lineage from the Elven Lineages table. You gain the level 1 benefit of that lineage."

### 2. Character-level gated grants inside a species trait

Needed shape: per-grant or per-bundle thresholds keyed to character level.

Why existing surface is insufficient:

- `SpeciesTraitRecord` has no `acquiredAtLevel`.
- `grant_spell_access` can express prepared/free-cast behavior, but not "this grant turns on at character level 3/5".

Relevant text:

> "When you reach character levels 3 and 5, you learn a higher-level spell, as shown on the table."

### 3. Spell-list choice plus long-rest replacement

Needed shape: a `grant_spell_access`-adjacent variant for "know one cantrip chosen from a named spell list, replaceable on Long Rest".

Why existing surface is insufficient:

- `grant_spell_access` requires a fixed `spellId`.
- No current field models "choose from Wizard cantrip list".
- No current field models "replace the granted cantrip on Long Rest".

Relevant text:

> "Whenever you finish a Long Rest, you can replace that cantrip with a different cantrip from the Wizard spell list."

### 4. Trait-scoped spellcasting ability choice

Needed shape: a closed ability-choice field on the lineage spell grants.

Why existing surface is insufficient:

- The trait grants spells whose casting ability is chosen from `Intelligence`, `Wisdom`, or `Charisma`.
- Current `grant_spell_access` has no field for a chosen spellcasting ability source.

Relevant text:

> "Intelligence, Wisdom, or Charisma is your spellcasting ability for the spells you cast with this trait (choose the ability when you select the lineage)."

## Classification

`surface_widening`

Reason: the unit still belongs to the existing `species_trait` kind, and the needed mechanics are built from existing concepts such as passive grants and spell access. The gap is that the current authored surface lacks the required variants for:

- unit-level closed choice among lineage bundles
- character-level gated grants within a species trait
- spell-list choice with long-rest replacement
- chosen spellcasting ability for trait-granted spells
