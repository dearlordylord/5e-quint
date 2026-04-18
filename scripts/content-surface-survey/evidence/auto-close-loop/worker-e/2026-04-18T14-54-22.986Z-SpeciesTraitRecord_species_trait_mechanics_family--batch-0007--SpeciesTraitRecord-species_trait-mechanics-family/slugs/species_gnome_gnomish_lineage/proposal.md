## Verdict

`Gnomish Lineage` does not fit the current species-trait surface honestly. The primary blocker is structural: the trait is a single `species_trait` that requires a permanent choose-one lineage branch, and one branch (`Rock Gnome`) is itself a composite of passive spell grants plus an activated subsystem.

Because that top-level family is missing, I did not author `content/species_gnome_gnomish_lineage.dhall`.

## Primary gap: build-time lineage choice over mixed mechanics

Current `SpeciesTraitMechanics` is:

- `PassiveMechanics`
- `ActivatedAbilityMechanics`

That is too narrow for:

- one trait record;
- permanent build-time choice among mutually exclusive branches;
- branches with different mechanics shapes.

`Forest Gnome` is mostly passive spell access.
`Rock Gnome` is passive cantrip access plus an activated clockwork-device ability.

This wants a species-trait analogue of class-feature / magic-item composition, plus a choose-one wrapper over branches.

## Secondary gaps inside the chosen branch

### 1. PB-scaled free casts on a granted prepared spell

`Forest Gnome` says:

> You also always have the Speak with Animals spell prepared. You can cast it without a spell slot a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest. You can also use any spell slots you have to cast the spell.

Current `grant_spell_access` can express:

- `prepared`
- `once_per_long_rest`
- `prepared_once_per_long_rest`

It cannot express:

- prepared + PB free casts per long rest.

### 2. Chosen spellcasting ability for trait-granted spells

The trait says:

> Intelligence, Wisdom, or Charisma is your spellcasting ability for the spells you cast with this trait (choose the ability when you select the lineage)

That is mechanically relevant for save DC / spell attack math. Current `grant_spell_access` has no field for a grant-scoped spellcasting ability source or build-time ability choice.

### 3. Rock Gnome clockwork device subgraph

`Rock Gnome` says:

> you can spend 10 minutes casting Prestidigitation to create a Tiny clockwork device ...
> the device produces that effect whenever you or another creature takes a Bonus Action to activate it with a touch ...
> You can have three such devices in existence at a time, and each falls apart 8 hours after its creation or when you dismantle it with a touch as a Utilize action.

This pressures a non-spell created-object/stored-effect lifecycle:

- create object
- store one chosen Prestidigitation mode in it
- later activate by touch with Bonus Action
- max-three concurrent instances
- timed expiry
- manual dismantle via Utilize

The current surface does not have an honest species-trait encoding for that.

## Classification

I classified this as `structural_widening`, not `surface_widening`, because the first blocker is the missing top-level family shape for a choose-one species trait with mixed passive/activated branches. The spell-access and device issues are real, but secondary once that family exists.
