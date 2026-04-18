## Gloves of Missile Snaring

Outcome: `atom_widening`

The item fits the existing `magic_item` top-level kind and broadly wants the existing `triggered_reaction` mechanics family, but it does not fit honestly on the current authored surface.

### Existing family fit

- The core shape is a reactive magic item:
  - trigger: being hit by an attack roll
  - cost: reaction
  - effect: reduce incoming damage
- The surface already has:
  - `TriggeredReactionAbilityMechanics`
  - `ReactionTrigger.hit_by_attack_roll`
  - `EffectAtom.reduce_damage_taken`

### Surface gaps

These are missing variants on existing surface types:

1. Compound weapon filter on the trigger.
   - RAW: "made with a Ranged or Thrown weapon"
   - Current `WeaponFilter` can express either `{ kind = "weapon_category", category = "ranged" }` or `{ kind = "weapon_property", property = "thrown" }`, but not `ranged OR thrown`.

2. Ability-modifier additive amount on `reduce_damage_taken`.
   - RAW: "reduce the damage by 1d10 plus your Dexterity modifier"
   - Current `DiceExpr` supports fixed dice/flat values and `spellcastingMod`, but not a generic ability modifier such as Dexterity.

3. Free-hand gate on the reaction.
   - RAW: "if you have a free hand"
   - Current `EquipmentPredicate` has held/worn/unarmored/weapon-state predicates, but no way to require an available free hand.

### Atom gap

The item also has a secondary deterministic rider that is not representable with the current atom inventory:

- RAW: "If you reduce the damage to 0, you can catch the ammunition or weapon if it is small enough for you to hold in that hand."
- The current surface has no effect atom for catching or taking possession of the triggering ammunition/weapon after fully negating the hit.

This looks like a new item/object-handling atom, not just another variant of the existing reaction or damage-reduction shapes.

### Proposed widenings

1. `WeaponFilter` variant or composition form for `any_of` / OR-combination filters.
2. `DiceExpr` / `DiceAmount` support for adding a named ability modifier.
3. `EquipmentPredicate` variant for `free_hand`.
4. New effect atom for catching the triggering projectile/weapon when a reduction drives damage to 0.
