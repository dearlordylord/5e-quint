## Quarterstaff of the Acrobat

Verdict: `atom_widening`

I did not author `content/magic_item_quarterstaff_of_the_acrobat.dhall` because the item does not fit the current surface honestly.

### Why it fails

The decisive blocker is item form state.

- The surface already has an `alter_item_kind` effect atom, but activation phases can only attach to `self`, `target`, `area`, or `mark`. There is no authored `item` / `object` attachment to let the item alter its own form.
- The item's other mechanics are gated by that form state:
  - `Acrobatic Assist` applies only in quarterstaff and 10-foot pole forms.
  - `Attack Deflection` applies only in quarterstaff form.
  - `Ranged Weapon` applies only in quarterstaff form.
- `EquipmentPredicate` can express `holding_item`, but not `holding_item in named form X`.

Without those two pieces, any authored JSON would be misleading: it would either grant form-specific riders all the time or ignore the item's central transform mechanic.

### Additional pressure beyond the form-state blocker

The ranged profile rider also exceeds the current atoms.

- The item gains the `Thrown` property plus explicit normal/long range values in one form.
- After the ranged attack, the weapon deterministically returns to the wielder's hand.

The current surface can *filter* by weapon property or specific item, but it cannot *grant* a new weapon profile or encode a boomerang-style return rider.

### Secondary rider

The dim-light toggle is not the main blocker.

- Existing content already treats light-emission text as omitted / caller-owned when no dedicated atom exists.
- If the form-state problem were solved, this rider could still be left out explicitly without misrepresenting the item's combat-facing core as badly as the form-gating gaps would.

### Suggested widenings

1. Add an authored attachment variant for item/object targets.
   Evidence: "you can take a Bonus Action to alter its form"

2. Add a passive / activation predicate that can key off the current form of the held item.
   Evidence: "Quarterstaff and 10-Foot Pole Forms Only" / "Quarterstaff Form Only"

3. Add a weapon-profile modification atom.
   Evidence: "This weapon has the Thrown property with a normal range of 30 feet and a long range of 120 feet."

4. Add a return-to-hand rider atom.
   Evidence: "Immediately after you make a ranged attack with the weapon, it flies back to your hand."
