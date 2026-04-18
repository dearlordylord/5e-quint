# Gloves of Missile Snaring

## Verdict

`surface_widening`

The unit fits the existing `magic_item` + `triggered_reaction` family in broad shape:

- worn magic item
- reaction trigger on being hit
- immediate damage reduction effect

But the current authored surface cannot represent two required legality constraints honestly, so a placeholder JSON would be misleading.

## Missing Surface Shapes

### 1. Mixed ranged/thrown weapon trigger filter

The trigger text is:

> If you're hit by an attack roll made with a Ranged or Thrown weapon

`ReactionTrigger.hit_by_attack_roll` already accepts an optional `weaponFilter`, but `WeaponFilter` only supports:

- `weapon_category: "melee" | "ranged"`
- `specific_item`

That is not enough here:

- `ranged` covers ranged weapons
- `thrown` is a distinct property that can apply to weapons that are not in the `ranged` category

So the current surface cannot say "ranged or thrown" without lying.

Suggested widening:

- add a `WeaponFilter` variant that can express thrown weapons directly, or
- add a closed union variant for the combined SRD case (`ranged_or_thrown`)

### 2. Free-hand legality gate

The damage reduction is conditional:

> you can take a Reaction to reduce the damage by 1d10 plus your Dexterity modifier if you have a free hand

The magic-item reaction family already supports item-state gating via `condition`, but the current `EquipmentPredicate` vocabulary has no way to express:

- free hand required

Existing variants (`wearing_item`, `holding_item`, `wielding_weapon`, etc.) do not cover hand availability.

Suggested widening:

- add `EquipmentPredicate.free_hand`, or
- add a composable predicate shape that can express `wearing_item AND free_hand`

## Secondary Omitted Rider

The item also says:

> If you reduce the damage to 0, you can catch the ammunition or weapon if it is small enough for you to hold in that hand.

This rider is not the primary blocker I used for classification, but it is also not modeled by the current surface:

- no explicit object-catch / seize / acquire-in-hand effect
- no existing size gate for held objects

Given the current prototype boundary, this reads as object-state / caller-heavy residue and should not be faked into the content record.

## Why I Did Not Author Content

An honest encoding would need all of these to be true at once:

- reaction only when hit by a ranged-or-thrown weapon attack
- wearer has a free hand
- reduce incoming damage by `1d10 + Dex mod`

The damage-reduction atom exists (`reduce_damage_taken`), and the triggered-reaction item family exists, but the trigger and legality constraints do not. A content file would therefore overstate when the item is usable.
