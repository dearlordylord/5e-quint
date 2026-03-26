// Source: https://rpg.stackexchange.com/q/159725
module _qa_651d8cc97e71b4d0 {
  import dnd.* from "./dnd"

  // Exchanging control of a mount: second rider spends half their movement to take control (PHB Ch9)
  run qa_new_rider_mount_costs_half_speed = {
    val afterMount = pMountOrDismount(FRESH_TURN)
    assert(afterMount.movementRemaining == FRESH_TURN.movementRemaining - FRESH_TURN.effectiveSpeed / 2)
  }
  
  // Exchanging control of a mount: cannot take control if rider's speed is 0 (PHB Ch9)
  run qa_cannot_take_control_at_zero_speed = {
    val zeroTurn = FRESH_TURN.with("effectiveSpeed", 0).with("movementRemaining", 0)
    assert(pMountOrDismount(zeroTurn) == zeroTurn)
  }
  
  // Exchanging control of a mount: cannot take control if remaining movement less than half speed (PHB Ch9)
  run qa_cannot_take_control_insufficient_movement = {
    // effectiveSpeed=30 so cost=15, but only 10ft remaining
    val lowMoveTurn = FRESH_TURN.with("movementRemaining", 10).with("effectiveSpeed", 30)
    assert(pMountOrDismount(lowMoveTurn) == lowMoveTurn)
  }
  
  // Exchanging control of a mount: mount's new initiative turn gives full fresh action economy (PHB Ch9)
  run qa_mount_fresh_turn_grants_full_mab = {
    val mountCreature = freshCreature(50).with("hitDiceRemaining", 3)
    // Model mount regaining its full MAB (action, bonus action, movement) on its next turn
    val mountTurn = pStartTurn(TEST_CONFIG, mountCreature, Unarmored, false, 0, false, false)
    assert(
      mountTurn.actionsRemaining > 0 and
      not(mountTurn.bonusActionUsed) and
      mountTurn.movementRemaining == TEST_CONFIG.speeds.get(Walk)
    )
  }
}
