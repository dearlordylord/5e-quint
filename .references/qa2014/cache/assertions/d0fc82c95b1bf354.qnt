// Source: https://rpg.stackexchange.com/q/132812
module _qa_d0fc82c95b1bf354 {
  import dnd.* from "./dnd"

  // Does Crossbow Expert override the light weapon requirement for Two Weapon Fighting?
  run qa_twf_longsword_handcrossbow_fails_light_check = {
    // Standard TWF rules: both weapons must be light melee. Longsword lacks Light_;
    // hand crossbow lacks both Light_ and isMelee — so pCanTWFWithWeapons rejects this combo.
    // Crossbow Expert bypasses this entirely (not modelled in spec).
    val longsword = {
      name: "longsword", damageDie: 8, versatileDie: 10, damageType: Slashing,
      properties: Set(Versatile), isMelee: true, normalRange: 0, longRange: 0
    }
    val handCrossbow = {
      name: "hand crossbow", damageDie: 6, versatileDie: 0, damageType: Piercing,
      properties: Set(Ammunition, Loading), isMelee: false, normalRange: 30, longRange: 120
    }
    val t = FRESH_TURN.with("attackActionUsed", true)
    val creature = freshCreature(10)
    assert(not(pCanTWFWithWeapons(longsword, handCrossbow, t, creature)))
  }
  
  // Does Crossbow Expert override the light weapon requirement for Two Weapon Fighting?
  run qa_twf_two_light_melee_succeeds = {
    // Control: two daggers (both Light_ and isMelee) pass the TWF check — confirming
    // the light+melee requirement is what blocks the longsword/crossbow combo above.
    val dagger = {
      name: "dagger", damageDie: 4, versatileDie: 0, damageType: Piercing,
      properties: Set(Finesse, Light_, Thrown), isMelee: true, normalRange: 20, longRange: 60
    }
    val t = FRESH_TURN.with("attackActionUsed", true)
    val creature = freshCreature(10)
    assert(pCanTWFWithWeapons(dagger, dagger, t, creature))
  }
  
  // Does Crossbow Expert override the light weapon requirement for Two Weapon Fighting?
  run qa_twf_offhand_no_positive_ability_mod = {
    // TWF off-hand: positive ability modifier is NOT added (pTWFOffHandDamage).
    // Crossbow Expert is not TWF, so it adds full DEX — but that mechanic is outside the spec.
    // 4 dice result + 3 DEX mod = still 4 under TWF rules.
    assert(pTWFOffHandDamage(4, 3) == 4)
  }
  
  // Does Crossbow Expert override the light weapon requirement for Two Weapon Fighting?
  run qa_twf_offhand_negative_ability_mod_applies = {
    // TWF off-hand: negative ability modifier IS applied (penalty can't be avoided).
    // 4 dice result + (-1) mod = 3.
    assert(pTWFOffHandDamage(4, -1) == 3)
  }
}
