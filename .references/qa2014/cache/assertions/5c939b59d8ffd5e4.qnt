// Source: https://rpg.stackexchange.com/q/167147
module _qa_5c939b59d8ffd5e4 {
  import dnd.* from "./dnd"

  // Is there a name for a single saving throw with multiple DCs?
  // Accepted answer: DMG "Degrees of Failure" — roll 16+ no effect, 10-15 fire damage, 9- fire + exhaustion
  
  run qa_degrees_of_failure_high_dc_no_effect = {
    // Roll meets DC 16 (highest DC) → no effect
    val roll = 16
    val abilityMod = 0
    val profBonus = 3
    val fireDmg = 4
    val creature = freshCreature(30)
    val meetsHighDC = saveSucceeds(roll, abilityMod, false, profBonus, 0, 16)
    val meetsLowDC  = saveSucceeds(roll, abilityMod, false, profBonus, 0, 10)
    val result = if (meetsHighDC) creature
                 else if (meetsLowDC)
                   pTakeDamage(creature, fireDmg, Fire, Set(), Set(), Set(), false)
                 else
                   pAddExhaustion(pTakeDamage(creature, fireDmg, Fire, Set(), Set(), Set(), false), 1)
    assert(meetsHighDC and result.hp == 30 and result.exhaustion == 0)
  }
  
  run qa_degrees_of_failure_partial_fire_only = {
    // Roll meets DC 10 but not DC 16 → fire damage, no exhaustion
    val roll = 12
    val abilityMod = 0
    val profBonus = 3
    val fireDmg = 4
    val creature = freshCreature(30)
    val meetsHighDC = saveSucceeds(roll, abilityMod, false, profBonus, 0, 16)
    val meetsLowDC  = saveSucceeds(roll, abilityMod, false, profBonus, 0, 10)
    val result = if (meetsHighDC) creature
                 else if (meetsLowDC)
                   pTakeDamage(creature, fireDmg, Fire, Set(), Set(), Set(), false)
                 else
                   pAddExhaustion(pTakeDamage(creature, fireDmg, Fire, Set(), Set(), Set(), false), 1)
    assert(not(meetsHighDC) and meetsLowDC and result.hp == 26 and result.exhaustion == 0)
  }
  
  run qa_degrees_of_failure_full_fire_and_exhaustion = {
    // Roll fails DC 10 (lowest DC) → fire damage + 1 exhaustion level
    val roll = 5
    val abilityMod = 0
    val profBonus = 3
    val fireDmg = 4
    val creature = freshCreature(30)
    val meetsHighDC = saveSucceeds(roll, abilityMod, false, profBonus, 0, 16)
    val meetsLowDC  = saveSucceeds(roll, abilityMod, false, profBonus, 0, 10)
    val result = if (meetsHighDC) creature
                 else if (meetsLowDC)
                   pTakeDamage(creature, fireDmg, Fire, Set(), Set(), Set(), false)
                 else
                   pAddExhaustion(pTakeDamage(creature, fireDmg, Fire, Set(), Set(), Set(), false), 1)
    assert(not(meetsHighDC) and not(meetsLowDC) and result.hp == 26 and result.exhaustion == 1)
  }
}
