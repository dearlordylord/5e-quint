## Ring of Warmth gap

The current surface can encode the first sentence honestly:

- passive magic item
- `wearing_item` gate
- `reduce_damage_taken` for incoming `cold` damage by `2d8`

The second sentence does not fit any current effect atom or other surface shape:

> while wearing this ring, you and everything you wear and carry are unharmed by temperatures of 0 degrees Fahrenheit or lower

This is not a roll modifier, resistance, condition immunity, or damage-only rider. It is deterministic environmental protection against an extreme-temperature hazard, and it explicitly extends to carried/worn gear as well as the creature.

## Proposed widening

- `new_atom`: `grant_environmental_temperature_immunity`
  - Purpose: prevent harm from environmental temperature thresholds while active
  - Minimum payload pressure from this unit:
    - lowerBoundFahrenheit: `0`
    - protects: `self_and_worn_and_carried_items`

Why this is an atom widening, not a surface-only variant:

- no existing v4 atom covers environmental temperature harm prevention
- coercing this into `grant_resistance` or `reduce_damage_taken` would be false, because the rule is not limited to damage instances and also covers worn/carried objects
