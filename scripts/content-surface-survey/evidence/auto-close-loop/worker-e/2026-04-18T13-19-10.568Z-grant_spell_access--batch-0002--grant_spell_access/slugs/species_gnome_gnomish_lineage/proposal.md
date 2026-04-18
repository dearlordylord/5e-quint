# Proposal: `species_gnome_gnomish_lineage`

## Verdict

`Gnomish Lineage` does not fit the current surface honestly. The correct classification is `structural_widening`.

## Why it does not fit

The current surface models a species trait as exactly one of:

- `PassiveMechanics`
- `ActivatedAbilityMechanics`

`Gnomish Lineage` is neither.

It is a build-time choice among mutually exclusive lineage branches:

- `Forest Gnome` is mostly passive spell access.
- `Rock Gnome` is an activated device-creation trait with persistent created objects and later activations.

That means the unit needs a species-trait-level choice wrapper before either branch can be encoded honestly.

## Primary widening

Add a species-trait mechanics variant for build-time lineage selection, for example:

- `SpeciesTraitMechanics.choice`

The variant should let one trait offer a closed set of branch payloads, where each option can carry its own mechanics family or a bounded composite.

Evidence:

> Choose one of the following options; whichever one you choose...

## Secondary widening: Forest Gnome spell access

Even after a trait-level choice exists, `Forest Gnome` still does not fit `grant_spell_access` exactly.

Needed shape:

- always prepared
- free casts equal to Proficiency Bonus per Long Rest
- normal spell-slot casting still allowed

Existing modes are too weak:

- `prepared`
- `once_per_long_rest`
- `prepared_once_per_long_rest`

None encode `PB / long rest` free casts layered onto prepared access.

Evidence:

> You also always have the Speak with Animals spell prepared. You can cast it without a spell slot a number of times equal to your Proficiency Bonus... You can also use any spell slots you have to cast the spell.

## Secondary widening: Rock Gnome device subgraph

`Rock Gnome` pressures a larger object/device creation surface:

- create a Tiny clockwork device with AC and HP
- creation keyed off a 10-minute Prestidigitation cast
- creation-time choice of one Prestidigitation effect, including nested choice freezing
- any creature can activate it later with a touch as a Bonus Action
- at most three can exist at once
- each expires after 8 hours
- each can be dismantled with a touch as a Utilize action

This is not representable as a simple passive grant or a simple activation effect.

Evidence:

> You can spend 10 minutes casting Prestidigitation to create a Tiny clockwork device (AC 5, 1 HP)...

> ...the device produces that effect whenever you or another creature takes a Bonus Action to activate it with a touch.

> You can have three such devices in existence at a time, and each falls apart 8 hours after its creation or when you dismantle it with a touch as a Utilize action.

## Why no partial encoding was authored

I did not author a `content/species_gnome_gnomish_lineage.dhall` placeholder because any of these would be dishonest:

- encoding only `Forest Gnome`
- encoding only `Rock Gnome`
- encoding the trait as passive-only
- encoding the trait as activation-only

Each would produce a misleading trace for the unit actually assigned.
