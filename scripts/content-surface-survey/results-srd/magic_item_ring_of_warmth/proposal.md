## Ring of Warmth

The unit fits the existing `magic_item` + `passive` family for its first
rule:

- `condition = { kind = "wearing_item" }`
- `grant = { kind = "reduce_damage_taken", damageType = "cold", amount = 2d8 }`

That portion typechecks and traces cleanly.

## Missing surface

The remaining RAW clause has no current atom:

> "while wearing this ring, you and everything you wear and carry are
> unharmed by temperatures of 0 degrees Fahrenheit or lower."

This is not `grant_damage_immunity` or `grant_resistance`:

- it is not about incoming damage instances of a damage type;
- it is protection against an environmental hazard threshold;
- it also extends to worn/carried gear, not just the wearer's HP state.

## Proposed widening

- `new_atom`: `grant_environmental_temperature_immunity`

Suggested semantics:

- passive environmental protection while the item is worn;
- parameterized by a threshold and comparison direction, e.g.
  `{ floorFahrenheit: 0, protectsWearer: true, protectsCarriedItems: true }`.

Why this is an atom widening rather than structural:

- the unit already fits `MagicItemRecord` with `PassiveMechanics`;
- the missing piece is a single effect concept, not a new top-level family.

What was authored now:

- only the cold-damage reduction rider.

What remains omitted:

- the sub-zero-temperature protection clause.
