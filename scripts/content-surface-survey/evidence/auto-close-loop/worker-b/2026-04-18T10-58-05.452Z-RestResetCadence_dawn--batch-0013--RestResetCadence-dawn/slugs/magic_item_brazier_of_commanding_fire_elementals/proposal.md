## Brazier of Commanding Fire Elementals

The unit fits the existing `magic_item` + `spawned_creature` family closely enough to author, but the current surface still misses several item-specific details. The result is `surface_widening`, not `clean`.

### Missing surface shapes

1. Activation gate tied to proximity to a placed item

- Why it matters: the item is not held, worn, or wielded. The current `EquipmentPredicate` vocabulary cannot say "you must be within 5 feet of this item" at activation time.
- Evidence: "While you are within 5 feet of this brazier, you can take a Magic action..."
- Proposed widening: add an activation/item predicate variant for proximity to the source item, such as `within_feet_of_item`.

2. Spawn placement relative to the item, not the caster

- Why it matters: `range` can only express coarse `self` / `touch` / point ranges. It cannot express "the summoned creature appears in the nearest unoccupied space to the item".
- Evidence: "The elemental appears in an unoccupied space as close to the brazier as possible..."
- Proposed widening: add a spawn-origin / placement variant rooted on the item, with nearest-valid-space semantics.

3. Catalog-ref summon override for language comprehension

- Why it matters: `SpawnedCreatureStatBlock.kind = "catalog_ref"` can name the Fire Elemental, but it cannot layer item-specific comprehension text on top of the referenced stat block.
- Evidence: "understands your languages"
- Proposed widening: allow bounded overrides on `catalog_ref` summons, at minimum for `languages`.

4. Optional command metadata instead of forced placeholders

- Why it matters: `CreatureControl` currently requires `commandRangeFeet` and `defaultBehavior` even when the item text does not specify either. The encoding had to use conservative placeholders.
- Evidence: "obeys your commands, and takes its turn immediately after you on your Initiative count"
- Proposed widening: make those fields optional, or add an explicit "unspecified_by_text" form so authored records do not invent fallback behavior.
