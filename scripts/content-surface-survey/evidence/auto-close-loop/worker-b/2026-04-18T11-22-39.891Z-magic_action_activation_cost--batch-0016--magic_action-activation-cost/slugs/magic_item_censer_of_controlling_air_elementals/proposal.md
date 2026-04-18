## Censer of Controlling Air Elementals

The unit fits the existing `magic_item` + `spawned_creature` family, but not cleanly.

Missing surface support:

1. Spawn placement anchored to the item.
Evidence: "The elemental appears in an unoccupied space as close to the censer as possible."
Why it matters: `MagicItemSpawnedCreatureMechanics` only carries a coarse `range` header. It cannot say that placement is determined relative to the item and forced to the nearest valid space.

2. Catalog-ref language inheritance from the summoner.
Evidence: "understands your languages"
Why it matters: `SpawnedCreatureStatBlock.kind = "catalog_ref"` can name only the referenced monster id and display name. It cannot add a deterministic override like "understands the user's languages".

3. Control metadata currently requires placeholders when RAW leaves it implicit.
Evidence: "obeys your commands, and takes its turn immediately after you on your Initiative count."
Why it matters: `CreatureControl` requires `commandRangeFeet` and `defaultBehavior`, but this item does not specify either. The authored encoding uses conservative placeholders (`commandRangeFeet = 0`, `defaultBehavior = "dodge_and_avoid"`), which preserves traceability but is still a schema pressure point.

Suggested classification: `surface_widening`

Suggested widenings:

- New variant or field on the spawned-creature placement surface for "nearest unoccupied space relative to item".
- New variant or field on `SpawnedCreatureStatBlock.catalog_ref` for deterministic summon overrides like "understands summoner languages".
- Make `CreatureControl.commandRangeFeet` and `CreatureControl.defaultBehavior` optional when the rules text does not specify them.
