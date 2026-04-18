## Apparatus of the Crab

Outcome: `structural_widening`

This item does not fit the current magic-item families honestly.

Why it does not fit:

- The current surface can encode passive grants, bounded activations, triggered reactions, summoned companions, and composites of those.
- *Apparatus of the Crab* is a stateful vehicle/object operated over time by a pilot.
- Its lever uses are not independent one-shot activations. They mutate shared persistent vehicle state that later lever uses read:
  - legs extended vs. retracted
  - claws extended vs. retracted
  - shutters open vs. closed
  - hatch sealed vs. open
  - movement availability
  - whether it is submerged / rising / sinking
- Several rules attach to the object itself, not to the operator:
  - object stat block
  - movement and swim speed
  - pressure damage below 900 feet
  - airtight / watertight compartment and finite air supply
  - claw attack / grapple modes

Why I did not author a subset:

- There is no stable passive core comparable to a simple `+1 AC` item or spell-granting staff.
- The lever table is the item's main mechanic, and omitting it would remove the unit's core identity.
- Encoding only one or two levers would produce a misleading trace rather than an honest partial fit.

Narrowest honest gaps:

1. `vehicle_control_surface` subgraph

- Needed for a pilot repeatedly operating a vehicle/object with persistent internal state.
- Evidence: "A creature in the compartment can take a Utilize action to move as many as two of the apparatus's levers up or down. After each use, a lever goes back to its neutral position."

2. Activation attachment that can target the item/object/vehicle itself

- Current activation phases attach to `self`, `target`, `area`, or `mark`; the apparatus primarily mutates itself.
- Evidence: "Legs extend, allowing the apparatus to walk and swim."

3. Persistent item-state predicates / gates

- Later lever actions depend on prior mode changes.
- Evidence: "The apparatus walks or swims forward provided its legs are extended."

Secondary unresolved pressures, if the structural family existed:

- vehicle/object stat block surface (AC, HP, speeds, immunities)
- occupant / compartment state
- finite shared air supply
- environmental pressure damage over time
- object-origin attack and grapple operations
- light emission toggle

I therefore stopped before authoring `content/magic_item_apparatus_of_the_crab.dhall` or JSON.
