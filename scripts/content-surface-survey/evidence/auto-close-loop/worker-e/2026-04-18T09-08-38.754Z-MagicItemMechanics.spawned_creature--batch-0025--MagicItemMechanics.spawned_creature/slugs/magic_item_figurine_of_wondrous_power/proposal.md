`Figurine of Wondrous Power` does not fit the current magic-item surface honestly as a single authored collection record.

Why it fails:

- The surface supports `magic_item` collections with per-variant mechanics, and it supports a single `spawned_creature` payload for magic items.
- This collection includes variants that require structures beyond a single spawned companion:
  - `Golden Lions`: "You can use one figurine or both simultaneously. Each can become a Lion..."
  - `Goat of Traveling`: "It has 24 charges, and each hour or portion thereof it spends in goat form costs 1 charge."
  - `Goat of Terror`: while mounted, creatures in a 30-foot emanation make recurring saves against Frightened, and the goat also supports detachable temporary weapons.

The dominant blocker is structural, not just a missing atom:

- `MagicItemSpawnedCreatureMechanics` can represent one summoned creature, but not a collection variant that can summon multiple independent creatures from one item record.
- The magic-item families do not include an item-side equivalent of spell multi-spawn families or a bounded "choose one or both" summon structure.
- The time-drain wording on `Goat of Traveling` is not an activation-time resource spend. It is a recurring resource drain tied to elapsed time while the creature remains in form.

Proposed widenings:

1. `new_subgraph`: `magic_item_multi_spawn`
   - Needed for collection variants that can create more than one independent creature from one activation domain.
   - Evidence: "You can use one figurine or both simultaneously. Each can become a Lion for up to 1 hour."

2. `new_variant`: `MagicItemSpawnedCreatureMechanics.spawnCountChoice`
   - A bounded choice over one vs multiple spawned instances would cover pair/set figurines without inventing fake separate item records.
   - Evidence: "These gold statuettes of lions are always created in pairs. You can use one figurine or both simultaneously."

3. `new_variant`: recurring resource drain on active form duration
   - The current resource model spends uses/charges on activation and resets later; it does not express "lose 1 charge for each hour or portion thereof while active."
   - Evidence: "It has 24 charges, and each hour or portion thereof it spends in goat form costs 1 charge."

Secondary pressure that would still remain after the structural widening:

- `Goat of Terror` wants an aura-like ongoing save gate while mounted, plus detachable temporary item creation. Those are additional surface gaps, but they are not the first blocker because the unit already fails at the collection/multi-spawn layer.

Because the unit cannot be represented without lying about its structure, no `content/magic_item_figurine_of_wondrous_power.dhall` was authored.
