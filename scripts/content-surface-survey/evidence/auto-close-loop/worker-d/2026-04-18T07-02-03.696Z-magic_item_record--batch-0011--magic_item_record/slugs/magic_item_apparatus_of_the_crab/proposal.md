## Verdict

`Apparatus of the Crab` does not fit the current authored surface honestly. The narrowest classification is `structural_widening`.

## Why It Doesn't Fit

The current `MagicItemMechanics` surface only admits:

- `passive`
- `activation`
- `triggered_reaction`
- `composite` over those families

The apparatus is not any of those. Its core mechanic is a persistent, controllable vehicle/object with:

- its own object stat block: AC, HP, Speed, Swim Speed, immunities
- occupants and pilot requirements
- sealed/open compartment state
- consumable air duration shared across current occupants
- environmental damage below 900 feet
- lever-driven persistent mode changes
- lever-driven attacks and grapples

That is not a one-shot activation, not a passive grant, and not a bounded composition of existing magic-item families.

## Missing Structure

### 1. Controlled vehicle/object family

The item needs a family that can represent an item-created or item-owned object/vehicle with persistent runtime state and object stats.

Evidence:

> The Apparatus of the Crab is a Large object with the following statistics: AC 20; HP 200; Speed 30 ft., Swim 30 ft.

> To be used as a vehicle, the apparatus requires one pilot.

### 2. Lever/state command subgraph

The lever table is not just flavor text or a list of independent activations. It defines a state machine over the object's current form and capabilities:

- legs extended/retracted gates movement
- claws extended/retracted gates attack availability
- lever 5 changes claw behavior per pull
- shutters and hatch open/close
- lights on/off
- vertical movement in liquid

Evidence:

> Ten levers are set in a row at the far end, each in a neutral position, able to move up or down.

> After each use, a lever goes back to its neutral position.

> Each lever, from left to right, functions as shown in the Apparatus of the Crab Levers table.

## Why Existing Families Are Insufficient

### Not `passive`

The item is not merely granting static bonuses or always-on abilities to the wielder.

### Not `activation`

An `activation` family can model a discrete use with phases. It cannot honestly model a persistent vehicle whose later commands depend on current internal state.

### Not `triggered_reaction`

There is no reaction-window shape here.

### Not existing spell creature families

Even the spell-side `spawned_creature` / `templated_multi_spawn` families would still be dishonest:

- the apparatus is an object/vehicle, not a creature companion
- its command surface is a lever table, not a creature action list
- occupancy, air supply, sealing, depth-pressure damage, and locomotion gating are not creature-control semantics

## Secondary Gaps

If a future vehicle/object family existed, this item would still need structured support for:

- occupant capacity / size constraints
- breathable-air countdown shared across occupants
- environmental threshold damage ("below 900 feet")
- grapple-on-hit with escape DC on an object-mounted attack mode
- locomotion gating by current lever state

These are subordinate to the larger structural gap above.
