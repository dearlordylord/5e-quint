# Dwarven Plate

## Verdict

`Dwarven Plate` is a `magic_item`, but it does not fit the current `MagicItemMechanics` surface honestly.

The first clause fits existing `PassiveMechanics`:

- `While wearing this armor, you gain a +2 bonus to Armor Class.`

That could be authored as a passive `modify_ac` grant.

The second clause does not fit:

- `if an effect moves you against your will along the ground, you can take a Reaction to reduce the distance you are moved by up to 10 feet.`

## Why Existing Families Fail

Current `MagicItemMechanics` supports:

- `passive`
- `activation`
- `composite` over passive/activation parts

But this rider is neither:

- not `passive`, because it is conditional and spends a Reaction only when a trigger occurs;
- not `activation`, because `ActivatedAbilityMechanics` requires a `resource` + `resetCadence`, which would falsely imply a per-rest/per-day use pool instead of normal unlimited reactive use bounded only by the reaction quota.

So the blocker is structural before authoring any JSON.

## Required Widenings

### 1. Trigger-shaped passive/reaction component for magic items

The surface needs a magic-item component that can stand ready passively and fire on a trigger, consuming only the reaction quota when the trigger occurs.

This is broader than a new variant on an existing field; it is a missing mechanics shape / subgraph for non-spell units.

Suggested direction:

- widen `MagicItemComponentMechanics` to admit a trigger-shaped component, or
- generalize the spell-only `triggered_reaction` family into a reusable non-spell reactive family.

### 2. Effect atom for reducing incoming forced movement

Even with a reactive family, the payload is not representable with current atoms.

Existing nearby atoms are insufficient:

- `force_move` causes movement;
- `modify_speed` changes speed stats;
- `set_speed` / `set_speed_ratio` set speed values.

None means:

- intercept movement from another effect,
- reduce the incoming distance,
- cap the reduction at a fixed amount (`up to 10 feet`),
- preserve any remainder.

So this pressures a new effect atom, e.g. `reduce_forced_movement`.

## Honest Outcome

- `structural_widening`

I did not author `content/magic_item_dwarven_plate.dhall` because any current encoding would be misleading about either the trigger/economy or the movement-reduction payload.
