## Gap

`Powerful Build` does not encode cleanly with the current surface because its second clause has no authored atom:

> "You also count as one size larger when determining your carrying capacity."

The first clause fits honestly as a passive `modify_roll_advantage` rider on `ability_check` with `conditionFilter = ["grappled"]`.

## Classification

- Outcome: `atom_widening`
- Why not `structural_widening`: `species_trait` + `passive` is still the right family.
- Why not `surface_widening`: this is not just a missing variant of an existing carrying-capacity shape; no carrying-capacity / effective-size effect exists on the surface today.

## Proposed widening

- Kind: `new_atom`
- Name: `modify_carrying_capacity`
- Shape direction:
  - either `sizeDelta: 1`
  - or a narrower SRD-shaped payload like `countAsSizeLarger: true`

The narrower SRD-shaped form is probably better unless another unit pressures a more general carrying-capacity modifier.
