# Wand of Web

## Verdict

`surface_widening`

## Why it does not fit cleanly today

The item's outer shape already exists:

- `magic_item` record
- `activation` mechanics family
- `charge_pool` resource with cap 7
- `dawn` recharge with `1d6 + 1`
- `last_charge_roll` destruction
- `requiresAttunement = true`

The blocking gap is the cast rider:

> "While holding it, you can expend 1 charge to cast *Web* (**save DC 13**) from it."

`grant_spell_access` can currently name the spell and its charge cost, but it cannot override the spell's save DC. That matters here because the authored `web` spell uses:

- `save_gate.dc = { kind = "caster_spell_save_dc" }`

If this wand were encoded with ordinary `grant_spell_access`, the resulting trace would imply the spell uses the wielder's normal spell save DC, which is false. The fixed DC is part of the core mechanical payload, not an ignorable rider.

## Narrowest honest widening

Add a fixed-DC override to item-granted spell casting, for example:

- `grant_spell_access.fixed_save_dc`

Equivalent placements would also work if they preserve the same meaning:

- an optional fixed-DC cast override on `grant_spell_access`
- a spell-access casting-context override that can supply `save DC 13`

The important constraint is that the override applies to the spell cast from the item, without mutating the base `web` spell record itself.

## Why this is `surface_widening`, not `atom_widening`

No new v4 atom is required. The spell still resolves through existing atoms:

- `grant_spell_access`
- `save_gate`
- `apply_condition`
- existing resource/lifecycle atoms for charge pool, dawn recharge, and destruction

The missing piece is a surface-level variant for how an item-granted spell supplies its DC.
