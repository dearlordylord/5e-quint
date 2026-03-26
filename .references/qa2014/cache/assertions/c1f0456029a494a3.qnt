// Source: https://rpg.stackexchange.com/q/208239
module _qa_c1f0456029a494a3 {
  import dnd.* from "./dnd"

  // How long does it take to set up a Hunting Trap? — entire setup including chain affixing consumes one action (PHB p. 152)
  run qa_hunting_trap_set_takes_one_action = {
    val creature = freshCreature(20)
    val t1 = pUseAction(FRESH_TURN, creature, AUseObject)
    // Setting the trap (including affixing the heavy chain) is fully resolved by the single Use an Object action
    assert(t1.actionsRemaining == 0 and FRESH_TURN.actionsRemaining > 0)
  }
  
  // How long does it take to set up a Hunting Trap? — creature failing DC 13 DEX save takes piercing damage and is movement-restricted
  run qa_hunting_trap_effect_fail_save = {
    val creature = freshCreature(20)
    // d20=5, DEX mod +1 → total 6 < DC 13 → save fails
    val saveFailed = not(saveSucceeds(5, 1, false, 0, 0, 13))
    // Take 1d4=3 piercing damage
    val afterDmg = pTakeDamage(creature, 3, Piercing, Set(), Set(), Set(), false)
    // Movement limited by chain → modelled as restrained
    val trapped = pApplyCondition(afterDmg, CRestrained)
    assert(saveFailed and trapped.restrained == true and trapped.hp == 17)
  }
  
  // How long does it take to set up a Hunting Trap? — creature passing DC 13 DEX save takes no damage and is not movement-restricted
  run qa_hunting_trap_effect_pass_save = {
    val creature = freshCreature(20)
    // d20=15, DEX mod +2 → total 17 >= DC 13 → save succeeds
    val savePassed = saveSucceeds(15, 2, false, 0, 0, 13)
    // No damage, no condition applied on success
    assert(savePassed and creature.restrained == false and creature.hp == creature.maxHp)
  }
}
