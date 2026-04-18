## Quarterstaff of the Acrobat

Outcome: `atom_widening`

The item record kind fits, but the full mechanic set does not fit the current
surface honestly.

Missing surface support:

- `EquipmentPredicate.current_item_kind` or equivalent form-state gate.
  Justification: multiple riders apply only in some forms, not merely while the
  item is held.
  Evidence:
  - "Acrobatic Assist (Quarterstaff and 10-Foot Pole Forms Only)."
  - "Attack Deflection (Quarterstaff Form Only)."
  - "Ranged Weapon (Quarterstaff Form Only)."

- Item-targeted transform path for magic-item activations.
  Justification: the item can change between rod, pole, and quarterstaff forms,
  but `alter_item_kind` currently has no honest way to target the held item from
  a magic-item activation.
  Evidence:
  - "you can take a Bonus Action to alter its form, turning it into a 6-inch rod ... or a 10-foot pole, or reverting it a Quarterstaff"

Missing atom-level support:

- `modify_weapon_profile` / `grant_weapon_property`-style atom.
  Justification: quarterstaff form gains the Thrown property plus explicit
  normal/long ranges; that is not representable with current passive atoms.
  Evidence:
  - "This weapon has the Thrown property with a normal range of 30 feet and a long range of 120 feet."

- `return_to_hand_after_ranged_attack`-style atom or subgraph.
  Justification: the weapon deterministically returns after a ranged attack,
  which is neither a passive bonus nor an existing lifecycle edge.
  Evidence:
  - "Immediately after you make a ranged attack with the weapon, it flies back to your hand."

Caller-owned omission:

- The green Dim Light rider is omitted by local precedent because illumination
  is currently treated as caller-owned visibility projection rather than a
  traced core-mechanics atom.
