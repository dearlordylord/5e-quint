# Wand of the War Mage, +1, +2, or +3

## Verdict

`surface_widening`

## Why It Doesn't Fit Cleanly

The existing top-level shape is close:

- `kind = "magic_item"` exists.
- `mechanics.family = "passive"` exists.
- `modify_roll_numeric` can represent the spell-attack bonus itself.

But the current authored surface only supports one fixed rarity and one fixed mechanics payload per `MagicItemRecord`. This SRD entry is a bundled item family:

- Uncommon grants `+1`
- Rare grants `+2`
- Very Rare grants `+3`

That means one honest record needs the bonus to vary with the selected item variant. The current surface cannot express:

- a rarity choice on `MagicItemRecord`, or
- a bonus delta parameterized by item variant / rarity

Without that, any authored record would have to lie by collapsing the family to a single representative tier while still claiming to encode `Wand of the War Mage, +1, +2, or +3`.

## Narrowest Needed Widening

Add a surface-level way to encode a magic-item variant family that binds together:

- rarity
- display suffix / variant label
- mechanics differences such as numeric bonuses

This is a surface problem, not an atom problem:

- the needed mechanic is still `modify_roll_numeric`
- no new v4 atom is forced
- the missing piece is variant selection within an existing `magic_item` record shape

## Non-blocking Secondary Clause

The clause below was not treated as widening pressure:

> "In addition, you ignore Half Cover when making a spell attack roll."

Local precedent already treats cover-immunity riders as caller-owned / DM-agenda rather than core authored-surface mechanics. See the existing `sacred_flame.dhall` note for the same treatment of cover bypass.
