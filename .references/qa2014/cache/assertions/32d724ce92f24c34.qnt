// Source: https://rpg.stackexchange.com/q/194733
module _qa_32d724ce92f24c34 {
  import dnd.* from "./dnd"

  // Which conditions prevent or impede Spiritual Weapon bonus action attack?
  run qa_paralyzed_prevents_spiritual_weapon_bonus_action = {
    val creature = pApplyCondition(freshCreature(20), CParalyzed)
    val t1 = pUseBonusAction(FRESH_TURN, creature)
    assert(isIncapacitated(creature) and t1.bonusActionUsed == false)
  }
  
  // Which conditions prevent or impede Spiritual Weapon bonus action attack?
  run qa_stunned_prevents_spiritual_weapon_bonus_action = {
    val creature = pApplyCondition(freshCreature(20), CStunned)
    val t1 = pUseBonusAction(FRESH_TURN, creature)
    assert(isIncapacitated(creature) and t1.bonusActionUsed == false)
  }
  
  // Which conditions prevent or impede Spiritual Weapon bonus action attack?
  run qa_petrified_prevents_spiritual_weapon_bonus_action = {
    val creature = pApplyCondition(freshCreature(20), CPetrified)
    val t1 = pUseBonusAction(FRESH_TURN, creature)
    assert(isIncapacitated(creature) and t1.bonusActionUsed == false)
  }
  
  // Which conditions prevent or impede Spiritual Weapon bonus action attack?
  run qa_unconscious_prevents_spiritual_weapon_bonus_action = {
    val creature = pApplyCondition(freshCreature(20), CUnconscious)
    val t1 = pUseBonusAction(FRESH_TURN, creature)
    assert(isIncapacitated(creature) and t1.bonusActionUsed == false)
  }
  
  // Which conditions prevent or impede Spiritual Weapon bonus action attack?
  run qa_direct_incapacitated_prevents_spiritual_weapon_bonus_action = {
    val creature = pApplyCondition(freshCreature(20), CIncapacitated)
    val t1 = pUseBonusAction(FRESH_TURN, creature)
    assert(isIncapacitated(creature) and t1.bonusActionUsed == false)
  }
  
  // Which conditions prevent or impede Spiritual Weapon bonus action attack? (exhaustion 6 = dead)
  run qa_exhaustion6_dead_prevents_spiritual_weapon = {
    val creature = pAddExhaustion(freshCreature(20), 6)
    assert(creature.dead and creature.hp == 0)
  }
  
  // Which conditions prevent or impede Spiritual Weapon bonus action attack? (blinded = disadvantage)
  run qa_blinded_impedes_spiritual_weapon_attack = {
    val creature = pApplyCondition(freshCreature(20), CBlinded)
    val mods = pOwnAttackModifiers(creature, false)
    assert(mods.hasDisadvantage and not(mods.hasAdvantage))
  }
  
  // Which conditions prevent or impede Spiritual Weapon bonus action attack? (exhaustion 3 = disadvantage)
  run qa_exhaustion3_impedes_spiritual_weapon_attack = {
    val creature = pAddExhaustion(freshCreature(20), 3)
    val mods = pOwnAttackModifiers(creature, false)
    assert(mods.hasDisadvantage and not(creature.dead))
  }
  
  // Which conditions prevent or impede Spiritual Weapon bonus action attack? (frightened + LOS = disadvantage)
  run qa_frightened_los_impedes_spiritual_weapon_attack = {
    val creature = pApplyCondition(freshCreature(20), CFrightened)
    val mods = pOwnAttackModifiers(creature, true)
    assert(mods.hasDisadvantage)
  }
  
  // Which conditions prevent or impede Spiritual Weapon bonus action attack? (frightened no LOS = no disadvantage)
  run qa_frightened_no_los_does_not_impede_spiritual_weapon = {
    val creature = pApplyCondition(freshCreature(20), CFrightened)
    val mods = pOwnAttackModifiers(creature, false)
    assert(not(mods.hasDisadvantage))
  }
  
  // Which conditions prevent or impede Spiritual Weapon bonus action attack? (poisoned = disadvantage)
  run qa_poisoned_impedes_spiritual_weapon_attack = {
    val creature = pApplyCondition(freshCreature(20), CPoisoned)
    val mods = pOwnAttackModifiers(creature, false)
    assert(mods.hasDisadvantage)
  }
  
  // Which conditions prevent or impede Spiritual Weapon bonus action attack? (prone = disadvantage, same as melee)
  run qa_prone_impedes_spiritual_weapon_attack = {
    val creature = pApplyCondition(freshCreature(20), CProne)
    val mods = pOwnAttackModifiers(creature, false)
    assert(mods.hasDisadvantage)
  }
  
  // Which conditions prevent or impede Spiritual Weapon bonus action attack? (restrained = disadvantage)
  run qa_restrained_impedes_spiritual_weapon_attack = {
    val creature = pApplyCondition(freshCreature(20), CRestrained)
    val mods = pOwnAttackModifiers(creature, false)
    assert(mods.hasDisadvantage)
  }
}
