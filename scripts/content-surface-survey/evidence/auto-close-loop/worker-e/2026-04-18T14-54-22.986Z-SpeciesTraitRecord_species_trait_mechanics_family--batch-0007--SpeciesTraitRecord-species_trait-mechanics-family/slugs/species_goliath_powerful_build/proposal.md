## Powerful Build (Goliath)

`Powerful Build` is a `species_trait` with the existing `passive` family, but it does not fit the current surface honestly as a complete unit.

### What fits now

The first sentence is already representable with an existing effect atom:

- `modify_roll_advantage`
  - `mode = "advantage"`
  - `on = [ "ability_check" ]`
  - `conditionFilter = [ "grappled" ]`

That matches:

> "You have Advantage on any ability check you make to end the Grappled condition."

### Missing mechanic

The second sentence is not representable with any existing effect atom or nearby surface variant:

> "You also count as one size larger when determining your carrying capacity."

This is not:

- actual size change (`Large Form`-style size transformation),
- a speed modifier,
- an ability-score modifier,
- a proficiency change,
- a generic roll modifier.

It is a deterministic rules-facing carrying-capacity modifier, so the narrow honest classification is `atom_widening`.

### Proposed widening

- `new_atom`: `modify_carrying_capacity`
  - Suggested shape: a bounded effect expressing either a size-step increase for carrying-capacity calculations or a direct multiplier.
  - Why: the trait changes only carrying-capacity resolution, not creature size in general.
  - Pressure text: "count as one size larger when determining your carrying capacity."

### Result

Per the task protocol, no `content/species_goliath_powerful_build.dhall` was authored, because omitting the carrying-capacity rider would produce a misleading partial encoding.
