# Proposal: Gloves of Missile Snaring

## Verdict

`surface_widening`

`Gloves of Missile Snaring` is a `magic_item` and its primary mechanic is a non-spell `triggered_reaction`, but the current surface cannot encode that reaction honestly.

## Why it stops

The obvious family fit is `MagicItemComponentMechanics = TriggeredReactionAbilityMechanics`, because the item:

- is worn,
- reacts to a hit by an attack roll,
- narrows that trigger to attacks made with a `Ranged` or `Thrown` weapon,
- consumes the user's normal `Reaction`,
- reduces incoming damage by `1d10 + Dex mod`.

The blocker is that `TriggeredReactionAbilityMechanics` inherits the activated-ability header and therefore requires both:

- `resource: ActivationResource`
- `resetCadence: RestResetCadence`

That is not honest for this item. The gloves do not have charges, use-counts, or rest-based recharge text. Their only cost is the reaction quota on the triggering turn.

## Narrow widening needed

Add a way to author a non-spell `triggered_reaction` that spends only the reaction quota and has no extra limited-use pool.

Two plausible shapes:

1. Make `resource` and `resetCadence` optional for `TriggeredReactionAbilityMechanics` when the item/feature is quota-only.
2. Add an explicit sentinel such as `ActivationResource = { kind: "none" }` and a matching no-op reset form.

Either would allow the primary mechanic to encode cleanly with existing atoms:

- `respond`
- `reaction_window`
- `reaction_quota`
- `reduce_damage_taken`

## Additional surface gaps

### Free-hand gate

The reaction only works `if you have a free hand`.

Current `EquipmentPredicate` can express:

- `wearing_item`
- `holding_item`
- `wielding_weapon`
- `wearing_armor`
- `unarmored`
- `all_of`

It cannot express hand availability. A narrow extension such as `EquipmentPredicate.free_hand_available` would cover this honestly.

### Catching the projectile/weapon

The follow-up rider also lacks current surface support:

> If you reduce the damage to 0, you can catch the ammunition or weapon if it is small enough for you to hold in that hand.

This is secondary to the main reaction, but it still needs more than the current authored surface provides:

- a branch conditioned on the reduction bringing the triggering damage to 0,
- an item/ammunition follow-up effect,
- the hand-size / holdability gate.

I did not classify this as the primary blocker because the item already fails earlier on the quota-only reaction shape.
