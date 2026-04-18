# Proposal: Apparatus of the Crab

Outcome: `structural_widening`

## Why it does not fit

The current `MagicItemRecord` surface only admits:

- `passive`
- `activation`
- `composite` over passive/activation parts

That is enough for items like cloaks, rings, staffs, wands, and charge-cast tools. It is not enough for a vehicle-like object that:

- has its own persistent stat block;
- can contain occupants;
- is piloted through a command panel;
- changes capabilities based on control state;
- makes attacks as the object;
- has environmental operating limits and recurring pressure damage.

Encoding this as a passive or activation item would be false. The apparatus is not “cast a spell,” “grant a buff,” or “spend charges for a one-shot effect.” It is a controllable object subsystem.

## Minimal widening forced by RAW

### 1. `vehicle_object_family`

Needed for a magic item that exists in play as an object with:

- object stats: AC, HP, speeds, immunities;
- occupancy rules;
- pilot requirement;
- ongoing world presence independent of a spell duration.

RAW pressure:

> The Apparatus of the Crab is a Large object with the following statistics: AC 20; HP 200; Speed 30 ft., Swim 30 ft. (or 0 ft. if the legs aren't extended); Immunity to Poison and Psychic damage.

### 2. `lever_control_panel`

Needed for a stateful control surface where one action can operate up to two named controls, each with distinct up/down semantics, and each control resets after use.

RAW pressure:

> A creature in the compartment can take a Utilize action to move as many as two of the apparatus's levers up or down. After each use, a lever goes back to its neutral position.

The lever table mixes several mechanics:

- extend/retract legs changing movement availability;
- open/close shutters and hatch;
- extend/retract claws;
- claw attack modes;
- movement and turning commands;
- light on/off;
- sink/rise in liquid.

That is broader than any current activation phase grammar.

### 3. `vehicle_environmental_constraints`

Needed for persistent operating limits on the object:

- airtight/watertight compartment;
- finite shared air supply;
- maximum depth;
- recurring pressure damage below safe depth.

RAW pressure:

> The compartment holds enough air for 10 hours of breathing, divided by the number of breathing creatures inside.

> It can also go underwater to a depth of 900 feet. Below that, the vehicle takes 2d6 Bludgeoning damage each minute from pressure.

## Not the blocker

These are not the primary issue:

- `grappled` already exists in the current `Condition` union.
- Fixed attack bonus can already be represented in other families via literal numeric fields.
- Damage, immunities, speeds, and movement atoms exist in isolation.

The failure is that there is no honest top-level family that binds those pieces into “piloted vehicle object with controls.”

## Recommendation

Do not author a placeholder `content/magic_item_apparatus_of_the_crab.dhall`.

Land a dedicated vehicle/object mechanics family first, likely with:

- persistent object stat block;
- occupant and pilot model;
- command/control surface;
- reusable control outcomes;
- environmental operating constraints.
