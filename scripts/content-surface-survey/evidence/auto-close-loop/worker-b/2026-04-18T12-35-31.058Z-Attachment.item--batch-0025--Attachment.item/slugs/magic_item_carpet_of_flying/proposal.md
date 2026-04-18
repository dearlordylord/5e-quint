`Carpet of Flying` does not fit the current authored surface honestly.

Why it blocks:

- The item is an activated magic item, but the current non-spell `activation` family requires a consumable `resource` plus `resetCadence`. `Carpet of Flying` is at-will: "You can make this carpet hover and fly by taking a Magic action and using the carpet's command word."
- The thing being controlled is the item itself, not the wielder and not a spawned creature. Current shapes can:
  - grant a speed to a creature;
  - create and command a companion creature;
  - target an item for limited item-specific effects.
  They cannot model "this existing item becomes a commanded flying platform."
- The item's movement profile depends on carried load: "A carpet can carry up to twice the weight shown on the table, but its Fly Speed is halved if it carries more than its normal capacity." The current surface has no item-side carrying-capacity + movement-speed linkage.

What already fits:

- The four published carpet sizes fit the existing `MagicItemRecord` collection/variant pattern.
- The GM-random-size line does not need runtime mechanics; it can stay provenance/description-level.

Minimum honest widening:

1. `new_variant`: resource-less non-spell activation
   - Add an activation shape for at-will item/feature activations that spend an action/reaction/etc. but no use-count or charge pool.

2. `new_subgraph`: controllable flying item/platform
   - A way for an existing item attachment to enter a persistent commanded-motion state, including:
     - hover;
     - fly speed on the item/platform itself;
     - direction control by a creature within a stated control range.

3. `new_variant` or `new_subgraph`: load-dependent item speed profile
   - Encode normal capacity, over-capacity ceiling, and a speed change when load crosses a threshold.

Why this is structural rather than a small atom patch:

- No existing mechanics family can currently say "take a Magic action, then this pre-existing item flies under your commands at will."
- Forcing it into `spawned_creature` would be false: the carpet is not created by the action and is not a creature.
- Forcing it into a passive self-buff would be false: the bearer does not gain a fly speed.
