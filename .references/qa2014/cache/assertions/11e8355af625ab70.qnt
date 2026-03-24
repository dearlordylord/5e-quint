// Source: https://rpg.stackexchange.com/q/156497
module _qa_11e8355af625ab70 {
  import dnd.* from "./dnd"

  // Is there a scenario where a gnoll flesh gnawer can move at least 45 feet during its Rampage bonus action?
  run qa_rampage_half_speed_after_sudden_rush = {
    // Sudden Rush raises speed by 60 (30→90); Rampage bonus action moves half current speed = 45 ft
    val creature = freshCreature(20)
    // callerSpeedModifier=60 models Sudden Rush: +60 ft speed for the turn
    val t0 = pStartTurn(TEST_CONFIG, creature, Unarmored, false, 60, false, false)
    // action already spent on Sudden Rush
    val t1 = pUseAction(t0, creature, AAttack)
    // Rampage: consume bonus action
    val t2 = pUseBonusAction(t1, creature)
    // Rampage movement = half of *current* effectiveSpeed (90), not base speed (30)
    val rampageMove = t0.effectiveSpeed / 2
    val t3 = pUseMovement(t2, rampageMove, 1)
    assert(
      t0.effectiveSpeed == 90
      and rampageMove == 45
      and t3.movementRemaining == t2.movementRemaining - 45
      and t3.bonusActionUsed
    )
  }
}
