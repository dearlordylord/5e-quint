## Ring of Warmth

The unit fits `MagicItemRecord` with `PassiveMechanics` for its first sentence:

- passive worn-item gate
- incoming cold-damage reduction via `reduce_damage_taken`

What does not fit the current surface is the second sentence:

> while wearing this ring, you and everything you wear and carry are unharmed by temperatures of 0 degrees Fahrenheit or lower

This is not a missing payload family. It is a missing effect concept. The current surface can model damage resistance, damage reduction, condition immunity, senses, movement, and targeting restrictions, but it cannot express immunity/protection against ambient environmental temperature exposure.

Proposed widening:

- `new_atom`: `grant_environmental_temperature_protection`
  - Shape sketch: `{ kind: "grant_environmental_temperature_protection", minimumFahrenheit?: number, maximumFahrenheit?: number, coversCarriedGear?: true }`
  - Why: the rule is a persistent passive environmental protection effect, not a spell, action, or DM-only narrative clause.
  - Evidence: "you and everything you wear and carry are unharmed by temperatures of 0 degrees Fahrenheit or lower."

The authored Dhall encodes only the cold-damage reduction rider and explicitly documents the omitted environmental clause in the item description.
