`Large Form (Goliath)` does not fit the current authored surface honestly, so no `content/species_goliath_large_form.dhall` was authored.

Why it fails:

- The trait's core mechanic is a temporary size transformation: "you can change your size to Large". The current `EffectAtom` union has no size-changing atom, and `TAXONOMY_atoms_graph.md` likewise has no existing v4 atom for size change. Omitting that effect would misrepresent the trait.
- The benefit "you have Advantage on Strength checks" also does not fit the current roll-modifier surface honestly. `modify_roll_advantage` can narrow ability checks by `skillFilter` or `conditionFilter`, but not by ability (`str`, `dex`, etc.). Encoding this as advantage on all ability checks would be false.
- The trait is level-gated: "Starting at character level 5". `SpeciesTraitRecord` has no field analogous to `ClassFeatureRecord.acquiredAtLevel`, so the current record shape cannot state when the trait unlocks.

Suggested widenings:

1. Atom widening: add a size-changing effect atom, e.g. `set_size` or `modify_size`, with temporary-duration compatibility.
   Evidence: "you can change your size to Large as a Bonus Action"

2. Surface widening: add ability-based narrowing for ability-check riders on `modify_roll_advantage` (and likely `modify_roll_numeric` for symmetry), e.g. `abilityCheckAbilityFilter`.
   Evidence: "you have Advantage on Strength checks"

3. Surface widening: add an acquisition / unlock level to `SpeciesTraitRecord`, e.g. `acquiredAtCharacterLevel`.
   Evidence: "Starting at character level 5"

Notes:

- The remaining pieces already fit existing surface vocabulary:
  - Bonus Action activation
  - Long Rest reset
  - timed 10-minute duration
  - optional early end ("until you end it") is close to existing duration handling, though an explicit voluntary-end lifecycle hook may become useful if more units pressure it
  - `modify_speed +10 feet`
- "if you're in a big enough space" is table/environment state and can stay caller-resolved rather than forcing a new core mechanic by itself.
