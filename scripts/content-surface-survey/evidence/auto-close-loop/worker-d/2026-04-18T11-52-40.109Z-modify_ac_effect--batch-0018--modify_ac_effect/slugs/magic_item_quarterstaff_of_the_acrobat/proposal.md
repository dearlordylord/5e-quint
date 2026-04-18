Outcome: `atom_widening`

The unit fits the existing `magic_item` top-level kind, but only as a partial passive subset. The held `+2` attack/damage bonus authors cleanly. The remaining mechanics expose missing surface support in three places.

1. Item-targeted form change is missing from the activation surface.
Evidence: "you can take a Bonus Action to alter its form, turning it into a 6-inch rod ... or a 10-foot pole, or reverting it a Quarterstaff"

- `alter_item_kind` already exists as an effect atom, but `ActivationPhase.attachment` has no `item` or `object` attachment variant. The current surface can say that some item kind changes, but not that the staff itself is the thing being changed.
- Proposed widening: new variant on `Attachment` for item/object targeting, or equivalent magic-item self-item attachment.

2. Current-item-form gating is missing.
Evidence: "Acrobatic Assist (Quarterstaff and 10-Foot Pole Forms Only)." "Attack Deflection (Quarterstaff Form Only)." "Ranged Weapon (Quarterstaff Form Only)."

- The surface has equipment predicates like `holding_item`, but nothing that can say "only while this item is currently in form X".
- Proposed widening: new predicate variant keyed to the active item form, reusable across passive and activated magic-item parts.

3. Light emission and return-to-hand are not in the current atom vocabulary.
Evidence: "you can cause it to emit green Dim Light out to 10 feet" and "Immediately after you make a ranged attack with the weapon, it flies back to your hand."

- Illumination is not modeled by any current effect atom.
- Automatic weapon return after a ranged attack is also not modeled by any current effect atom.
- Proposed widenings:
  - new atom `emit_light` (or equivalent illumination effect with radius and light grade)
  - new atom `return_item_to_holder` / `return_weapon_to_hand_after_attack`

4. The quarterstaff-form ranged rider needs weapon-stat mutation, not just a filter.
Evidence: "This weapon has the Thrown property with a normal range of 30 feet and a long range of 120 feet."

- The surface has `WeaponProperty = "thrown"` only as a filter vocabulary for other riders. It does not have a way to grant or mutate weapon properties/ranges on the item itself.
- Proposed widening: new atom or surface variant for weapon-profile mutation (grant property + attack ranges).
