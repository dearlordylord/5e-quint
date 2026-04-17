## Gloves of Missile Snaring

The unit does not fit honestly in the current authored surface, so no `content/magic_item_gloves_of_missile_snaring.dhall` was written.

### Why it does not fit

The existing `magic_item` kind can express passive items and activated items, including activations that cost a `reaction`. That is not enough here.

The item's core deterministic mechanic is:

> "If you're hit by an attack roll made with a Ranged or Thrown weapon while wearing these gloves, you can take a Reaction to reduce the damage by 1d10 plus your Dexterity modifier if you have a free hand."

Two gaps block an honest encoding:

1. `ActivatedAbilityMechanics` has no trigger field for non-spell reactions.
   The only closed trigger grammar in the surface is `ReactionTrigger`, but it exists only under spell `CastingTime.kind = "reaction"`. A magic item activation cannot currently say "this reaction is available only when hit by an attack roll made with a Ranged or Thrown weapon".

2. There is no effect atom for damage reduction.
   The surface can model resistance, immunity, AC bonuses, and direct damage, but not "reduce the damage by 1d10 + Dex mod" after a hit is confirmed. This is not `grant_resistance`, because it is a one-shot numeric reduction applied to a single incoming damage instance.

### Secondary rider

The catch rider is secondary and should not drive the classification:

> "If you reduce the damage to 0, you can catch the ammunition or weapon if it is small enough for you to hold in that hand."

That looks like object-state / inventory transfer pressure after the reduction resolves, but the unit already fails before reaching that rider.

### Proposed widenings

1. `new_variant`: reusable non-spell reaction trigger on activated abilities.
   Suggested shape: add an optional trigger field to `ActivatedAbilityMechanics`, reusing the existing `ReactionTrigger` grammar or moving that grammar to a shared non-spell/spell location.

2. `new_atom`: `reduce_damage_taken`.
   Needed for one-shot reactive mitigation like "reduce the damage by 1d10 plus your Dexterity modifier".

The free-hand requirement is a predicate on the reaction's availability. It could likely be handled as part of the trigger/predicate widening rather than forcing a separate atom by itself.
