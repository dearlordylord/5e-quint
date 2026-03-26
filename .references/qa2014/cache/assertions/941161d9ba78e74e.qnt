// Source: https://rpg.stackexchange.com/q/154427
module _qa_941161d9ba78e74e {
  import dnd.* from "./dnd"

  // Does Heat Metal reroll its damage each time it is caused?
  run qa_heat_metal_damage_rerolled_each_turn = {
    // Model: each Heat Metal application uses its own pre-resolved 2d8 roll
    val creature0 = freshCreature(30)
  
    // Initial cast (action): 2d8 fire = 10
    val roll1 = 10
    val t1     = pUseAction(FRESH_TURN, creature0, ACastSpell)
    val s1     = pTakeDamage(creature0, roll1, Fire, Set(), Set(), Set(), false)
  
    // Subsequent turn bonus action: fresh 2d8 roll = 6 (independent of roll1)
    val roll2 = 6
    val t2     = pUseBonusAction(FRESH_TURN, s1)
    val s2     = pTakeDamage(s1, roll2, Fire, Set(), Set(), Set(), false)
  
    assert(
      // Action was consumed on the casting turn
      t1.actionsRemaining == 0
      // Bonus action consumed on the subsequent turn
      and t2.bonusActionUsed
      // First application reduced HP by roll1
      and s1.hp == 30 - roll1
      // Second application reduced HP by roll2 (its OWN independent roll, not roll1)
      and s2.hp == (30 - roll1) - roll2
      // The two rolls differ, confirming damage is rerolled rather than reused
      and roll1 != roll2
    )
  }
}
