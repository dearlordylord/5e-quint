# Staff of the Woodlands

Outcome: `surface_widening`

The top-level fit is still `magic_item` with `CompositeMagicItemMechanics`:

- a passive held-item part for the quarterstaff and spell-attack bonuses
- an activated spellcasting part backed by a shared charge pool
- an activated Tree Form part backed by that same charge pool

I did not author `content/magic_item_staff_of_the_woodlands.dhall` because the current surface cannot represent several required details honestly.

## Required widenings

1. `modify_roll_numeric` needs a way to scope to spell attacks only.

Evidence:
> While holding it, you have a +2 bonus to spell attack rolls.

Current gap:

- `modify_roll_numeric.on = ["attack_roll"]` is too broad.
- `weaponFilter` only narrows weapon attacks, not spell attacks.

Likely shape:

- add an `attackKindFilter` or similar narrowing for `spell_attack_only`

2. Non-spell magic-item activations need a way to spend charges from the same shared pool used by granted spells.

Evidence:
> This staff has 6 charges
> You can take a Magic action ... and expend 1 charge to transform the staff into a healthy tree.

Current gap:

- spell casts can spend from a charge pool through `grant_spell_access.mode = charge_cast`
- Tree Form is not a spell, so it cannot use that path
- splitting the item into two activation parts would duplicate the same charge pool, which is not honest

Likely shape:

- a generic per-activation charge spend on non-spell activation phases or activation headers
- or a composite-level shared resource that multiple activation parts can consume

3. Activation attachments need an `item` or `object` target.

Evidence:
> transform the staff into a healthy tree

Current gap:

- `alter_item_kind` exists as an effect atom
- but `ActivationPhase.attachment` cannot target the staff itself

Likely shape:

- widen `Attachment` so direct activations can attach to an item/object target, not just self/creature/area/mark

4. Item destruction/lifecycle needs a “depower into mundane item” variant.

Evidence:
> On a 1, the staff loses its properties and becomes a nonmagical Quarterstaff.

Current gap:

- `last_charge_roll` implies destructive loss
- `permanent_on_empty` implies deterministic exhaustion
- neither matches “remains as a mundane quarterstaff”

Likely shape:

- a new `ItemDestructionPolicy` variant for last-charge depowering without destruction

## Additional pressure not modeled yet

Tree Form also carries a revert-side rider:

> Any creature in the tree falls when the tree reverts to a staff.

That looks like further surface pressure around item-form lifecycle / revert effects. I did not classify that as the primary blocker because the item already fails earlier on shared charge spending and item-targeted transformation.
