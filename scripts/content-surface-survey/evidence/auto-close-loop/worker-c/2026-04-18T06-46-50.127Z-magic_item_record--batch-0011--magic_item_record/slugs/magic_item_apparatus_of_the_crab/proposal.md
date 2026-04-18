## Apparatus of the Crab

`Apparatus of the Crab` does not honestly fit the current `magic_item` surface.

The existing surface can encode:

- passive grants
- one-shot activated abilities with phases
- a composite of passive + activation

This item is neither of those. Its core mechanic is a persistent, controllable vehicle/object with internal state.

### Why this is a structural widening

The item remains in play as an object with its own statistics and changing configuration:

- object stat block: AC, HP, speeds, immunities
- occupancy: two Medium-or-smaller creatures can crawl inside
- sealed-compartment state: hatch closed, airtight, watertight
- consumable environment: 10 hours of breathing air divided by occupants
- movement state: legs extended vs retracted changes movement availability
- attack state: claws extended vs retracted changes available actions
- repeated control input: a creature inside uses the item by moving up to two levers each Utilize action
- environmental rule: pressure damage below 900 feet

Those are not isolated effect atoms on a creature. They are a stateful control surface for a persistent object.

### Required widening

1. New subgraph / family: `stateful_vehicle_magic_item`

- Why: the current `MagicItemMechanics` families have no place to model a persistent vehicle/object that is operated turn by turn through controls and retains configuration state between uses.
- Pressure text:
  - "The Apparatus of the Crab is a Large object with the following statistics: AC 20; HP 200; Speed 30 ft., Swim 30 ft. (or 0 ft. if the legs aren't extended); Immunity to Poison and Psychic damage."
  - "A creature in the compartment can take a Utilize action to move as many as two of the apparatus's levers up or down."
  - "After each use, a lever goes back to its neutral position."

Suggested direction:

- a new magic-item family for persistent controlled objects / vehicles
- explicit object stat block
- occupancy / compartment state
- control inputs with per-control effects
- persistent mode flags such as legs-extended, claws-extended, hatch-open
- onboard movement / attack procedures anchored to the object rather than the wielder

### Secondary pressure that would follow

If that structural family existed, the current surface would still need additional modeling for:

- object occupancy / passenger compartment
- airtight / watertight / air-supply tracking
- object-only movement and facing controls
- control-panel / lever input grammar
- object attacks that come from the vehicle rather than the operator's own body or weapon
- conditional movement bonuses suppression: "unable to benefit from bonuses to speed"
- environmental depth threshold and repeating pressure damage

Those are downstream from the primary problem: there is no honest family for a persistent controllable vehicle item.

### Why I did not author a placeholder

Encoding this as a normal `activation` item would be false. A sequence of direct phases cannot represent:

- the apparatus remaining in play as an object
- lever-gated persistent state
- internal occupancy and air supply
- repeated turn-by-turn operation as a vehicle

That would create a trace that looks valid but misstates the rule.
