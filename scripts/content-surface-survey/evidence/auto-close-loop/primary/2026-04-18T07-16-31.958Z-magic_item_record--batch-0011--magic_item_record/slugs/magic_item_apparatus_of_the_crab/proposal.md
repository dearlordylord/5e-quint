## Why this does not fit

`Apparatus of the Crab` is not primarily a passive bonus item or a bounded activated ability. Its rules define a persistent, operable vehicle/object with:

- its own object stat block (`AC 20; HP 200; Speed 30 ft., Swim 30 ft.`),
- occupancy and pilot requirements,
- sealed-compartment breathing rules,
- environment-triggered damage below 900 feet,
- a reusable 10-lever control panel,
- lever-driven state transitions (legs/claws/windows/hatch/light),
- lever-driven movement and attack outputs.

The current `MagicItemMechanics` families cannot represent that honestly:

- `passive` only grants always-on effects.
- `activation` is a bounded one-shot ability with resource/reset cadence.
- `triggered_reaction` is reactive.
- `composite` only combines those same families.

None of them model a persistent controllable object that remains in play and can be repeatedly operated by occupants through a control surface.

## Missing structure

### 1. `MagicItemMechanics.vehicle`

The item needs a dedicated mechanics family for controllable objects/vehicles, likely with:

- object/vehicle stat block,
- occupant capacity and size limits,
- pilot requirement,
- sealed/open compartment state,
- movement modes and environment constraints,
- ongoing object-local state that lever actions can mutate.

Evidence:

> "To be used as a vehicle, the apparatus requires one pilot."

### 2. `lever_control_surface` subgraph

The item also needs a reusable control grammar for temporary controls:

- named controls (`lever 1` ... `lever 10`),
- directional inputs (`up` / `down`),
- per-use dispatch,
- optional prerequisites (`provided its legs are extended`),
- state mutations plus immediate outputs (move, attack, grapple, light, open/close).

Evidence:

> "A creature in the compartment can take a Utilize action to move as many as two of the apparatus's levers up or down."

## Why smaller widenings are not enough

This is not just a missing atom. Even if we added atoms for light emission, airtight compartment, or object attacks, the existing top-level item families still would not express:

- persistent vehicle presence,
- operator-driven repeated control each turn,
- internal mutable object state,
- object-local rules like pressure damage and breathing time.

That makes this a `structural_widening`, not merely `surface_widening` or `atom_widening`.
