// Source: https://rpg.stackexchange.com/q/109841
module _qa_8549f6c07a29a979 {
  import dnd.* from "./dnd"

  // Is there a better technique to handle the lag between cause and effect?
  // Core mechanic of accepted answer: creature that already used its action can still
  // use its Reaction (pUseReaction only checks reactionAvailable, not actionUsed).
  run qa_reaction_usable_after_own_action = {
    val turnAfterAction = FRESH_TURN.with("actionUsed", true)
    val t2 = pUseReaction(turnAfterAction)
    assert(
      turnAfterAction.reactionAvailable == true
      and t2.reactionAvailable == false
    )
  }
  
  // Is there a better technique to handle the lag between cause and effect?
  // Reaction is consumed on use: can only be spent once per round, preventing
  // double-dipping (creature can't both react AND act on the same turn).
  run qa_reaction_consumed_after_use = {
    val t1 = pUseReaction(FRESH_TURN)
    val t2 = pUseReaction(t1)
    assert(
      t1.reactionAvailable == false
      and t2.reactionAvailable == false
    )
  }
  
  // Is there a better technique to handle the lag between cause and effect?
  // Reaction resets at the start of the creature's own next turn, restoring the
  // option to react to the next round's spell effects.
  run qa_reaction_resets_at_start_of_own_turn = {
    val s = freshCreature(20)
    val newTurn = pStartTurn(TEST_CONFIG, s, Unarmored, false, 0, false, false)
    assert(newTurn.reactionAvailable == true)
  }
  
  // Is there a better technique to handle the lag between cause and effect?
  // Releasing a grapple (the Command/"drop him" scenario) requires no action — the
  // grappler can release via pReleaseGrapple, freeing the slot for the Reaction
  // narrative: release triggered immediately by spell failure.
  run qa_release_grapple_no_action_required = {
    val grappled = freshCreature(20).with("grappled", true)
    val freed = pReleaseGrapple(grappled)
    // Release costs no action/bonus/reaction on turn state
    assert(freed.grappled == false and FRESH_TURN.actionUsed == false)
  }
}
