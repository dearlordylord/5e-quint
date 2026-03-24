// Source: https://rpg.stackexchange.com/q/136964
module _qa_67900acbbec10ce8 {
  import dnd.* from "./dnd"

  // Can I drag a grappled creature and release it after moving half of my speed, then move the remainder of my speed?
  run qa_grapple_release_movement_recalculation = {
    val creature = freshCreature(20)
    // Turn started while dragging a grappled creature (not two sizes smaller) → effectiveSpeed halved to 15
    val t0 = pStartTurn(TEST_CONFIG, creature, Unarmored, false, 0, true, false)
    // Move 15 feet (entire halved budget) at normal terrain cost
    val t1 = pUseMovement(t0, 15, 1)
    // Release grapple mid-turn: speed returns to 30; recalculate via PHB formula
    // movementLeft = newSpeed - distanceAlreadyMoved = 30 - 15 = 15
    val t2 = pSwitchSpeedType(t1, 30, 15)
    assert(
      t0.effectiveSpeed == 15     and  // halved while dragging
      t1.movementRemaining == 0   and  // all halved budget spent
      t2.effectiveSpeed == 30     and  // speed restored after release
      t2.movementRemaining == 15       // 15 feet remain
    )
  }
}
