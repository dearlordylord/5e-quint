Ammunition, +1, +2, or +3 fits the existing `magic_item` + `passive` family in broad shape, but it does not fit the current authored surface honestly.

Why it does not fit:

1. The item grants a rarity-based bonus to both attack rolls and damage rolls made with the ammunition.
The current surface can express the attack-roll half with `modify_roll_numeric` plus `DiceDelta.magic_item_rarity_bonus`, but `RollKind` has no `damage_roll` variant, so the damage-roll half cannot be represented without lying.

2. The item stops being magical once it hits a target.
The current surface has item-level `destruction` policies like `permanent_on_empty`, but nothing for a passive magic item that self-ends or becomes nonmagical on a successful hit. Encoding this as destruction would be false: the ammunition still exists, it just ceases to be magical.

Suggested narrow widenings:

- Add a `RollKind` variant for `damage_roll`, so `modify_roll_numeric` can cover rules like "bonus to attack rolls and damage rolls".
- Add a passive magic-item lifecycle variant for "becomes nonmagical on hit" or equivalent hit-triggered self-expiry / self-break semantics, rather than overloading `ItemDestructionPolicy`.

Relevant SRD text:

> "You have a bonus to attack rolls and damage rolls made with this piece of magic ammunition."

> "Once it hits a target, the ammunition is no longer magical."
