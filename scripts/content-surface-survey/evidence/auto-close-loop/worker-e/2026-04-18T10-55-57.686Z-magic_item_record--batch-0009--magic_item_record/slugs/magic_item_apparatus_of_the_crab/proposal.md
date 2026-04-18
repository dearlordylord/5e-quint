## Apparatus of the Crab

Outcome: `structural_widening`

`Apparatus of the Crab` does not honestly fit any current `MagicItemMechanics` family.

Why it does not fit:

- It is not a passive grant. Most of the item is dormant until occupants operate levers.
- It is not a single activated ability. One Utilize action can manipulate up to two different levers, each with distinct up/down outcomes, and the apparatus persists as a controlled object afterward.
- It is not a triggered reaction or spawned-creature shape. The item is a vehicle/object with its own statistics, movement modes, attack options, occupancy, and environmental constraints.

The current surface is missing a vehicle/object control family with persistent internal state:

- object/vehicle stat block:
  - "The Apparatus of the Crab is a Large object with the following statistics: AC 20; HP 200; Speed 30 ft., Swim 30 ft. (or 0 ft. if the legs aren't extended); Immunity to Poison and Psychic damage."
- operator-driven control table:
  - "A creature in the compartment can take a Utilize action to move as many as two of the apparatus's levers up or down."
- persistent mode/state toggles:
  - legs extended/retracted
  - shutters open/closed
  - claws extended/retracted
  - lights on/off
  - hatch sealed/open
- lever-bound action outcomes:
  - movement / turning / rising / sinking
  - claw attack vs claw grapple
- vehicle occupancy / sealed compartment / air supply:
  - "allowing two Medium or smaller creatures to crawl inside"
  - "the compartment is airtight and watertight"
  - "holds enough air for 10 hours of breathing, divided by the number of breathing creatures inside"
- environment-triggered damage:
  - "Below that, the vehicle takes 2d6 Bludgeoning damage each minute from pressure."

What would be needed:

1. A new top-level mechanics family for controllable objects/vehicles, likely alongside spell/class-feature/item activation families rather than forced into them.
2. A first-class object/vehicle stat-block payload:
   - size
   - AC / HP
   - movement modes
   - damage immunities
   - occupancy / compartment properties
3. A control-surface subgraph for operator inputs that mutate persistent item state and can also dispatch attacks/movement.
4. Environmental lifecycle hooks for object damage over time tied to depth/terrain conditions.

Why this is `structural_widening`, not merely `surface_widening`:

- No existing family represents "persistent controllable vehicle/object with operator actions and internal state."
- The missing concept is the whole payload shape, not just one absent field on an existing family.

