`Cube of Force` is a `magic_item`, but it does not fit the current mechanics families honestly.

## Why it fails

The current authored surface can represent most local facts:

- `MagicItemRecord` exists.
- A shared `charge_pool` resource exists.
- `dawn` recharge exists.
- `grant_spell_access` already supports `charge_cast`.
- `grant_spell_access.dcOverride` already supports the fixed `save DC 17`.

The failure is at the procedure/family layer.

Current charged items are authored as `magic_item` `activation` mechanics with:

- one shared `activationCost` for the whole item;
- one shared resource/reset header;
- a direct phase that grants spell access.

That shape works tolerably for action-like items such as a wand or staff. It does not work honestly for `Cube of Force`, because the cube's spell menu includes `Shield`, whose casting procedure is reaction-shaped, alongside non-reaction spells like `Mage Armor`, `Tiny Hut`, `Private Sanctum`, `Resilient Sphere`, and `Wall of Force`.

If this item were forced into the existing `activation` family:

- `activationCost = { kind = "action" }` would be false for `Shield`.
- `activationCost = { kind = "reaction" }` would be false for the rest of the table.
- `activationCost = { kind = "free" }` would hide the item's real activation procedure.

`PassiveMechanics` is not an honest escape hatch either, because passive mechanics cannot own the shared charge pool / recharge cadence that bounds those spell casts.

`CompositeMagicItemMechanics` also does not solve it, because it can only combine existing passive/activation parts. There is still no honest place to put:

- a shared charge reservoir;
- recharge cadence;
- a bundle of spell grants that defer to each spell's own casting-time procedure.

## Narrowest widening

This is a `structural_widening`, not an atom widening.

No new v4 atom is forced by the cube itself. The missing piece is a new magic-item procedure/subgraph that means roughly:

- the item passively grants access to a menu of named spells;
- each grant can consume charges from one shared item charge pool;
- each granted spell keeps its own casting time and procedure shape;
- optional fixed item DC overrides still apply per grant.

Working name:

- `resource_backed_spell_access_bundle`

That could be modeled either as:

1. a new `MagicItemMechanics` family, or
2. a widened composite/resource wrapper that can host passive `grant_spell_access` effects plus a shared charge/recharge header.

## Evidence

From the unit text:

> You can press one of those faces, expend the number of charges required for it, and thereby cast the spell associated with it (save DC 17)

and the table explicitly includes both:

- `Shield`
- non-reaction spells such as `Mage Armor`, `Tiny Hut`, `Private Sanctum`, `Resilient Sphere`, and `Wall of Force`

That mixed casting-time menu is what makes the current single-activation-cost family dishonest here.
