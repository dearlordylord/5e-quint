// Source: https://rpg.stackexchange.com/q/154283
module _qa_df19d9a39d74838a {
  import dnd.* from "./dnd"

  // How does attacking during a conversation affect initiative? — surprised guard loses first turn
  run qa_surprised_guard_cannot_act_first_turn = {
    val guardState = freshCreature(30)
    val surprisedTurn = pStartTurn(TEST_CONFIG, guardState, Unarmored, true, 0, false, false)
    assert(
      surprisedTurn.actionUsed == true and
      surprisedTurn.bonusActionUsed == true and
      surprisedTurn.movementRemaining == 0 and
      surprisedTurn.reactionAvailable == false
    )
  }
  
  // How does attacking during a conversation affect initiative? — rogue (non-surprised) can use Attack action on their turn
  run qa_non_surprised_attacker_uses_attack_on_turn = {
    val rogueState = freshCreature(20)
    val rogueTurn = pStartTurn(TEST_CONFIG, rogueState, Unarmored, false, 0, false, false)
    val afterAttack = pUseAction(rogueTurn, rogueState, AAttack)
    assert(
      rogueTurn.actionUsed == false and
      afterAttack.actionUsed == true and
      afterAttack.attackActionUsed == true
    )
  }
  
  // How does attacking during a conversation affect initiative? — surprised creature regains reactions after their first turn ends
  run qa_surprise_turn_ends_restores_reaction = {
    val guardState = freshCreature(30)
    val surprisedTurn = pStartTurn(TEST_CONFIG, guardState, Unarmored, true, 0, false, false)
    val afterSurpriseTurn = pEndSurpriseTurn(surprisedTurn)
    assert(
      surprisedTurn.reactionAvailable == false and
      afterSurpriseTurn.reactionAvailable == true and
      afterSurpriseTurn.surprised == false
    )
  }
}
