## Gem of Seeing

`Gem of Seeing` does not fit the current surface honestly.

The item's mechanics split into two parts that the surface can represent separately but not together:

1. Charge-based activation:
   "This gem has 3 charges. As a Magic action, you can expend 1 charge."
   The current `magic_item` activation family already supports `activationCost = standard_action magic`, `charge_pool`, attunement, and `dawn` recharge.

2. Conditional timed sense grant:
   "For the next 10 minutes, you have Truesight out to 120 feet when you peer through the gem."
   The surface already has:
   - `grant_sense` for Truesight.
   - `peering_through_item` as an equipment predicate.
   - `duration` on activated abilities.

The gap is that `condition` on `ActivatedAbilityMechanics` gates only the activation itself, not the benefit during its timed window. Encoding this as a plain timed `grant_sense` would be false, because the bearer does not have Truesight continuously for 10 minutes; they have it only while peering through the gem during that 10-minute window.

### Required widening

Add a way for an activated ability's outlasting effect window to carry an equipment predicate, for example:

- a duration-scoped condition on `ActivatedAbilityHeader`, or
- a gated/toggled timed passive sub-shape inside activation/composite mechanics.

This is a `surface_widening`, not an `atom_widening`. No new v4 atom is forced; the missing concept is the composition of existing pieces:

- existing effect atom: `grant_sense`
- existing predicate: `peering_through_item`
- existing lifecycle: timed duration

### Evidence

> "For the next 10 minutes, you have Truesight out to 120 feet when you peer through the gem."
