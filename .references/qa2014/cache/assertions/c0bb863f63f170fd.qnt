// Source: https://rpg.stackexchange.com/q/132956
module _qa_c0bb863f63f170fd {
  import dnd.* from "./dnd"

  // Can you react to an opportunity attack?
  run qa_reaction_once_per_round = {
    // Using a reaction (e.g. Shield on OA hit) consumes it;
    // a second reaction attempt in the same round is blocked.
    val t0 = FRESH_TURN
    val t1 = pUseReaction(t0)  // reaction used (Shield triggered by OA hit)
    val t2 = pUseReaction(t1)  // second reaction attempt — must be no-op
    assert(
      t0.reactionAvailable == true
      and t1.reactionAvailable == false
      and t2.reactionAvailable == false
      and t1 == t2
    )
  }
  
  // Can you react to an opportunity attack? — reaction resets at start of next turn
  run qa_reaction_resets_on_next_turn = {
    // After spending a reaction this round (Shield on OA hit), it is restored
    // at the start of the reacting creature's own next turn (non-surprised).
    val s  = freshCreature(20)
    val t0 = FRESH_TURN
    val t1 = pUseReaction(t0)  // reaction consumed (e.g. Shield vs OA)
    val t2 = pStartTurn(TEST_CONFIG, s, Unarmored, false, 0, false, false)
    assert(
      t1.reactionAvailable == false
      and t2.reactionAvailable == true
    )
  }
}
