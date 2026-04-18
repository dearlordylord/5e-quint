# Ring of Warmth

Outcome: `atom_widening`

The unit fits the existing `magic_item` + `passive` family honestly for its first rider:

- while worn, reduce incoming Cold damage by `2d8`

The omitted rider forces a new effect concept not present in the current surface or the v4 taxonomy:

- "you and everything you wear and carry are unharmed by temperatures of 0 degrees Fahrenheit or lower"

Why this is an atom widening:

- This is not damage resistance or damage reduction. It suppresses harmful environmental cold exposure before it becomes a damage instance.
- It also extends protection to carried and worn gear, so it is broader than a creature-only resistance atom.
- No existing effect atom models immunity to environmental temperature bands or hazard exposure.

Proposed widening:

- `new_atom`: `grant_environmental_temperature_immunity`
  - Suggested payload shape:
    - `kind: "grant_environmental_temperature_immunity"`
    - `hazard: "cold"`
    - `atOrBelowFahrenheit: number`
    - optional scope flag for carried/worn gear protection

Evidence:

> "you and everything you wear and carry are unharmed by temperatures of 0 degrees Fahrenheit or lower"
