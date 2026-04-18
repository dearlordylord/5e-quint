# Gloves of Missile Snaring

## Verdict

`surface_widening`

The item otherwise fits the existing `magic_item` + `triggered_reaction` family:

- trigger: `hit_by_attack_roll` with a weapon filter covering ranged or thrown weapons
- reaction cost: existing non-spell `triggered_reaction`
- primary effect: `reduce_damage_taken` with `1d10 + Dex modifier`

I did **not** author `content/magic_item_gloves_of_missile_snaring.dhall` because the current surface cannot encode the rule's explicit free-hand gate honestly.

## Required widening

### Add a free-hand equipment / activation gate

The current activation/passive `condition` surface only supports:

- `holding_item`
- `wearing_item`
- `unarmored`
- armor / weapon predicates
- `all_of`

It does **not** support:

- "has a free hand"

This matters to the core mechanical permission, not just flavor. Encoding the reaction without that gate would claim the wearer can always reduce the damage whenever hit, which is false.

Suggested direction:

- add a new `EquipmentPredicate` variant such as `free_hand`
- allow it inside existing `all_of` so future items/features can say things like `wearing_item AND free_hand`

Evidence:

> "you can take a Reaction to reduce the damage by 1d10 plus your Dexterity modifier **if you have a free hand**."

## Secondary omission

The catch rider also lacks a current surface match:

> "If you reduce the damage to 0, you can catch the ammunition or weapon if it is small enough for you to hold in that hand."

This is secondary to the main reaction. The current surface has no item-possession / projectile-catch effect atom, and no conditional branch keyed to "damage reduced to 0" for non-spell item reactions. I am not classifying the whole unit as `atom_widening` on that basis because the primary blocker is narrower and should be addressed first.

If the project later wants full fidelity here, that likely needs:

- a new effect atom for catching or retaining the intercepted projectile/weapon, or
- a small reaction-side conditional subgraph keyed to a zero-damage interception outcome.
