# Sovereign Glue

Outcome: `atom_widening`

## Why it does not fit cleanly

`Sovereign Glue` fits the existing `magic_item` record and `activation` mechanics family honestly:

- activation cost can be `standard_action` with `action = "utilize"`
- stock can be a non-recharging consumable pool with `initialCount = 1d6 + 1`
- application can target objects
- the effect has a delayed 1-minute setting window and then persists

The blocker is the core effect. The current surface has no atom for:

- creating a persistent adhesive bond between two objects
- carrying the bond's closed list of allowed breakers

Existing atoms such as `alter_item_kind`, `block_travel`, `transport_exile`, or `apply_condition` would all misdescribe the rule.

## Forced widening

### New atom: `bond_objects`

Needed semantics:

- select two object targets
- create an adhesive bond between them
- the bond persists after the 1-minute set time

RAW evidence:

> This viscous, milky-white substance can form a permanent adhesive bond between any two objects.

### New payload / lifecycle variant: named breakers

The bond is not ended by generic damage or dispel language. It is broken only by a closed list of named counteragents.

Needed semantics:

- `endsOnNamedEffects` or equivalent payload on the bond atom
- support for non-spell named breakers as well as a named spell

RAW evidence:

> Once it has done so, the bond it creates can be broken only by the application of Universal Solvent or Oil of Etherealness, or with a Wish spell.

## Notes

This is not `structural_widening`: the family is already present.

This is not `dm_agenda`: the mechanic is deterministic and rules-owned.

Do not author `content/magic_item_sovereign_glue.dhall`; any valid record today would either omit the bond entirely or replace it with a false effect.
