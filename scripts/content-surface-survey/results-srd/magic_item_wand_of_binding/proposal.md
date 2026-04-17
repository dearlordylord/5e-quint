# Wand of Binding

## Verdict

`surface_widening`

## Why It Does Not Fit Cleanly Today

`Wand of Binding` is structurally an existing `magic_item` with `activation` mechanics:

- `activationCost = { kind = "action" }`
- `resource = { kind = "charge_pool", cap = 7 }`
- `resetCadence = { kind = "dawn", regain = 1d6 + 1 }`
- two `grant_spell_access` effects:
  - `hold_person` for 2 charges
  - `hold_monster` for 5 charges
- `destruction = { kind = "last_charge_roll", die = 20, destroyOn = 1 }`

The missing piece is the item's fixed spell save DC:

> "While holding the wand, you can cast one of the spells (**save DC 17**) on the following table from it."

Current `grant_spell_access` only records the spell id and casting-cost mode. It has no place to say that spells cast from this item use a fixed DC instead of the wielder's normal spell save DC.

That matters mechanically because both granted spells resolve through saving throws:

- `Hold Person`
- `Hold Monster`

Encoding the wand without the fixed DC would be dishonest, because it would imply normal spell resolution without the item's explicit DC override.

## Narrowest Honest Widening

Add a save-DC override on the magic-item spell-grant path, for example:

- `grant_spell_access.item_save_dc_override`

or an equivalent field on `SpellAccessMode.charge_cast` / magic-item activation metadata.

This is a surface-shape gap, not a new atom:

- no new top-level unit kind is needed;
- no new payload family is needed;
- no new v4 effect atom is needed.

The existing activated magic-item subgraph is already sufficient once the fixed item DC can be carried.
