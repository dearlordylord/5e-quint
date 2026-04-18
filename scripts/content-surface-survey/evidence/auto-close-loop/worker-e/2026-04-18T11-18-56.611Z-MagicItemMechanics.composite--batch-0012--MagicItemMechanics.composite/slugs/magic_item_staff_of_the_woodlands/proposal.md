`Staff of the Woodlands` mostly fits the current magic-item surface as a composite of:

- held-item passive bonuses on the staff weapon and spell attack rolls
- charge-based spell access with dawn recharge

Two mechanics still require widening.

1. `Tree Form` needs an item/object-targeted transform lifecycle.
Evidence: "You can take a Magic action to plant one end of the staff in earth in an unoccupied space and expend 1 charge to transform the staff into a healthy tree. While touching the tree and using a Magic action, you return the staff to its normal form."

The current activation surface can only attach direct effects to `self`, creature targets, areas, or marks. `alter_item_kind` exists, but there is no honest activation-time attachment for "the held item itself" or persisted item-form state that later gates a revert action. This is a `surface_widening`, not a new taxonomy need: v4 already has `item` / `object` attachment atoms and `alter_item_kind`.

Recommended widening:

- add an activation attachment variant for `item` or `object`
- allow item-targeted `alter_item_kind`
- add whatever minimal persisted item-mode state is needed to support a later revert action

2. Reversion fallout needs a surfaced fall rider.
Evidence: "Any creature in the tree falls when the tree reverts to a staff."

The current TS surface does not include a fall-on-end effect or lifecycle rider, even though v4 already names `fall_on_end`. This is also `surface_widening`.

Recommended widening:

- add a v4-aligned effect or lifecycle hook for `fall_on_end`

3. The last-charge failure mode is partial depowering, not destruction.
Evidence: "If you expend the last charge, roll 1d20. On a 1, the staff loses its properties and becomes a nonmagical Quarterstaff."

`ItemDestructionPolicy` can express deterministic exhaustion or probabilistic destruction, but not "remains as a mundane item with magic properties removed." The authored subset leaves this out rather than mislabeling it as destruction.

Recommended widening:

- add a non-destructive last-charge policy, such as a depowered / nonmagical remnant variant
