`Powerful Build (Goliath)` does not fit the current authored surface honestly, so no `content/species_goliath_powerful_build.dhall` was created.

Why it stops:

1. `Powerful Build` is a `species_trait` with `PassiveMechanics`, but the first rider is narrower than the current roll-modifier surface can express.
Evidence: "You have Advantage on any ability check you make to end the Grappled condition."
Gap: `EffectAtom.modify_roll_advantage` can target `ability_check` and narrow by skill, save ability, or save source, but it cannot narrow an ability check by purpose such as "to end the Grappled condition." Encoding this as blanket Advantage on all ability checks, or as only Athletics/Acrobatics, would be false.
Suggested widening: add a new variant on the existing roll-modifier surface, for example an ability-check purpose / escape-condition filter.
Classification: `surface_widening`.

2. The second rider needs a new effect concept that is not present in the current surface or v4 atom inventory.
Evidence: "You also count as one size larger when determining your carrying capacity."
Gap: there is no existing atom for carrying-capacity modification, effective-size-for-carrying, or analogous inventory/load-bearing adjustment. This is not a roll modifier, speed modifier, transform, or passive container profile.
Suggested widening: add a new effect atom for carrying-capacity scaling, likely phrased as effective-size increase or carrying-capacity multiplier.
Classification: `atom_widening`.

Overall verdict:

- Existing top-level fit: yes (`SpeciesTraitRecord` + `PassiveMechanics`)
- Honest content encoding today: no
- Narrowest overall outcome: `atom_widening`, because one required rider forces a new atom rather than only a new surface variant
