// Source: https://rpg.stackexchange.com/q/94666
module _qa_40b9ff0ab2cf21ac {
  import dnd.* from "./dnd"

  // Is a Raging Barbarian immune to 1-damage attacks?
  run qa_resistance_rounds_1_damage_to_zero = {
    val creature = freshCreature(20)
    val result = pTakeDamage(creature, 1, Bludgeoning, Set(Bludgeoning), Set(), Set(), false)
    // 1 / 2 = 0 (floor); no damage minimum — HP unchanged
    assert(result.hp == 20)
  }
  
  // Is a Raging Barbarian immune to 1-damage attacks? (resistance halves but does not bottom out at 1)
  run qa_resistance_two_damage_becomes_one = {
    val creature = freshCreature(20)
    val result = pTakeDamage(creature, 2, Bludgeoning, Set(Bludgeoning), Set(), Set(), false)
    // 2 / 2 = 1; confirming resistance reduces and does not clamp at original value
    assert(result.hp == 19)
  }
  
  // Is a Raging Barbarian immune to 1-damage attacks? (unreduced 1 damage still lands)
  run qa_no_resistance_one_damage_lands = {
    val creature = freshCreature(20)
    val result = pTakeDamage(creature, 1, Bludgeoning, Set(), Set(), Set(), false)
    // Without resistance, 1 damage goes through normally
    assert(result.hp == 19)
  }
}
