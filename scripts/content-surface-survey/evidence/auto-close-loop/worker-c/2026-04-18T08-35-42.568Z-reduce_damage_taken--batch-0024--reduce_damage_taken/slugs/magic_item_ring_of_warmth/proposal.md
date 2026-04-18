# Ring of Warmth

`Ring of Warmth` mostly fits the existing `magic_item` + `passive` surface.
The first rider is encodable today:

- `while wearing this ring` -> `condition = { kind = "wearing_item" }`
- `reduces the damage you take by 2d8` on Cold damage -> `reduce_damage_taken` with `damageType = "cold"`

The missing piece is the second rider:

> while wearing this ring, you and everything you wear and carry are unharmed by temperatures of 0 degrees Fahrenheit or lower

## Why this is a widening

This is a deterministic mechanics effect, not DM-agenda narration:

- it has a concrete threshold (`0 degrees Fahrenheit or lower`)
- it specifies an outcome (`unharmed`)
- it scopes to the wearer plus carried/worn gear

But the current surface has no atom for immunity/protection against environmental temperature extremes.

Existing atoms are not honest substitutes:

- `grant_resistance` and `grant_damage_immunity` only speak to typed damage instances
- `reduce_damage_taken` only modifies incoming damage, and only when some damage event is already being modeled
- no existing attachment/effect shape expresses protection for carried/worn equipment from ambient temperature

## Proposed widening

- New atom: `grant_environmental_temperature_immunity`

Suggested semantics:

- passive protection against extreme temperature exposure, parameterized by hazard kind and threshold
- should be able to scope to the wearer and carried/worn gear, since the item text protects both

## Worker outcome

I authored the supported subset and traced it successfully, but classified the unit as `atom_widening` because the temperature-protection rider is omitted.
