# Scimitar of Speed

## Verdict

`Scimitar of Speed` does not fit the current surface honestly. The blocker is structural first, with additional atom and filter gaps underneath it.

## Why It Fails

The item has two distinct mechanic streams:

1. Passive weapon-bound bonuses:
   - `+2` to attack rolls
   - `+2` to damage rolls

2. A repeatable action-economy rider:
   - one attack with the scimitar as a Bonus Action on each of your turns

The current `MagicItemMechanics` type is:

- `PassiveMechanics`
- or `ActivatedAbilityMechanics`

That means one item cannot currently carry both the passive bonuses and the repeatable attack rider in a single honest record.

## Specific Gaps

### 1. Structural gap: mixed passive + activation item

This item needs a mechanics shape that can express both:

- passive grants while attuned/wielded
- a repeatable attack permission on each turn

Without that, any authored record would have to drop one half of the item.

Suggested widening:

- `MagicItemMechanics.passive_plus_activation`
- or a more general composition shape that lets one unit carry both passive grants and activated/repeatable procedures

### 2. Missing effect atom: fixed damage-roll bonus

The surface can encode:

- AC bonuses via `modify_ac`
- roll bonuses via `modify_roll_numeric`

But it cannot encode:

- `+2` to damage rolls made with the weapon

Suggested widening:

- new atom `modify_damage_numeric`

### 3. Missing filter precision: “this magic weapon”

The current `WeaponFilter` only supports:

- `melee`
- `ranged`

That is too coarse for this item. The bonus applies to this exact scimitar, not to every melee weapon.

Suggested widening:

- new filter variant for a specific item / weapon instance, e.g. `item_instance_weapon_filter`

### 4. Missing action-economy subgraph: bonus-action weapon attack

`grant_extra_action` is not the right shape:

- it grants an extra Action, not a Bonus Action
- it does not constrain the granted use to one attack
- it does not bind that attack to a named weapon

Suggested widening:

- new subgraph such as `grant_bonus_action_weapon_attack`

## Evidence

> You gain a +2 bonus to attack rolls and damage rolls made with this magic weapon. In addition, you can make one attack with it as a Bonus Action on each of your turns.

## Recommendation

Classify this unit as `structural_widening`.

No `content/magic_item_scimitar_of_speed.dhall` should be authored under the current schema, because any such encoding would omit core mechanics and produce a misleading trace.
