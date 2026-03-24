// Source: https://rpg.stackexchange.com/q/53458
module _qa_3f06d3679311702b {
  import dnd.* from "./dnd"

  // Twin hand crossbow Fighter: is this build valid?
  // Archery fighting style +2 plus Sharpshooter -5 yields net bonus of +3 from a base of +8
  run qa_sharpshooter_archery_net_bonus = {
    val profBonus = proficiencyBonus(5)
    val dexMod = abilityModifier(16)
    val normalBonus = profBonus + dexMod + 2  // +3 prof + 3 dex + 2 Archery
    val sharpshooterBonus = normalBonus - 5   // Sharpshooter -5 to hit
    assert(normalBonus == 8 and sharpshooterBonus == 3)
  }
  
  // Twin hand crossbow Fighter: is this build valid?
  // Sharpshooter +10 damage on 1d6 roll of 3 with Dex mod +3: total 16 per shot
  run qa_sharpshooter_damage_calculation = {
    val dexMod = abilityModifier(16)
    val dmg = normalDamage(3, dexMod + 10)
    assert(dmg == 16)
  }
  
  // Twin hand crossbow Fighter: is this build valid?
  // At net +3 attack bonus (Sharpshooter active), a d20 roll of 10 hits AC 13
  run qa_sharpshooter_roll10_hits_ac13 = {
    val result = resolveAttackRoll(10, 3, 13, 0)
    assert(result.hits and not(result.isCritical))
  }
  
  // Twin hand crossbow Fighter: is this build valid?
  // Level 5 Fighter with Extra Attack feature gets 1 extra attack per Attack action
  run qa_fighter_extra_attack_level5 = {
    assert(extraAttacksFromConfig(TEST_CONFIG) == 1)
  }
  
  // Twin hand crossbow Fighter: is this build valid?
  // Without Sharpshooter active, normal +8 bonus on a roll of 5 hits AC 13 (5+8=13)
  run qa_archery_base_bonus_hits = {
    val profBonus = proficiencyBonus(5)
    val dexMod = abilityModifier(16)
    val fullBonus = profBonus + dexMod + 2
    val result = resolveAttackRoll(5, fullBonus, 13, 0)
    assert(result.hits and fullBonus == 8)
  }
}
