# Proposal: `species_goliath_powerful_build`

## Outcome

`atom_widening`

## What fits already

`Powerful Build` is a `species_trait` with `passive` mechanics.

This clause fits the existing surface honestly:

> You have Advantage on any ability check you make to end the Grappled condition.

It can be expressed as:

- `EffectAtom.modify_roll_advantage`
- `on = ["ability_check"]`
- `mode = "advantage"`
- `conditionFilter = ["grappled"]`

## What does not fit

This clause does not fit the current surface or tracer:

> You also count as one size larger when determining your carrying capacity.

There is currently:

- no passive effect atom for carrying-capacity modification;
- no passive effect atom for size treatment limited to carrying-capacity resolution;
- no existing v4 atom in `TAXONOMY_atoms_graph.md` that this can honestly map onto.

This is not a top-level family problem. The unit is still a passive species trait. The missing piece is a new effect concept.

## Proposed widening

- `new_atom`: `modify_carrying_capacity`

Suggested semantics:

- passive effect on the bearer;
- either:
  - direct multiplier / numeric carrying-capacity modifier, or
  - a bounded rule-specific variant such as `countAsOneSizeLarger: true` for carrying-capacity calculations only.

The second form is closer to RAW and avoids implying broader size changes.

## Why I stopped

Authoring only the Grappled-escape advantage would produce a misleadingly partial unit and silently drop a real mechanical clause. Per the task guardrails, I did not write a placeholder `content/species_goliath_powerful_build.dhall`.
