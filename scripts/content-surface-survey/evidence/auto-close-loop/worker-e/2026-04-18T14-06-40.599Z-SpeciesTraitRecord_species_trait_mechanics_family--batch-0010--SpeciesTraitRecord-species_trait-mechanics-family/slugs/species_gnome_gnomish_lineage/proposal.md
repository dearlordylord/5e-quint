# Gnomish Lineage does not fit the current surface honestly

## Verdict

`structural_widening`

I did not author `content/species_gnome_gnomish_lineage.dhall` because the unit is not one coherent passive or one coherent activation. It is a build-time choose-one lineage wrapper over multiple distinct payloads, and one branch (`Rock Gnome`) introduces a persistent created-device workflow that the current surface cannot represent without lying.

## Primary blocker: lineage choice wrapper

The current `SpeciesTraitRecord` supports exactly one mechanics payload:

- `PassiveMechanics`
- `ActivatedAbilityMechanics`

`Gnomish Lineage` instead says:

> Choose one of the following options; whichever one you choose...

That forces a top-level choose-one structure over distinct branches:

- `Forest Gnome`
- `Rock Gnome`

This is not just a missing atom. It is a missing trait-level composition / selection shape.

## Forest Gnome branch

Forest Gnome is close to existing `grant_spell_access`, but not fully representable:

- `Minor Illusion` cantrip known fits `grant_spell_access` with `mode: "known"`.
- `Speak with Animals` prepared plus free casts does not fit an existing `SpellAccessMode`.

The exact shape needed is:

- spell is always prepared
- free casts scale with Proficiency Bonus
- free casts reset on Long Rest
- slot casting remains allowed

Current modes include `prepared_once_per_long_rest`, but not a PB-scaled free-cast resource.

There is also a trait-scoped spellcasting-ability choice:

> Intelligence, Wisdom, or Charisma is your spellcasting ability for the spells you cast with this trait (choose the ability when you select the lineage)

That choice is not modeled on `grant_spell_access`.

## Rock Gnome branch

Rock Gnome is the stronger blocker. It is not just spell access.

It creates a persistent object with:

- a 10-minute creation procedure tied to `Prestidigitation`
- a chosen embedded `Prestidigitation` option fixed at creation time
- later Bonus Action activation by touch
- a cap of three concurrent devices
- automatic expiry after 8 hours
- manual dismantle via Utilize action

That is a stored-effect / created-device subgraph, not a passive grant and not a normal one-shot activation.

## Honest next step

The narrow honest expansion would be:

1. Add a species-trait-level choose-one wrapper for mutually exclusive lineage branches.
2. Add a `grant_spell_access` mode for “prepared + PB-scaled free casts + slot casting”.
3. Add a created-device / stored-spell-effect subgraph for Rock Gnome’s clockwork device workflow.

Until then, any authored content file would either omit major mechanics or misclassify the trait as a simpler passive spell grant.
