## Staff of the Woodlands

Outcome: `surface_widening`

The current magic-item surface can encode the held-item bonuses, charge pool, dawn recharge, and spell grants honestly. Two remaining clauses still need widening.

### 1. Item/location attachment for Tree Form

The effect atom already exists in the surface as `alter_item_kind`, but activation phases can only attach to `self`, `target`, `area`, or `mark`. Tree Form changes the staff itself after planting it in earth at an unoccupied space, then later reverts that same planted object.

Proposed widening:

- `Attachment.item` or equivalent object/item-target attachment for activation phases
- optional location anchor on that attachment for "plant in unoccupied space"
- reuse `alter_item_kind` against that attachment

Evidence:

> "You can take a Magic action to plant one end of the staff in earth in an unoccupied space and expend 1 charge to transform the staff into a healthy tree."

> "While touching the tree and using a Magic action, you return the staff to its normal form."

### 2. Non-destructive last-charge shutdown

`ItemDestructionPolicy.last_charge_roll` only models destruction. This item's last-charge rider is different: on a 1 it loses its magical properties and becomes a nonmagical Quarterstaff, but it is not destroyed.

Proposed widening:

- new `ItemDestructionPolicy` variant for "last charge roll -> suppress magic / become mundane item"

Evidence:

> "If you expend the last charge, roll 1d20. On a 1, the staff loses its properties and becomes a nonmagical Quarterstaff."

### 3. Revert fall rider

When the planted tree reverts, creatures in the tree fall. That is tied to the same item-state cycle and needs a completion/revert rider hanging off the tree-form lifecycle.

Proposed widening:

- revert-trigger rider on the item/object transform flow for "creatures in transformed object fall"

Evidence:

> "Any creature in the tree falls when the tree reverts to a staff."
