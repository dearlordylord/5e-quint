## Gloves of Missile Snaring

The unit fits the existing `magic_item` kind and `triggered_reaction` mechanics family in broad shape:

- trigger: reaction when hit by an attack roll
- trigger narrowing: `any_of` over `weapon_category = ranged` and `weapon_property = thrown`
- effect family: `reduce_damage_taken`

I did **not** author `content/magic_item_gloves_of_missile_snaring.dhall` because the current surface cannot encode the rule honestly.

### Blocking surface gaps

1. `reduce_damage_taken.amount` cannot express `1d10 + your Dexterity modifier`.
   - Existing `DiceAmount.fixed.expr` supports dice, flat, and `spellcastingMod`, but not a generic ability modifier.
   - This blocks the main damage-reduction mechanic.

2. The reaction has a prerequisite the current surface cannot state: `if you have a free hand`.
   - Existing `EquipmentPredicate` covers holding/wearing/wielding/unarmored states, but not free-hand availability.
   - The trigger/effect would be misleading if authored without this gate.

### Secondary omitted rider

If the damage is reduced to 0, the wearer can catch the ammunition or weapon if it is small enough to hold in that hand.

That rider appears to need an additional effect-level concept for intercepting and retaining the incoming projectile/weapon after prevention. Nothing in the current surface or v4 atoms models "catch the incoming object" or transfer it into the reactor's hand.

### Proposed widenings

- `DiceExpr` / `DiceAmount` new variant or field for generic ability-modifier addends
  - Evidence: "reduce the damage by **1d10 plus your Dexterity modifier**"

- `EquipmentPredicate` new variant for free-hand gating
  - Evidence: "if you **have a free hand**"

- likely new effect atom for catching/intercepting the incoming ammunition or weapon after prevention
  - Evidence: "If you reduce the damage to 0, you can **catch the ammunition or weapon**"
