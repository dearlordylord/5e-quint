## Quarterstaff of the Acrobat

Outcome: `atom_widening`

The item's top-level family fits `magic_item` with `composite` mechanics:

- passive held weapon bonuses (`+2` attack / damage with this weapon)
- a held-item Bonus Action activation to change form
- a held-item triggered reaction for Attack Deflection
- a held-item passive skill rider in some forms

I did not author `content/magic_item_quarterstaff_of_the_acrobat.dhall` because two required mechanics are not honestly representable in the current surface.

### Required widenings

1. `EquipmentPredicate` needs an item-form-aware variant.

Why:

- The item's sub-properties are gated by the weapon's current form, not just by "holding item".
- Current predicates can say `holding_item`, but cannot distinguish Quarterstaff-only vs Quarterstaff-or-10-Foot-Pole.

Evidence:

> "Acrobatic Assist (Quarterstaff and 10-Foot Pole Forms Only)."

> "Attack Deflection (Quarterstaff Form Only)."

> "Ranged Weapon (Quarterstaff Form Only)."

Suggested shape:

- new surface variant such as `holding_item_form` or `item_state` under `EquipmentPredicate`

Classification:

- `surface_widening`

2. A weapon-profile atom is needed to add the Thrown property and authored ranges.

Why:

- The item changes the weapon's ongoing rules text in Quarterstaff form.
- Current atoms can modify attack-roll and damage-roll numbers, but cannot grant a weapon property or replace the weapon's ranged profile.

Evidence:

> "This weapon has the Thrown property with a normal range of 30 feet and a long range of 120 feet."

Suggested shape:

- new atom such as `grant_weapon_property`
- or a broader `modify_weapon_profile`

Classification:

- `atom_widening`

3. A post-attack return rider is needed for thrown weapons that come back automatically.

Why:

- The item's ranged use includes a deterministic follow-up effect after the attack resolves.
- No current atom or relation expresses "after a ranged attack with this weapon, it returns to your hand."

Evidence:

> "Immediately after you make a ranged attack with the weapon, it flies back to your hand."

Suggested shape:

- new atom such as `return_weapon_to_hand`
- or a new post-attack subgraph attached to a weapon attack window

Classification:

- `atom_widening`

### Not the deciding blocker

The light-emission rider is not the basis for the verdict. Existing authored content already treats illumination-only text as caller-owned / omitted pressure, and this item's harder blockers are the form-gated weapon-rule changes above.

