# Trident of Fish Command

## Verdict

`surface_widening`

The top-level shape fits the existing `magic_item` + `activation` family:

- `activationCost = { kind = "action" }`
- `resource = { kind = "charge_pool", cap = 3 }`
- `resetCadence = { kind = "dawn", regain = 1d3 }`
- `destruction = { kind = "none" }`

I stopped before authoring because the current surface cannot encode two material parts of the item honestly.

## Missing surface shapes

### 1. Fixed item save DC for granted spell access

The existing `grant_spell_access` effect can grant a spell and define its charge cost, but it cannot say that the spell uses an item-defined fixed DC instead of the spell's usual `caster_spell_save_dc`.

Pressure:

> "you can expend 1 charge to cast *Dominate Beast* (**save DC 15**) from it"

Without a widening here, a placeholder encoding would misstate the spell resolution by implying the wielder's normal spell save DC.

Suggested direction:

- widen `grant_spell_access` with optional casting overrides such as a fixed save DC;
- keep this separate from provenance or runtime projection: it is item-supplied casting metadata.

### 2. Extra target predicate: Beast must have a Swim Speed

`Dominate Beast` already encodes `typeFilter = ["beast"]`, but the trident adds a narrower target eligibility requirement:

> "on a Beast that has a Swim Speed"

The current surface has no place on `grant_spell_access` to express an additional target predicate layered on top of the referenced spell's own target rules.

Suggested direction:

- widen `grant_spell_access` with an optional target-predicate override/refinement;
- a minimal first case would be a closed predicate like `has_speed_kind = "swim"`.

## Why this is not structural or atom widening

- Not `structural_widening`: `magic_item` + `activation` already fits the unit's family.
- Not `atom_widening`: no new v4 atom is forced. The gap is in the authored surface around spell-access metadata.
