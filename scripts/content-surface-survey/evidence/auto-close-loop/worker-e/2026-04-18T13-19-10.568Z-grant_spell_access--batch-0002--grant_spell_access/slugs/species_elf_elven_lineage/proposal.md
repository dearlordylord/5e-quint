## Verdict

`Elven Lineage (Elf)` does not fit the current `SpeciesTraitRecord` surface honestly.

The current species-trait surface only allows:

- `passive` — one unconditional always-on grants bundle
- `activation` — one activated ability with cost/resource/reset

Elven Lineage is neither. It is a build-time lineage selection that creates one of several mutually exclusive progression tracks, and each track mixes passive grants with character-level-gated spell grants.

## Why This Forces A Structural Widening

The trait text requires all of these at once:

- a **build-time choice** among `Drow | High Elf | Wood Elf`
- **branch-specific benefits** after that choice
- **character-level unlocks** at levels 3 and 5
- a mix of **passive** effects and **spell-access** effects inside the same chosen branch

Evidence:

> "Choose a lineage from the Elven Lineages table. You gain the level 1 benefit of that lineage."

> "When you reach character levels 3 and 5, you learn a higher-level spell, as shown on the table."

That is not representable as one existing `passive` record or one existing `activation` record, and `SpeciesTraitMechanics` has no `composite` family analogous to class features / magic items.

## Secondary Surface Gaps

Even after adding a non-spell choice/progression family, High Elf still exposes a narrower surface gap:

> "Whenever you finish a Long Rest, you can replace that cantrip with a different cantrip from the Wizard spell list."

Current `grant_spell_access` can name a specific spell or carry a fixed/closed ability choice, but it cannot express:

- a **spell-list-based cantrip choice**
- **long-rest replacement** of that chosen spell

## Suggested Widenings

1. `new_variant`: non-spell composite/branching species-trait mechanics

Why:
Allow one species trait to contain a build-time choice among mutually exclusive branches, where each branch carries its own grants/progression.

2. `new_variant`: character-level-gated non-spell grant progression

Why:
Elven Lineage unlocks additional branch content specifically at character levels 3 and 5.

3. `new_subgraph`: selectable spell-access track with rest-based replacement

Why:
High Elf cantrip selection is not a fixed spell id; it is a chosen Wizard cantrip that can be replaced on each Long Rest.
