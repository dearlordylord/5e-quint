// Source: https://rpg.stackexchange.com/q/191902
module _qa_85c53218148f418d {
  import dnd.* from "./dnd"

  // What are the mechanical effects of odd numbers for ability scores in monster stat blocks?
  // Raw STR score (not modifier) drives carrying capacity: STR 11 > STR 10 despite identical modifier
  run qa_odd_str_carrying_capacity_differs = {
    val mod10 = abilityModifier(10)
    val mod11 = abilityModifier(11)
    val cap10 = carryingCapacity(10, Medium)
    val cap11 = carryingCapacity(11, Medium)
    assert(
      mod10 == mod11        // both +0 modifier
      and cap11 > cap10     // but 165 lbs vs 150 lbs
      and cap10 == 150
      and cap11 == 165
    )
  }
  
  // What are the mechanical effects of odd numbers for ability scores in monster stat blocks?
  // Raw STR score drives long jump distance: STR 11 jumps 1 ft farther than STR 10 despite same modifier
  run qa_odd_str_long_jump_differs = {
    val mod10 = abilityModifier(10)
    val mod11 = abilityModifier(11)
    val jump10 = pLongJumpDistance(10, true)
    val jump11 = pLongJumpDistance(11, true)
    assert(
      mod10 == mod11        // both +0 modifier
      and jump11 > jump10   // but 11 ft vs 10 ft running jump
      and jump10 == 10
      and jump11 == 11
    )
  }
  
  // What are the mechanical effects of odd numbers for ability scores in monster stat blocks?
  // Heavy armor STR requirement uses raw score: STR 12 vs 13 same modifier (+1) but different speed penalty
  run qa_odd_str_armor_requirement_threshold = {
    val mod12 = abilityModifier(12)
    val mod13 = abilityModifier(13)
    val penalty12 = armorSpeedPenalty(WearingArmor(CHAIN_MAIL), 12)
    val penalty13 = armorSpeedPenalty(WearingArmor(CHAIN_MAIL), 13)
    assert(
      mod12 == mod13        // both +1 modifier
      and penalty12 == 10   // STR 12 fails chain mail's requirement of 13 → -10 ft speed
      and penalty13 == 0    // STR 13 meets requirement → no penalty
    )
  }
  
  // What are the mechanical effects of odd numbers for ability scores in monster stat blocks?
  // SPLINT armor (req 15): STR 14 vs 15 share modifier (+2) but differ on speed penalty
  run qa_odd_str_splint_armor_threshold = {
    val mod14 = abilityModifier(14)
    val mod15 = abilityModifier(15)
    val penalty14 = armorSpeedPenalty(WearingArmor(SPLINT), 14)
    val penalty15 = armorSpeedPenalty(WearingArmor(SPLINT), 15)
    assert(
      mod14 == mod15        // both +2 modifier
      and penalty14 == 10   // STR 14 fails splint's requirement of 15 → -10 ft speed
      and penalty15 == 0    // STR 15 meets requirement → no penalty
    )
  }
}
