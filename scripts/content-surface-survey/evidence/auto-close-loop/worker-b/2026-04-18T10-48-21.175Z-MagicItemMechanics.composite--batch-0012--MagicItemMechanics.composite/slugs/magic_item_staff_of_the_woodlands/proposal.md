`Staff of the Woodlands` fits the existing `magic_item` + `composite` shape for its held-item bonuses, charge pool, dawn recharge, and spellcasting bundle. The remaining gaps are surface gaps, not a new top-level family.

Required widenings:

1. `Attachment` item/object targeting on activation phases.
Evidence: "plant one end of the staff in earth in an unoccupied space and expend 1 charge to transform the staff into a healthy tree."
Why: the current activation surface can only attach to `self`, `target`, `area`, or `mark`. `Tree Form` acts on the staff itself, not on the wielder or a creature target.

2. End-of-form fallout rider for creatures occupying the transformed object.
Evidence: "Any creature in the tree falls when the tree reverts to a staff."
Why: the current surface has no authored way to express the reversion consequence. v4 already names `fall_on_end`; the TS surface is missing the corresponding effect/lifecycle path.

3. Nondestructive last-charge shutdown state.
Evidence: "If you expend the last charge, roll 1d20. On a 1, the staff loses its properties and becomes a nonmagical Quarterstaff."
Why: `ItemDestructionPolicy` currently distinguishes only `none`, probabilistic destruction, or deterministic destruction on empty. This rider is neither destruction nor ordinary exhaustion; it is a persistent loss-of-magic state on the item.

Authored subset:

- passive held-item `+2` to attack rolls with the staff
- passive held-item `+2` to damage rolls with the staff
- passive held-item `+2` to spell attack rolls
- charge-cast access to the listed spells
- `1d6` recharge at dawn

Omitted from the authored subset:

- `Tree Form`
- the special last-charge shutdown rider
