# Dagger of Venom

## Verdict

`structural_widening`

## Why it does not fit honestly

The item has two separable parts:

- a passive weapon bonus: `+1` to attack rolls and damage rolls made with this specific weapon;
- an activated poison-coating rider: bonus action to arm the weapon, persist for up to 1 minute, expire on the first hit with that weapon, then force a save-gated payload on the hit creature.

The passive half is representable today as a magic-item composite with passive grants:

- `modify_roll_numeric` on `attack_roll` with `weaponFilter = specific_item`
- `modify_damage_numeric` with `weaponFilter = specific_item`

The activated half is the blocker. The current magic-item surface supports:

- `passive`
- `activation`
- `triggered_reaction`
- `spawned_creature`
- `composite` of those

None of those families can express:

1. bonus-action activation now;
2. creation of a temporary armed state on the weapon;
3. later resolution on a future hit made with that specific weapon;
4. automatic consumption of the armed state on first hit or on 1-minute expiry.

Encoding it as an immediate `activation` would be false, because the save and poison effects do not happen when you coat the blade.

Encoding it as a plain `triggered_reaction` would also be false, because the later hit is not itself a reaction use, and the item's once-per-dawn resource is spent when coating the blade, not when the hit lands.

## Required widening

Proposed widening: `MagicItemComponentMechanics.ongoing_effect`

This should mirror the spell-side ability to create timed persistent state with later triggered operations, but for non-spell item activations. At minimum it needs to support:

- activation cost and reset cadence from existing activated item mechanics;
- a duration window (`1 minute`);
- an operation trigger equivalent to `on_caster_attack_hit`;
- narrowing to `weaponFilter = specific_item`;
- one-shot consumption on first qualifying hit;
- a later `save_gate` payload on the hit target.

## Evidence

> You can take a Bonus Action to magically coat the blade with poison.

> The poison remains for 1 minute or until an attack using this weapon hits a creature.

> That creature must succeed on a DC 15 Constitution saving throw or take 2d10 Poison damage and have the Poisoned condition for 1 minute.

> The weapon can't be used this way again until the next dawn.
