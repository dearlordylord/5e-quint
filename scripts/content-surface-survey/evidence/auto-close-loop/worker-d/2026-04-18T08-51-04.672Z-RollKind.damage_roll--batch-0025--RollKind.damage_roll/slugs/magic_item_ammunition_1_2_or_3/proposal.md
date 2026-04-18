`Ammunition, +1, +2, or +3` mostly fits the current `magic_item` surface as a passive variant collection:

- each rarity variant grants a bonus to `attack_roll`
- each rarity variant grants a bonus to damage rolls
- the numeric bonus is derived honestly from `DiceDelta.magic_item_rarity_bonus`

The remaining gap is the item lifecycle rider:

> "Once it hits a target, the ammunition is no longer magical."

The current surface can model:

- permanent passive bonuses on the item
- probabilistic destruction on last charge spent
- deterministic destruction on pool exhaustion

It cannot model:

- a passive item's magical bonus ending on a successful hit
- without also destroying the item

Proposed widening:

- `new_variant`: add a magic-item lifecycle / destruction variant for post-hit deactivation, such as `on_hit_loses_magic`

Why this is `surface_widening` rather than `atom_widening`:

- the core mechanics already fit existing v4-style atoms (`modify_roll_numeric`, `modify_damage_numeric`)
- the missing piece is a record-shape/lifecycle variant on authored magic items, not a new effect atom

Secondary non-core text not modeled:

- quantities of ten or twenty pieces
- market-value comparison to potions of matching rarity
