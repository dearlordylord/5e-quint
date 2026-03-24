// Source: https://rpg.stackexchange.com/q/91161
module _qa_4d38d15b9159e6d4 {
  import dnd.* from "./dnd"

  // Can a creature swap places with another willing creature on their turn?
  run qa_swap_positions_via_ready_action = {
    val creature = freshCreature(20)
    // A moves through B's space (5 ft, normal cost) — movement is consumed on A's turn
    val a_turn_after_move = pUseMovement(FRESH_TURN, 5, 1)
    // B readied an action on B's prior turn (trigger: A enters B's space) to move away
    val b_turn_after_ready = pUseAction(FRESH_TURN, creature, AReady)
    assert(
      // A's movement budget is reduced by moving into B's space
      a_turn_after_move.movementRemaining == FRESH_TURN.movementRemaining - 5
      // B's action is consumed — the Ready action is the cost of the swap per accepted answer
      and b_turn_after_ready.actionUsed == true
      and b_turn_after_ready.readiedAction == true
      // B's bonus action is NOT spent — only the action is consumed
      and b_turn_after_ready.bonusActionUsed == false
      // B's movement budget on B's own turn is unaffected by choosing Ready
      and b_turn_after_ready.movementRemaining == FRESH_TURN.movementRemaining
      // A second action attempt by B is silently ignored (action already spent)
      and pUseAction(b_turn_after_ready, creature, ADash).actionUsed == true
      and pUseAction(b_turn_after_ready, creature, ADash).attackActionUsed == false
    )
  }
}
