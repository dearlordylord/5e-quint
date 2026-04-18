Quarterstaff of the Acrobat does fit the existing top-level `magic_item` record kind and `composite` mechanics family in principle: it combines passive held bonuses, a reactive property with its own recharge cadence, and bonus-action activations.

The current surface still cannot encode it honestly.

Gaps:

1. `surface_widening` — form-scoped gating for item state

The item has three mutable forms, and multiple mechanics apply only in some of them:

- Acrobatic Assist: quarterstaff and 10-foot pole only
- Attack Deflection: quarterstaff only
- Ranged Weapon: quarterstaff only

The surface can author `alter_item_kind`, but it cannot make passive grants or triggered-reaction parts conditional on the item's current authored form. Existing `EquipmentPredicate` variants only talk about holding/wearing/wielding state, not item-mode state.

Needed shape:

- a new predicate variant or equivalent stateful gate keyed to the current `alter_item_kind` form

Evidence:

> "In certain forms, the weapon has the following additional properties."

> "**Acrobatic Assist (Quarterstaff and 10-Foot Pole Forms Only).**"

> "**Attack Deflection (Quarterstaff Form Only).**"

> "**Ranged Weapon (Quarterstaff Form Only).**"

2. `atom_widening` — light emission

The item can emit and extinguish dim light with explicit radius and action timing. The current effect vocabulary has senses and detection, but no illumination atom.

Needed shape:

- a new light/illumination effect atom

Evidence:

> "you can cause it to emit green Dim Light out to 10 feet ... or you can extinguish the light"

3. `atom_widening` — thrown-and-return weapon behavior

The quarterstaff gains the Thrown property in one form, with explicit normal/long range, then immediately returns to the wielder's hand after a ranged attack. The current surface has no honest atom for granting a weapon property/range profile to a specific item, and no bounded post-attack return effect for the weapon.

Needed shape:

- a new weapon-property grant atom or subgraph
- a new return-to-hand effect/subgraph tied to "after you make a ranged attack with the weapon"

Evidence:

> "This weapon has the Thrown property with a normal range of 30 feet and a long range of 120 feet. Immediately after you make a ranged attack with the weapon, it flies back to your hand."

Why no authored `.dhall` file was produced:

- Encoding only the +2 weapon bonus and the reaction would misrepresent the item's behavior, because those mechanics are materially constrained by current form.
- The missing pieces are not just optional flavor; they determine when the mechanics exist at all.
