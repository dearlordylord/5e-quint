## Staff of the Woodlands

`Staff of the Woodlands` is a close fit for the existing `magic_item` surface, but not an honest clean fit.

What already fits:

- passive held-item bonuses
  - `+2` to attack rolls made with the staff
  - `+2` to damage rolls made with the staff
  - `+2` to `spell_attack_roll` while holding it
- attunement restriction
  - `class_list = ["druid"]`
- charge-cast spell grants
- dawn recharge

What blocks an honest authored record:

1. `Tree Form` needs an item/object attachment on activations.

The current activation surface can only attach phases to `self`, `target`, `area`, or `mark`. `Tree Form` transforms the staff itself, not the wielder or a creature target.

Required widening:

- `Attachment.item` or `Attachment.object` for activation/direct phases, so `alter_item_kind` can honestly target the held staff / planted tree.

Evidence:

> "plant one end of the staff in earth ... to transform the staff into a healthy tree"

> "While touching the tree and using a Magic action, you return the staff to its normal form."

2. Reverting the tree needs a revert-time fall rider that the authored surface does not expose.

The taxonomy already includes `fall_on_end`, but `types.ts` and the tracer do not expose it. Without that atom, the revert branch would silently lose a deterministic mechanic.

Required widening:

- surface support for `fall_on_end`

Evidence:

> "Any creature in the tree falls when the tree reverts to a staff."

3. The last-charge clause is not destruction; it is permanent loss of magic.

Current `ItemDestructionPolicy` only models:

- no destruction
- destruction on a last-charge roll
- permanent destruction on empty

This staff does not get destroyed. It remains as a nonmagical Quarterstaff.

Required widening:

- a non-destructive last-charge exhaustion variant on `ItemDestructionPolicy`, or equivalent lifecycle/effect support for "becomes nonmagical item"

Evidence:

> "If you expend the last charge, roll 1d20. On a 1, the staff loses its properties and becomes a nonmagical Quarterstaff."

Non-blocking narrative text that can remain out of core:

- the tree "appears ordinary"
- the faint aura being discernible with `Detect Magic`
- exact tree dimensions as descriptive object-state detail

Outcome:

- `surface_widening`

Reason:

- the unit shape itself fits `magic_item`
- the missing pieces are surface/tracer gaps within existing or clearly adjacent item mechanics, not a forced new top-level family
