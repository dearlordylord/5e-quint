# Dagger of Venom surface gap

`Dagger of Venom` does not fit the current magic-item surface honestly.

## What fits today

The passive item bonus is already expressible:

- `modify_roll_numeric` on `attack_roll` with `weaponFilter = specific_item`
- `modify_damage_numeric` with the same `weaponFilter`

That covers:

> You gain a +1 bonus to attack rolls and damage rolls made with this magic weapon.

## What does not fit

The activated poison coating is neither a plain immediate activation nor a reaction.

RAW structure:

1. Spend a `bonus_action`.
2. Arm the specific weapon with a poison coating.
3. The coating persists for up to 1 minute, but ends early on the first hit with that weapon.
4. On that hit, the struck creature makes a fixed DC 15 Constitution save.
5. On a failed save, the target takes `2d10 poison` and gains `Poisoned` for 1 minute.
6. The item then locks until the next dawn.

The current magic-item surface can model:

- passive grants
- immediate activations with phases resolved at activation time
- triggered reactions
- composites of those

It cannot model an activation that installs a later weapon-hit rider.

## Why this is structural, not just a missing atom

This is not blocked by a single missing effect atom. The existing atoms are largely sufficient:

- `damage`
- `apply_condition`
- `modify_roll_numeric`
- `modify_damage_numeric`

The real gap is the missing composition shape:

- an activated magic-item component that creates a temporary, weapon-scoped, on-hit rider
- that rider self-terminates on first qualifying hit
- while the failed-save `Poisoned` condition continues on the target for its own separate 1-minute duration

That is a missing subgraph / family capability, not just a missing field on an existing atom.

## Required widening

1. `activated_weapon_coating_rider`

An activated magic-item subgraph that combines:

- `activationCost`
- `resource`
- `resetCadence`
- a timed armed state on a specific item
- an `on_caster_attack_hit` rider scoped to that specific weapon
- early termination after the first qualifying hit

Evidence:

> You can take a Bonus Action to magically coat the blade with poison. The poison remains for 1 minute or until an attack using this weapon hits a creature.

2. `on_hit_applied_effect_with_independent_duration`

The consumed rider needs to apply a target-side effect whose duration is not the same as the coating's duration.

Evidence:

> That creature must succeed on a DC 15 Constitution saving throw or take 2d10 Poison damage and have the Poisoned condition for 1 minute.

## Why I did not author content

Any current encoding would be misleading:

- a plain `activation` would wrongly resolve the save/damage at coat time instead of on hit
- a passive-only encoding would lose the bonus-action arming and dawn recharge
- an ongoing spell-style encoding would still fail to represent the target's separate 1-minute Poisoned duration after the coating is consumed

Because the only valid JSON would misstate the rule, I did not create `content/magic_item_dagger_of_venom.dhall`, `content/magic_item_dagger_of_venom.json`, or a trace file.
