`Gnomish Lineage` does not fit the current `species_trait` surface honestly.

Why it fails:

- The unit is a build-time lineage choice inside one species trait: "Choose one of the following options". `SpeciesTraitRecord` has no variant/choice wrapper analogous to magic-item variants, and `SpeciesTraitMechanics` cannot express "pick one branch, then only that branch exists".
- The two branches are heterogeneous:
  - `Forest Gnome` is mostly a passive spell-access package: a known cantrip plus a prepared spell plus limited free casts plus normal slot-casting.
  - `Rock Gnome` adds a created object/device lifecycle with stored `Prestidigitation` behavior, activation by touch as a Bonus Action, a max-three-in-existence cap, and 8-hour expiry.
- Even isolating `Forest Gnome`, the current surface has no single honest species-trait family for "always grant these spells" plus "also grant PB free casts of one of them". `SpeciesTraitMechanics` allows `passive` or `activation`, but not a composite of both.

Narrowest honest classification:

- `structural_widening`

Suggested widenings:

1. Add a species-trait-level branch/variant wrapper.
   Evidence: "Choose one of the following options; whichever one you choose..."
   Why: the unit is fundamentally a build-time choice between mutually exclusive lineages.

2. Add a composite species-trait mechanics family, or a shared non-magic-item composite reusable by species traits.
   Evidence: `Forest Gnome` combines always-on spell grants with resource-limited free casting, while `Rock Gnome` combines grant-like spell access with an activated device-creation ability.
   Why: `SpeciesTraitMechanics = PassiveMechanics | ActivatedAbilityMechanics` is too narrow for multi-part traits.

3. Add a spell-access mode or adjacent shape for "granted spell remains prepared/known and also has PB free casts per Long Rest".
   Evidence: "You also always have the Speak with Animals spell prepared. You can cast it without a spell slot a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest. You can also use any spell slots you have to cast the spell."
   Why: existing `prepared_once_per_long_rest` only covers one free cast, not PB-scaled free casts.

4. Likely future widening for reusable created devices / stored spell effects.
   Evidence: "spend 10 minutes casting Prestidigitation to create a Tiny clockwork device ... the device produces that effect whenever you or another creature takes a Bonus Action to activate it with a touch ... You can have three such devices in existence at a time, and each falls apart 8 hours after its creation..."
   Why: this is a created-object lifecycle with stored effect selection and downstream activation, which the current species-trait surface does not model.
