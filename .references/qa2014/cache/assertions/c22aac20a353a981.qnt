// Source: https://rpg.stackexchange.com/q/189263
module _qa_c22aac20a353a981 {
  import dnd.* from "./dnd"

  // "What is the point of the Grasping Undergrowth effect of Druid Grove?"
  // Undergrowth creates difficult terrain (1 extra foot/ft) even where wind clears fog
  run qa_undergrowth_difficult_terrain_costs_extra_foot = {
    val normalCost = pMovementCost(false, false, false, false, false)
    val undergrowthCost = pMovementCost(true, false, false, false, false)
    assert(normalCost == 1 and undergrowthCost == 2)
  }
  
  // "What is the point of the Grasping Undergrowth effect of Druid Grove?"
  // Wind clears fog (no difficult terrain) but undergrowth persists: undergrowth area costs more
  run qa_undergrowth_outlasts_fog_in_wind_area = {
    // fog-only area with wind = normal terrain; undergrowth area with wind = difficult terrain
    val fogClearedByWind = pMovementCost(false, false, false, false, false)
    val undergrowthRemainsAfterWind = pMovementCost(true, false, false, false, false)
    assert(undergrowthRemainsAfterWind > fogClearedByWind)
  }
  
  // "What is the point of the Grasping Undergrowth effect of Druid Grove?"
  // Restrained by entangling plants: creature speed drops to 0 at start of turn
  run qa_undergrowth_restrained_speed_zero = {
    val creature = freshCreature(20)
    val restrained = pApplyCondition(creature, CRestrained)
    val t = pStartTurn(TEST_CONFIG, restrained, Unarmored, false, 0, false, false)
    assert(t.movementRemaining == 0)
  }
  
  // "What is the point of the Grasping Undergrowth effect of Druid Grove?"
  // Restrained creature has disadvantage on attacks and attackers have advantage against it
  run qa_undergrowth_restrained_combat_penalties = {
    val creature = freshCreature(20)
    val restrained = pApplyCondition(creature, CRestrained)
    val selfMods = pOwnAttackModifiers(restrained, false)
    val defMods = pDefenseModifiers(restrained, true)
    assert(selfMods.hasDisadvantage and defMods.attackerAdvantage)
  }
}
