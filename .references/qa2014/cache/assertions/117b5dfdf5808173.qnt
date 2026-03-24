// Source: https://rpg.stackexchange.com/q/94313
module _qa_117b5dfdf5808173 {
  import dnd.* from "./dnd"

  // What happens to an incapacitated flying mounted creature?
  run qa_hypnotic_pattern_mount_speed0_no_hover_falls = {
    // Scenario 1: mount charmed → speed 0, no hover, no magic → falls (PHB 191)
    val mount = pApplyCondition(freshCreature(40), CIncapacitated)
    assert(pFlyingCreatureFalls(mount, 0, false, false) == true)
  }
  
  // What happens to an incapacitated flying mounted creature?
  run qa_hypnotic_pattern_mount_speed0_hover_stays = {
    // Scenario 1: mount charmed → speed 0, but has hover ability → does NOT fall
    val mount = pApplyCondition(freshCreature(40), CIncapacitated)
    assert(pFlyingCreatureFalls(mount, 0, true, false) == false)
  }
  
  // What happens to an incapacitated flying mounted creature?
  run qa_hypnotic_pattern_mount_speed0_magic_aloft_stays = {
    // Scenario 1: mount charmed → speed 0, held aloft by magic (fly spell) → does NOT fall
    val mount = pApplyCondition(freshCreature(40), CIncapacitated)
    assert(pFlyingCreatureFalls(mount, 0, false, true) == false)
  }
  
  // What happens to an incapacitated flying mounted creature?
  run qa_hypnotic_pattern_both_incapacitated_mount_falls = {
    // Scenario 3: both charmed → mount speed 0, no hover, no magic → mount falls;
    // rider is also incapacitated and cannot act
    val mount = pApplyCondition(freshCreature(40), CIncapacitated)
    val rider = pApplyCondition(freshCreature(30), CIncapacitated)
    assert(
      pFlyingCreatureFalls(mount, 0, false, false) == true
      and isIncapacitated(rider) == true
      and not(pCanAct(rider))
    )
  }
  
  // What happens to an incapacitated flying mounted creature?
  run qa_rider_incapacitated_cannot_act = {
    // Scenario 2: rider charmed → rider is incapacitated, cannot take actions
    val rider = pApplyCondition(freshCreature(30), CIncapacitated)
    assert(isIncapacitated(rider) and not(pCanAct(rider)))
  }
}
