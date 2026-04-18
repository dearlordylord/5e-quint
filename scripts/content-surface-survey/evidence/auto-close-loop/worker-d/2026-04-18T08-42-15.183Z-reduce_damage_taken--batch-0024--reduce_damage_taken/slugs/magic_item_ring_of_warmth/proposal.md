## Ring of Warmth

`Ring of Warmth` fits the existing `magic_item` + `passive` family honestly.

Encoded cleanly:

- While wearing the ring, incoming Cold damage is reduced by `2d8`.
  This maps to `reduce_damage_taken` with `damageType = "cold"` and a
  `wearing_item` gate.

Missing surface:

- The current surface has no atom for immunity/protection against
  **environmental temperature extremes**.
- The omitted clause is not ordinary damage resistance or damage-type
  immunity. It protects the wearer and carried/worn gear from harm caused
  by temperatures of `0°F or lower`, which is an environmental hazard
  rather than a typed damage instance.

Proposed widening:

- `new_atom`: `grant_temperature_protection`
  - Suggested payload sketch:
    - scope: `self_and_worn_and_carried`
    - condition:
      - kind: `temperature_at_or_below`
      - degreesFahrenheit: 0
  - Why this is needed:
    - The existing atoms can model incoming typed damage, resistances, and
      immunities, but they cannot express deterministic protection from a
      non-damage environmental state.

Evidence:

> "while wearing this ring, you and everything you wear and carry are
> unharmed by temperatures of 0 degrees Fahrenheit or lower."

Notes:

- `pnpm typecheck` did not pass, but the failure is a pre-existing
  TypeScript error in `src/interpreter/tracer.ts`, outside the allowed
  edit scope for this task.
