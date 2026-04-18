# Wand of Lightning Bolts

## Verdict

`surface_widening`

The unit fits the existing top-level shape:

- `kind = "magic_item"`
- mechanics family = activated ability
- resource = `charge_pool`
- reset cadence = `dawn`
- destruction = `last_charge_roll`

The blocker is narrower: the current surface cannot encode the item's fixed spell save DC honestly.

## Why It Does Not Fit Cleanly

The natural authoring shape is the existing wand idiom used by `magic_item_wand_of_magic_missiles.dhall`:

- `activationCost = { kind = "action" }`
- `resource = { kind = "charge_pool", cap = 7 }`
- `resetCadence = { kind = "dawn", regain = 1d6 + 1 }`
- `destruction = { kind = "last_charge_roll", die = 20, destroyOn = 1 }`
- effect = `grant_spell_access` with `mode = charge_cast`

That would cover the charge spending and the charge-to-level mapping:

- 1 charge -> level 3
- 2 charges -> level 4
- 3 charges -> level 5

But `Lightning Bolt` in the authored surface is a spell whose save gate uses:

- `dc = { kind = "caster_spell_save_dc" }`

The item text overrides that with:

> "you can expend no more than 3 charges to cast *Lightning Bolt* (**save DC 15**) from it"

If I encoded this item with today's `grant_spell_access.charge_cast`, the trace would imply the wand uses the wielder's spell save DC. That is false.

## Required Surface Widening

### 1. Fixed DC source for item-cast spells

Add a fixed DC variant to `DcSource`, e.g.:

```ts
| { readonly kind: "fixed"; readonly dc: number }
```

Why this is the right level:

- the missing concept is not a new v4 atom;
- the existing save-gate shape already exists;
- the missing piece is a new variant of an existing surface type.

This would let item activations or item-cast spell projections encode:

- `dc = { kind: "fixed", dc: 15 }`

without inventing a new family or a fake caster-derived DC.

## Secondary Surface Gap

The attunement restriction is also not representable:

> "Requires Attunement by a Spellcaster"

`MagicItemRecord` currently only has:

- `requiresAttunement: boolean`

So the record can say the wand requires attunement, but not that only spellcasters qualify.

Suggested widening:

```ts
readonly attunementRestriction?:
  | { readonly kind: "spellcaster" }
```

This is secondary because it does not block the charge/recharge shape, but it is still a real omitted rule.

## Why I Did Not Author a Placeholder

I did not write `content/magic_item_wand_of_lightning_bolts.dhall` because every honest encoding route lies in one of these ways:

- `grant_spell_access.charge_cast` lies about the save DC by inheriting `caster_spell_save_dc`.
- Rewriting the item as a direct activated save-gate still cannot express a fixed DC, because `DcSource` has no fixed-value variant.

So the unit is not `clean`, but it does not force a new family or new atom inventory either. This is a surface-shape gap.
