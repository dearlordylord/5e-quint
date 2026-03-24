// Source: https://rpg.stackexchange.com/q/214536
module _qa_864a78dae7cc76f5 {
  import dnd.* from "./dnd"

  // Does the 10' speed penalty from the Slasher feat's Hamstring feature stack with the Weapon Mastery Slow?
  run qa_slasher_and_weapon_mastery_speed_reductions_stack = {
    val creature = freshCreature(20)
    // Accepted answer: different sources stack additively — no rule caps them.
    // Slasher Hamstring: -10 ft; Weapon Mastery Slow: -10 ft → combined callerSpeedModifier = -20.
    // TEST_CONFIG base Walk speed = 30.
    val tOneSource  = pStartTurn(TEST_CONFIG, creature, Unarmored, false, -10, false, false)
    val tBothStacked = pStartTurn(TEST_CONFIG, creature, Unarmored, false, -20, false, false)
    assert(
      tOneSource.effectiveSpeed  == 20 and
      tBothStacked.effectiveSpeed == 10
    )
  }
}
