`Gloves of Missile Snaring` is close to an honest `magic_item` `triggered_reaction` encoding, but the current authored surface cannot represent the full rule text without distortion.

What already fits:

- `MagicItemRecord`
- `TriggeredReactionAbilityMechanics`
- `ReactionTrigger.hit_by_attack_roll` narrowed by weapon filters
- `reduce_damage_taken`
- attunement and worn-item gating

Blocking gaps:

1. The damage reduction amount is `1d10 + your Dexterity modifier`.
   The current `reduce_damage_taken.amount` uses `DiceAmount`, and `DiceExpr` can add only a flat number or `spellcastingMod`.
   There is no general ability-modifier addend for non-spell amounts, so encoding this as just `1d10` would be false.

2. The reaction requires `if you have a free hand`.
   `EquipmentPredicate` supports `wearing_item`, `holding_item`, armor predicates, weapon predicates, and `all_of`, but no `free_hand` predicate.
   Encoding only `wearing_item` would omit a real mechanical gate.

Secondary gap:

3. `If you reduce the damage to 0, you can catch the ammunition or weapon if it is small enough for you to hold in that hand.`
   The current surface has no honest way to express a post-reduction conditional item-catch rider. This looks like a surface gap around item/object attachment plus transfer/catch semantics, not a new top-level family.

Recommended widening classification: `surface_widening`.

Suggested additions:

- Add a non-spell ability-modifier addend to `DiceExpr` / `DiceAmount`, so mitigation and similar quantities can encode `XdY + Dex mod`.
- Add `EquipmentPredicate.free_hand`, composable via `all_of` with `wearing_item`.
- Add an item/object catch-transfer shape for triggered reactions that succeed when damage is reduced to 0.
