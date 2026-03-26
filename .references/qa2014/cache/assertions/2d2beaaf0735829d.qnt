// Source: https://rpg.stackexchange.com/q/145251
module _qa_2d2beaaf0735829d {
  import dnd.* from "./dnd"

  // Does surprise arrest existing movement? — surprised creatures get 0 movement on their first turn (PHB p.189)
  run qa_surprise_arrests_movement = {
    // Creature has a walk speed of 30 ft per TEST_CONFIG, yet surprise zeroes it out
    val creature = freshCreature(30)
    val t = pStartTurn(TEST_CONFIG, creature, Unarmored, true, 0, false, false)
    assert(
      t.movementRemaining == 0
      and t.actionsRemaining == 0      == true
      and t.bonusActionUsed == true
      and t.reactionAvailable == false
    )
  }
  
  // Does surprise arrest existing movement? — non-surprised creature with same config gets full movement
  run qa_no_surprise_grants_movement = {
    val creature = freshCreature(30)
    val t = pStartTurn(TEST_CONFIG, creature, Unarmored, false, 0, false, false)
    assert(
      t.movementRemaining == 30
      and t.actionsRemaining == 0      == false
      and t.bonusActionUsed == false
      and t.reactionAvailable == true
    )
  }
  
  // Does surprise arrest existing movement? — reaction becomes available only after surprised turn ends
  run qa_surprise_reaction_restored_after_turn = {
    val creature = freshCreature(30)
    val t0 = pStartTurn(TEST_CONFIG, creature, Unarmored, true, 0, false, false)
    val t1 = pEndSurpriseTurn(t0)
    assert(
      t0.reactionAvailable == false
      and t1.reactionAvailable == true
      and t1.surprised       == false
    )
  }
}
