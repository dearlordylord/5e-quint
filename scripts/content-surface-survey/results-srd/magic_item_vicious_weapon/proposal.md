# Vicious Weapon

## Verdict

`Vicious Weapon` does not fit the current authored surface honestly. The unit is a `magic_item`, but its mechanic is neither:

- `passive` as currently modeled for magic items, because `PassiveMechanics.grants` only supports always-on effect atoms; nor
- `activation`, because the item has no activation cost, no use-count, and no reset cadence.

The missing shape is an always-armed weapon-hit rider for a non-mastery source.

## Why Existing Families Fail

The core rule is:

> This magic weapon deals an extra 2d6 damage to any creature it hits.

That is trigger-shaped. The damage happens only after a hit with the weapon, not continuously while the item is equipped.

The surface does have a hit-trigger family today, but only for `mastery`:

- `MasteryRecord.mechanics.family = "on_hit_trigger"`

Using that family for a magic item would be dishonest at the top-level kind boundary.

Using `MagicItemRecord.mechanics.family = "passive"` would also be dishonest, because a passive grant like `{ kind = "damage", ... }` would read as unconditional ongoing damage rather than damage gated by a weapon hit.

## Forced Widenings

### 1. New subgraph / family support for passive on-hit riders on non-mastery units

The surface needs a way for `magic_item` (and likely some feats/class features later) to express:

- always on while wielded/used;
- opens an `on_hit_window` when the wielder hits with the relevant weapon;
- grants extra damage in that window.

This could be realized either as:

- a new mechanics family available to non-spell/non-mastery units, or
- a reshape that allows triggered operations under passive non-spell records.

This is a `structural_widening`, not just a missing atom, because the existing `magic_item` mechanics families cannot host this trigger-coupled behavior.

### 2. Damage type linked to the weapon's normal damage type

The rule also says:

> This extra damage is of the same type as the weapon's normal damage.

Current `DamageTypeRef` supports:

- a fixed `DamageType`, or
- a closed `choice`.

It does not support "inherit the triggering weapon attack's damage type." That requires a new variant, such as a weapon-linked damage-type reference.

## Honest Non-encoding Decision

I did not create:

- `content/magic_item_vicious_weapon.dhall`
- `content/magic_item_vicious_weapon.json`
- `content/magic_item_vicious_weapon.trace.md`

because any currently-valid encoding would misrepresent the rule.
