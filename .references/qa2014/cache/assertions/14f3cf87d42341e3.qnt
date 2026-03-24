// Source: https://rpg.stackexchange.com/q/191355
module _qa_14f3cf87d42341e3 {
  import dnd.* from "./dnd"

  // Elemental Adept's 1→2 treatment applies only to damage dice, not to Enhanced Bond's bonus d8
  run qa_elemental_adept_not_enhanced_bond = {
    // Fire Bolt: main damage die rolled a 1; Enhanced Bond d8 bonus also rolled a 1.
    // Elemental Adept bumps the damage die 1→2 (it IS a damage die of the spell).
    // Enhanced Bond roll is a modifier/bonus — NOT a damage die — so it stays at 1.
    val rawMainDie        = 1   // d10 fire bolt, rolled 1
    val enhancedBondRoll  = 1   // d8 bonus from Enhanced Bond, rolled 1
  
    // Elemental Adept: treat any 1 on a damage die as 2
    val afterElementalAdept = if (rawMainDie == 1) 2 else rawMainDie
  
    // Enhanced Bond is passed as the modifier argument — a bonus, not a die of the spell
    val total = normalDamage(afterElementalAdept, enhancedBondRoll)
  
    // Correct: 2 (bumped die) + 1 (unmodified bonus) = 3
    // Wrong (if Elemental Adept incorrectly applied to bonus too): 2 + 2 = 4
    assert(total == 3)
  }
}
