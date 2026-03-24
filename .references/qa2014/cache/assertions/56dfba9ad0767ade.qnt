// Source: https://rpg.stackexchange.com/q/124331
module _qa_56dfba9ad0767ade {
  import dnd.* from "./dnd"

  // How can one make multiple opportunity attacks during one round?
  run qa_one_reaction_limits_oa_per_round = {
    // Default: single reaction means at most one OA per round
    val t0 = FRESH_TURN
    val t1 = pUseReaction(t0)
    // After spending the reaction on a first OA, no reaction remains for a second
    assert(not(t1.reactionAvailable))
  }
  
  // How can one make multiple opportunity attacks during one round?
  run qa_reaction_expended_is_not_restored_by_repeat_use = {
    // Spending an already-spent reaction is a no-op; still unavailable
    val t0 = FRESH_TURN
    val t1 = pUseReaction(t0)
    val t2 = pUseReaction(t1)
    assert(not(t2.reactionAvailable))
  }
  
  // How can one make multiple opportunity attacks during one round?
  run qa_reaction_resets_at_start_of_own_turn = {
    // After a surprised turn ends, reaction becomes available again on the next turn,
    // modeling the per-round reset that makes the single-reaction limit meaningful
    val t0 = FRESH_TURN.with("reactionAvailable", false).with("surprised", true)
    val t1 = pEndSurpriseTurn(t0)
    assert(t1.reactionAvailable)
  }
}
