// Source: https://rpg.stackexchange.com/q/94850
module _qa_65724624a14070f1 {
  import dnd.* from "./dnd"

  // When an ability lets you reduce a creature's speed to 0, does it include fly/swim/climb speed?
  run qa_speed_zero_flying_creature_falls = {
    val creature = freshCreature(50)
    // PHB p.191: flying creature with speed reduced to 0 falls (no hover, not held aloft by magic)
    assert(pFlyingCreatureFalls(creature, 0, false, false) == true)
  }
  
  // When an ability lets you reduce a creature's speed to 0, does it include fly/swim/climb speed?
  run qa_speed_zero_hover_prevents_fall = {
    val creature = freshCreature(50)
    // Exception: hover ability exempts creature from falling even when speed is 0
    assert(pFlyingCreatureFalls(creature, 0, true, false) == false)
  }
  
  // When an ability lets you reduce a creature's speed to 0, does it include fly/swim/climb speed?
  run qa_speed_zero_magic_aloft_prevents_fall = {
    val creature = freshCreature(50)
    // Exception: held aloft by magic (e.g. fly spell) also exempts from falling at speed 0
    assert(pFlyingCreatureFalls(creature, 0, false, true) == false)
  }
  
  // When an ability lets you reduce a creature's speed to 0, does it include fly/swim/climb speed?
  run qa_speed_zero_cannot_switch_to_fly_speed = {
    // PHB p.190: switching speeds subtracts distance already moved from new speed
    // If all speeds are reduced to 0, switching to fly speed (also 0) yields newRemaining = 0 - 0 = 0
    val t = FRESH_TURN.with("movementRemaining", 0).with("effectiveSpeed", 0)
    val t2 = pSwitchSpeedType(t, 0, 0)
    // newRemaining <= 0 → returns unchanged, fly speed unavailable
    assert(t2.movementRemaining == 0 and t2.effectiveSpeed == 0)
  }
  
  // When an ability lets you reduce a creature's speed to 0, does it include fly/swim/climb speed?
  run qa_speed_zero_no_movement_spendable = {
    // With movement reduced to 0, pUseMovement refuses any spend (climb, swim, etc. all depend on speed)
    val t = FRESH_TURN.with("movementRemaining", 0).with("effectiveSpeed", 0)
    val t2 = pUseMovement(t, 5, 1)
    assert(t2.movementRemaining == 0)
  }
}
