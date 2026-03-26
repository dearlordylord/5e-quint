// Source: https://rpg.stackexchange.com/q/120771
module _qa_29b58b9f3233fc95 {
  import dnd.* from "./dnd"

  // Can I specify the timing "before ..." for my ready action?
  run qa_ready_action_consumes_action_and_arms_reaction = {
    // AReady uses the action and sets readiedAction; reaction remains available for post-trigger firing
    val s0 = freshCreature(10)
    val t0 = FRESH_TURN
    val t1 = pUseAction(t0, s0, AReady)
    assert(t1.actionsRemaining == 0 and t1.readiedAction and t1.reactionAvailable)
  }
  
  // Can I specify the timing "before ..." for my ready action? — reaction fires after trigger finishes
  run qa_reaction_fires_after_trigger_not_before = {
    // pUseReaction models post-trigger firing: consuming it marks reactionAvailable = false
    val t0 = FRESH_TURN.with("readiedAction", true)
    val t1 = pUseReaction(t0)
    assert(not(t1.reactionAvailable))
  }
  
  // Can I specify the timing "before ..." for my ready action? — single reaction per round
  run qa_reaction_single_use_per_round_no_before_window = {
    // A "before the trigger" firing followed by an "after" firing is impossible:
    // the reaction is exhausted on the first use and a second call is a no-op
    val t0 = FRESH_TURN.with("readiedAction", true)
    val t1 = pUseReaction(t0)
    val t2 = pUseReaction(t1)
    assert(t1 == t2 and not(t2.reactionAvailable))
  }
}
