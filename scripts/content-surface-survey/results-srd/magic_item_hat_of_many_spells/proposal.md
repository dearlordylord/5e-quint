# Hat of Many Spells

## Verdict

`atom_widening`

I did not author `content/magic_item_hat_of_many_spells.dhall` because the current surface cannot encode the item's core mechanic honestly.

## Why It Does Not Fit Cleanly

The top-level shape is not the problem. This is still a `magic_item`, and if the internals were expressible it would naturally be a `composite` magic item:

- a passive part for `Spellcasting Focus`
- an activated part for `Unknown Spell`

The blocker is the `Unknown Spell` property itself.

## Forced Gaps

### 1. Random failure table needs a new subgraph

The failure branch is not a fixed effect. It is a percentile table with multiple qualitatively different outcomes and nested random rolls:

- random spells
- self-applied conditions
- harmless temporary phenomena
- nonmagical object creation
- uncontrolled creature appearance
- hostile swarm appearance
- planar portal creation
- temporary random magic item creation

Current surface families can branch on attack rolls, saves, and ability checks, but they cannot branch on stochastic table resolution. `choose` is player/caster choice, not random determination.

Forced widening:

- `random_table_resolution` subgraph or equivalent random-roll resolution shape

Evidence:

> On a failed check, you fail to cast the spell and a random effect occurs instead, determined by rolling on the following table.

### 2. Arbitrary filtered spell access is not representable

`grant_spell_access` only supports a named `spellId`. This item instead attempts a one-off cast of any qualifying Wizard spell the wielder does not know, subject to restrictions:

- spell must be on the Wizard spell list
- spell must be level 1+
- spell must be of a level the wielder can cast
- spell cannot have Material components costing more than 1,000 GP

That is not a fixed spell grant, and encoding it as one would be false.

Forced widening:

- a filtered spell-access / spell-selection variant, likely under `grant_spell_access` or a new activation-phase payload

Evidence:

> While holding the hat, you can try to cast a level 1+ spell you don't know. The spell must be on the Wizard spell list, it must be of a level you can cast, and it can't have Material components costing more than 1,000 GP.

### 3. Wizard-only attunement is missing on the record

The record can express `requiresAttunement: true`, but not attunement restricted to a class.

Forced widening:

- `MagicItemRecord.attunementRestriction`

Evidence:

> Requires Attunement by a Wizard

## Secondary Omission

`Spellcasting Focus` is also not modeled in the current effect vocabulary. I did not make that the primary classification because the item already fails on the core `Unknown Spell` mechanic.

Evidence:

> While holding the hat, you can use it as a Spellcasting Focus for your Wizard spells.

## Why This Is Not `structural_widening`

The unit still fits an existing top-level kind and family composition:

- `MagicItemRecord`
- likely `CompositeMagicItemMechanics`

What fails is the inner mechanic representation, primarily because the surface has no honest random-table subgraph and no way to represent arbitrary filtered spell casting.
