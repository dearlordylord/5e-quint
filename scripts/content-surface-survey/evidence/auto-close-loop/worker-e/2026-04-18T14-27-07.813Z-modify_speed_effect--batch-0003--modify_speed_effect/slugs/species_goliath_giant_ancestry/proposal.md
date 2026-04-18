## Giant Ancestry (Goliath)

`Giant Ancestry` does not fit the current surface honestly.

The first blocker is structural, not atom-level:

- The unit is one `species_trait`.
- Its first rule is a build-time choice: pick exactly one ancestry boon.
- The six boons are not all the same mechanics family.

Branch breakdown:

- `Cloud's Jaunt` is an activated ability (`bonus_action` + `teleport`).
- `Fire's Burn` is an on-hit rider.
- `Frost's Chill` is an on-hit rider with multiple payload effects.
- `Hill's Tumble` is an on-hit rider.
- `Stone's Endurance` is a triggered reaction.
- `Storm's Thunder` is a triggered reaction.

The current `SpeciesTraitMechanics` union only allows:

- `PassiveMechanics`
- `ActivatedAbilityMechanics`

That means there is no honest way to encode:

- a build-time choose-one wrapper over species-trait mechanics;
- reaction-shaped species traits;
- on-hit-trigger species traits.

### Narrowest honest widening

The minimal honest widening is:

- add a build-time choice variant for `SpeciesTraitMechanics` that selects one branch from a closed list;
- widen `SpeciesTraitMechanics` to admit the existing non-spell `triggered_reaction` family;
- widen `SpeciesTraitMechanics` to admit the existing non-spell `on_hit_trigger` family.

That keeps this as one authored `species_trait` instead of six fake records or a knowingly false activation placeholder.

### Why this is `structural_widening`

This is not just one missing atom or one missing field variant. The unit cannot reach a truthful top-level mechanics family with the current `SpeciesTraitRecord` surface, so the blocker is structural.

### Secondary gaps not used for classification

If the structural widening lands, some individual branches may still need more surface work, for example:

- `Hill's Tumble`: target-size qualifier (`Large or smaller creature`);
- `Frost's Chill`: explicit until-start-of-next-turn expiry on the speed penalty if the existing chosen carrier cannot already express it cleanly;
- shared-resource modeling across choice branches, if the build-choice wrapper does not centralize the PB-per-long-rest pool.
