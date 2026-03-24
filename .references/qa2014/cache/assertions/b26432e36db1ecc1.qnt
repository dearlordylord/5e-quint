// Source: https://rpg.stackexchange.com/q/68942
module _qa_b26432e36db1ecc1 {
  import dnd.* from "./dnd"

  // Is the Fighter the only one who gets more attacks per round now?
  run qa_twf_offhand_positive_mod_not_added = {
    // Two-weapon fighting off-hand attack: positive ability modifier is NOT added to damage
    val diceResult = 6
    val strMod = 4
    val offHandDmg = pTWFOffHandDamage(diceResult, strMod)
    assert(offHandDmg == 6)
  }
  
  // Is the Fighter the only one who gets more attacks per round now?
  run qa_twf_offhand_negative_mod_is_applied = {
    // Two-weapon fighting off-hand attack: negative ability modifier IS subtracted
    val diceResult = 6
    val strMod = -2
    val offHandDmg = pTWFOffHandDamage(diceResult, strMod)
    assert(offHandDmg == 4)
  }
  
  // Is the Fighter the only one who gets more attacks per round now?
  run qa_twf_requires_both_light_melee = {
    // TWF requires both weapons to be Light melee; non-light off-hand blocks it
    val lightDagger: Weapon = {
      name: "dagger", damageDie: 4, versatileDie: 0, damageType: Piercing,
      properties: Set(Finesse, Light_, Thrown), isMelee: true, normalRange: 20, longRange: 60,
    }
    val longsword: Weapon = {
      name: "longsword", damageDie: 8, versatileDie: 10, damageType: Slashing,
      properties: Set(Versatile), isMelee: true, normalRange: 0, longRange: 0,
    }
    val t = FRESH_TURN.with("attackActionUsed", true)
    val creature = freshCreature(20)
    assert(not(pCanTWFWithWeapons(lightDagger, longsword, t, creature)))
  }
  
  // Is the Fighter the only one who gets more attacks per round now?
  run qa_twf_both_light_melee_permitted = {
    // TWF is allowed when both weapons are Light melee and attack action was taken
    val dagger: Weapon = {
      name: "dagger", damageDie: 4, versatileDie: 0, damageType: Piercing,
      properties: Set(Finesse, Light_, Thrown), isMelee: true, normalRange: 20, longRange: 60,
    }
    val handaxe: Weapon = {
      name: "handaxe", damageDie: 6, versatileDie: 0, damageType: Slashing,
      properties: Set(Light_, Thrown), isMelee: true, normalRange: 20, longRange: 60,
    }
    val t = FRESH_TURN.with("attackActionUsed", true)
    val creature = freshCreature(20)
    assert(pCanTWFWithWeapons(dagger, handaxe, t, creature))
  }
  
  // Is the Fighter the only one who gets more attacks per round now?
  run qa_twf_blocked_if_bonus_action_used = {
    // TWF bonus action is unavailable if bonus action already spent
    val dagger: Weapon = {
      name: "dagger", damageDie: 4, versatileDie: 0, damageType: Piercing,
      properties: Set(Finesse, Light_, Thrown), isMelee: true, normalRange: 20, longRange: 60,
    }
    val t = FRESH_TURN.with("attackActionUsed", true).with("bonusActionUsed", true)
    val creature = freshCreature(20)
    assert(not(pCanTWFWithWeapons(dagger, dagger, t, creature)))
  }
  
  // Is the Fighter the only one who gets more attacks per round now?
  run qa_twf_offhand_damage_floored_at_zero = {
    // Off-hand damage can't go below 0 even with large negative modifier
    val diceResult = 2
    val strMod = -5
    val offHandDmg = pTWFOffHandDamage(diceResult, strMod)
    assert(offHandDmg == 0)
  }
}
