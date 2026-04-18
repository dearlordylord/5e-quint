## Apparatus of the Crab

Outcome: `structural_widening`

### Why it does not fit the current surface

The current magic-item surface supports:

- passive grants
- bounded activated abilities with resource/reset cadence
- triggered reactions
- item-gated creature summons
- composites over those families

*Apparatus of the Crab* is not one of those. Its core mechanic is a **stateful piloted vehicle/object**:

- one creature pilots it
- creatures occupy an internal compartment
- the object has its own AC / HP / movement / immunities
- lever inputs change persistent operational state
- some controls only work if earlier controls are active
- attacks are executed through the apparatus's claws, not as a normal wearer grant
- environmental rules apply to the object itself

Encoding this as a normal `activation` item would be dishonest, because there is no single reusable activation with a use-count/reset loop. The levers are repeatable `Utilize`-action controls that mutate the object's state.

### Forced gaps

1. `stateful_vehicle_control_surface`

The rules require a new subgraph or family for:

- pilot-operated controls
- state transitions
- lever-conditioned capabilities
- vehicle/object movement and attacks

Evidence:

> A creature in the compartment can take a Utilize action to move as many as two of the apparatus's levers up or down. After each use, a lever goes back to its neutral position.

2. `vehicle_or_object_stat_block_payload`

The item needs a payload for a non-creature object/vehicle stat block with occupancy and environmental constraints.

Evidence:

> The Apparatus of the Crab is a Large object with the following statistics: AC 20; HP 200; Speed 30 ft., Swim 30 ft. (or 0 ft. if the legs aren't extended); Immunity to Poison and Psychic damage.

Additional evidence:

> While the apparatus's hatch is closed, the compartment is airtight and watertight. The compartment holds enough air for 10 hours of breathing, divided by the number of breathing creatures inside.

> Below that, the vehicle takes 2d6 Bludgeoning damage each minute from pressure.

### Why this is structural, not just atom widening

The missing piece is not one extra effect atom. The item needs a new top-level way to represent:

- a controllable object that persists in play
- multiple control inputs
- stateful gating between controls
- object-local movement / attack resolution
- occupants and environment interaction

That is a family/subgraph gap, so `structural_widening` is the narrowest honest classification.
