## Gloves of Missile Snaring

Outcome: `surface_widening`

The item fits the existing `magic_item` top-level kind and the existing `triggered_reaction` mechanics family:

- trigger: `hit_by_attack_roll` with `any_of` over
  - `weapon_category = ranged`
  - `weapon_property = thrown`
- payload atom: `reduce_damage_taken`

The current surface still cannot encode the main reaction honestly because the reduction amount is `1d10 + your Dexterity modifier`, and `DiceAmount` / `DiceExpr` only support:

- fixed dice + flat number
- `spellcastingMod`
- linked/resource scaling

They do not support a generic non-spell ability-modifier addend.

Additional gaps:

- The reaction is gated by `if you have a free hand`, but `EquipmentPredicate` has no `free_hand` variant.
- The rider `If you reduce the damage to 0, you can catch the ammunition or weapon` has no existing effect atom or ownership-transfer/item-catch shape.

Recommended widenings:

1. `new_variant`: add a generic ability-modifier addend to `DiceExpr` or `DiceAmount`.
   - Why: needed for non-spell rolled amounts like `1d10 + Dexterity modifier`.
   - Evidence: "reduce the damage by 1d10 plus your Dexterity modifier"

2. `new_variant`: add `free_hand` to `EquipmentPredicate`.
   - Why: the reaction is only legal if the wearer has a free hand at trigger time.
   - Evidence: "if you have a free hand"

3. `new_atom`: add an item/projectile catch or transfer effect.
   - Why: reducing the damage to 0 can transfer the incoming ammunition or weapon into the wielder's hand.
   - Evidence: "If you reduce the damage to 0, you can catch the ammunition or weapon if it is small enough for you to hold in that hand."

I did not author a partial JSON/Dhall record because encoding the primary reduction clause without the Dexterity-modifier term would be knowingly false.
