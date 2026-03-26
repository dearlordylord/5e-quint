// Source: https://rpg.stackexchange.com/q/100405
module _qa_51716e9f3aa3f4e2 {
  import dnd.* from "./dnd"

  // How does time pass in combat? — one action per 6-second turn; second action attempt is blocked
  run qa_one_action_per_six_second_turn = {
    val creature = freshCreature(20)
    val t1 = pUseAction(FRESH_TURN, creature, AAttack)
    val t2 = pUseAction(t1, creature, ACastSpell)
    assert(
      t1.actionsRemaining == 0
      and t2.actionsRemaining == 0
      // second pUseAction call is a no-op: state unchanged
      and t2.attackActionUsed
      and not(t1.bonusActionUsed)
    )
  }
  
  // How does time pass in combat? — Extra Attack represents multiple hits within the same 6-second round
  run qa_extra_attack_multiple_hits_per_round = {
    val creature = freshCreature(20)
    val configNoExtra = TEST_CONFIG.with("features", Set())
    val turnWithExtra  = pStartTurn(TEST_CONFIG,      creature, Unarmored, false, 0, false, false)
    val turnNoExtra    = pStartTurn(configNoExtra,    creature, Unarmored, false, 0, false, false)
    assert(
      // experienced combatant (FExtraAttack) gets 1 bonus hit in the 6-second window
      turnWithExtra.extraAttacksRemaining == 1
      // average combatant without training lands only one blow per round
      and turnNoExtra.extraAttacksRemaining == 0
    )
  }
  
  // How does time pass in combat? — spending Extra Attack decrements remaining uses within the round
  run qa_extra_attack_consumed_within_round = {
    val t0 = FRESH_TURN   // initialized with extraAttacksRemaining = 1 (from TEST_CONFIG/FExtraAttack)
    val t1 = pUseExtraAttack(t0)
    val t2 = pUseExtraAttack(t1)  // already spent; should be no-op
    assert(
      t1.extraAttacksRemaining == 0
      and t2.extraAttacksRemaining == 0
    )
  }
}
