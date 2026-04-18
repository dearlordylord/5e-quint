## Quarterstaff of the Acrobat

The item fits `magic_item`, but not cleanly. The current surface can carry the passive `+2` weapon bonus while held; the rest of the printed mechanics need additional surface shape.

### Surface gaps

- `Attachment.item` or `Attachment.object` on non-spell activation phases.
  Evidence: "you can take a Bonus Action to alter its form, turning it into a 6-inch rod ... or a 10-foot pole, or reverting it a Quarterstaff"
  Why: `alter_item_kind` already exists as an effect atom, but the current shared `Attachment` union for activations cannot target the item itself.

- Form-gated equipment predicate, e.g. `EquipmentPredicate.item_form`.
  Evidence: "Acrobatic Assist (Quarterstaff and 10-Foot Pole Forms Only)" and "Attack Deflection (Quarterstaff Form Only)"
  Why: the current passive / activation gates can say "holding item", but they cannot narrow a grant or activation to a named current form of that held item.

- `EffectAtom.modify_range` surface variant, plus a bounded weapon-property grant shape.
  Evidence: "This weapon has the Thrown property with a normal range of 30 feet and a long range of 120 feet."
  Why: the printed rider modifies the weapon's attack profile, not the wielder directly. The taxonomy already has `modify_range`, but the surface type does not expose it, and there is no current surface shape to grant a weapon property like `thrown`.

- Return-to-hand post-attack subgraph.
  Evidence: "Immediately after you make a ranged attack with the weapon, it flies back to your hand."
  Why: this is a deterministic post-attack item-state transition. The current surface has no authored subgraph for "after this ranged attack, reattach the thrown weapon to the wielder's hand."

### Omitted non-core / lower-priority rider

- Light emission toggle.
  Evidence: "emit green Dim Light out to 10 feet ... or you can extinguish the light"
  Why: local precedent already treats dim-light emission as caller-owned visibility state rather than core combat mechanics.

### Authored subset

The authored Dhall/JSON encodes only the held-item `+2` bonus to attack rolls and damage rolls made with this weapon. That subset is honest under the current surface and traces cleanly.
