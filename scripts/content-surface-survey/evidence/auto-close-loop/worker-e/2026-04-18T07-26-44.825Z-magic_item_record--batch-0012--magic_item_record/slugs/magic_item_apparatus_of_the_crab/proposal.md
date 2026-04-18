# Proposal: Apparatus of the Crab

## Outcome

`structural_widening`

The current surface can represent passive items, activated abilities, triggered reactions, and composites of those. `Apparatus of the Crab` is not honestly any of those. Its core mechanic is a **piloted vehicle/object** with its own stat block, occupancy rules, environmental limits, and a reusable lever control panel that dispatches different actions each time a creature inside takes the Utilize action.

## Why It Does Not Fit

The missing piece is not a single effect atom. The item needs a new mechanics family for a controllable object/vehicle.

What the existing families cannot express:

- An item that is itself a Large object with independent AC, HP, movement modes, and damage immunities.
- Occupancy and piloting rules: two Medium-or-smaller creatures can fit inside, but one pilot is required to operate it.
- Reusable control-surface actions: ten levers, each with separate up/down behaviors, with up to two lever changes per Utilize action and automatic reset to neutral after use.
- Vehicle-local state that gates later actions:
  - legs extended / retracted
  - claws extended / retracted
  - hatch open / closed
  - shutters open / closed
  - lights on / off
- Vehicle movement and turning as consequences of lever use, not as grants to a creature.
- Vehicle-specific environmental rules such as airtight/watertight compartment, shared air supply, depth limit, and pressure damage below 900 feet.

## Proposed Widenings

### 1. New mechanics family: `vehicle_object`

Kind: `new_subgraph`

Needed because the apparatus is an independent object in play, not a buff, spell-like activation, or reaction.

Evidence:

> "The Apparatus of the Crab is a Large object with the following statistics: AC 20; HP 200; Speed 30 ft., Swim 30 ft. ... Immunity to Poison and Psychic damage."

### 2. New control-panel / lever operation subgraph

Kind: `new_subgraph`

Needed because the apparatus is operated by choosing lever manipulations during play, with each control having persistent prerequisites and effects.

Evidence:

> "A creature in the compartment can take a Utilize action to move as many as two of the apparatus's levers up or down. After each use, a lever goes back to its neutral position."

### 3. Vehicle occupancy / pilot requirements

Kind: `new_variant`

Needed because the unit distinguishes passengers from pilot and limits who can be inside.

Evidence:

> "allowing two Medium or smaller creatures to crawl inside."
>
> "To be used as a vehicle, the apparatus requires one pilot."

### 4. Vehicle environmental lifecycle rules

Kind: `new_variant`

Needed because the item tracks compartment sealing, breathable air duration, underwater depth constraints, and periodic pressure damage.

Evidence:

> "While the apparatus's hatch is closed, the compartment is airtight and watertight. The compartment holds enough air for 10 hours of breathing, divided by the number of breathing creatures inside."
>
> "Below that, the vehicle takes 2d6 Bludgeoning damage each minute from pressure."

## Notes

Some individual lever outcomes overlap existing atoms conceptually, such as attack-like claw damage, grappling, movement, or light emission. That does not make the unit encodable today, because those outcomes live inside a larger missing structure: a stateful vehicle with reusable controls. The honest classification is therefore `structural_widening`, not `surface_widening` or `atom_widening`.
