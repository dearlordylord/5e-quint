# Proposal: Dagger of Venom

## Verdict

`Dagger of Venom` does not fit the current authored surface honestly. The item is a `magic_item`, and its always-on `+1` weapon bonus fits today, but its poison-coating property does not.

The missing shape is an activated, persistent weapon rider:

- activated with a `Bonus Action`;
- persists for a timed window (`1 minute`);
- ends early on the first qualifying hit with the specific weapon;
- on that later hit, opens a save gate on the hit target;
- on failed save, deals poison damage and applies `poisoned`;
- resets at dawn.

That is not representable by the current `MagicItemMechanics` families.

## What Fits Today

The first paragraph fits cleanly as a passive magic-item part:

> You gain a +1 bonus to attack rolls and damage rolls made with this magic weapon.

This can be expressed with existing atoms:

- `modify_roll_numeric` on `attack_roll`
- `modify_damage_numeric`
- both scoped with `weaponFilter = { kind: "specific_item", itemId = "magic_item_dagger_of_venom" }`

So the widening is not about the passive enhancement.

## Why Existing Families Fail

The second paragraph is the blocker:

> You can take a Bonus Action to magically coat the blade with poison. The poison remains for 1 minute or until an attack using this weapon hits a creature. That creature must succeed on a DC 15 Constitution saving throw or take 2d10 Poison damage and have the Poisoned condition for 1 minute.

### `passive` is dishonest

`PassiveMechanics.grants` are always-on grants. Authoring the poison effect there would imply the save gate or extra poison rider is continuously active, which is false. The poison is only present after a Bonus Action activation, lasts for a bounded time, and is consumed by the first hit.

### `activation` is incomplete

`ActivatedAbilityMechanics` supports:

- activation cost;
- resource/reset cadence;
- optional duration;
- immediate `phases`.

What it cannot express is "after activation, wait for a future hit with this weapon, then resolve a save gate against that hit target." There is no ongoing-trigger surface for non-spell activated abilities.

### `triggered_reaction` is the wrong family

The poison discharge is not a reaction:

- it does not consume the reaction quota;
- it does not open from a reaction trigger;
- it is armed in advance by a Bonus Action.

Using `triggered_reaction` would misstate the action economy and timing.

## Forced Widening

### New subgraph / family support for activated persistent on-hit weapon riders

The surface needs a way for a non-spell unit, especially a `magic_item`, to express:

- activate now;
- create a temporary armed state on a specific weapon;
- during that state, when the wielder hits with that weapon, open an `on_hit_window`;
- resolve a follow-up `save_gate` against the hit target;
- expire on first trigger or timeout.

This is a `structural_widening`, not just a missing atom or scalar field, because no existing `MagicItemMechanics` family can host this lifecycle honestly.

One honest direction would be either:

- a non-spell `ongoing_effect` family reusable by magic items / feats / class features; or
- a reshape of `ActivatedAbilityMechanics` so activated non-spell units can carry ongoing trigger operations, not only immediate phases.

## Honest Non-encoding Decision

I did not create:

- `content/magic_item_dagger_of_venom.dhall`
- `content/magic_item_dagger_of_venom.json`
- `content/magic_item_dagger_of_venom.trace.md`

because the only currently-valid encodings would misrepresent the poison-coating mechanic.
