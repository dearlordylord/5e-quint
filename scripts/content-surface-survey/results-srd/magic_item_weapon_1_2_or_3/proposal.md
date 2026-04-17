# Weapon, +1, +2, or +3

Outcome: `atom_widening`

## Why it does not fit cleanly

The unit is structurally a `magic_item` with `passive` mechanics, but its actual rule text has two requirements the current surface cannot represent honestly:

1. A persistent bonus to weapon damage rolls.
2. Scoping to this exact magic weapon, not to all weapons of a category the wielder uses.

## Existing surface coverage

The attack-roll half is close to existing support:

- `modify_roll_numeric` can modify `attack_roll`.
- `DiceDelta.fixed_dice` can represent `+1`, `+2`, or `+3`.

But that still fails honesty for this item because the current scoping tools are too coarse:

- `weaponFilter` only supports `{ kind = "weapon_category", category = "melee" | "ranged" }`.
- `EquipmentPredicate` gates by broad wielding state, not by the weapon actually making the roll.

This item is `Weapon (Any Simple or Martial)`, so the same authored unit must cover either melee or ranged instances depending on the concrete item. More importantly, the bonus is tied to the enchanted weapon itself.

## Forced widenings

### 1. New atom: `modify_damage_numeric`

Need a standing effect atom for flat bonuses to damage rolls.

Why:

- `modify_roll_numeric` only covers d20 roll kinds (`attack_roll`, `saving_throw`, `ability_check`, `initiative`, `death_saving_throw`).
- `damage` is an effect instance, not a modifier to future weapon damage rolls.

Pressure text:

> You have a bonus to attack rolls and damage rolls made with this magic weapon.

### 2. New surface variant: item-bound weapon scoping

Need a way to say the modifier applies only when the roll/damage is made with the attached magic weapon.

Why:

- `weaponFilter` can only say melee or ranged.
- `EquipmentPredicate.wielding_weapon` would be dishonest because wielding a weapon is broader than making the roll with this exact item.

Pressure text:

> You have a bonus to attack rolls and damage rolls made with this magic weapon.

## Notes

- The rarity mapping itself is not the blocker; `+1`, `+2`, and `+3` are all representable as numeric deltas once the missing atom and scoping exist.
- I did not author `content/magic_item_weapon_1_2_or_3.dhall` because any current encoding would either omit the damage bonus or over-apply the bonus to other weapons, producing a misleading trace.
