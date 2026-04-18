`Ammunition, +1, +2, or +3` mostly fits the existing `magic_item` surface as a collection of passive variants:

- `Ammunition, +1` (`uncommon`)
- `Ammunition, +2` (`rare`)
- `Ammunition, +3` (`very_rare`)

The current surface cleanly expresses:

- a passive bonus to `attack_roll`
- a passive bonus to damage rolls via `modify_damage_numeric`
- scoping both bonuses to the specific ammunition piece with `weaponFilter.kind = "specific_item"`

The remaining gap is the lifecycle rider:

> "Once it hits a target, the ammunition is no longer magical."

That is not item destruction and it is not pool exhaustion. The item remains present as ordinary ammunition, but its passive magical bonuses end after a successful hit. Current `MagicItemRecord` lifecycle support only models:

- no destruction
- destruction on last-charge roll
- deterministic destruction / uselessness on empty pool

None of those variants can honestly represent "becomes nonmagical on hit."

Proposed surface widening:

- Add a magic-item lifecycle variant for post-hit suppression of magic on a single-use passive item piece.
- Narrowest likely shape: a new variant alongside the existing magic-item destruction/lifecycle policy, triggered by a successful hit and ending the item's magical grants without implying physical destruction.

Why this is `surface_widening`, not `atom_widening`:

- the traced bonus mechanics use existing v4 atoms only: `modify_roll_numeric` and `modify_damage_numeric`
- the missing concept is a lifecycle shape in the authored surface, not a missing v4 effect atom
