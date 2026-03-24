// Source: https://rpg.stackexchange.com/q/150338
module _qa_d3f90d55ba7b754a {
  import dnd.* from "./dnd"

  // Can a Horncaller control a Druid who is using Wild Shape? — forced reaction consumes the beast's available reaction
  run qa_horncaller_forced_reaction_consumes_available = {
    // Wild Shape replaces creature statistics (including type); druid is a beast.
    // Horncaller "One with the Worldsoul" forces the beast to use its reaction.
    val t0 = FRESH_TURN // reactionAvailable: true at turn start
    val t1 = pUseReaction(t0)
    assert(not(t1.reactionAvailable))
  }
  
  // Can a Horncaller control a Druid who is using Wild Shape? — reaction already spent cannot be forced again
  run qa_horncaller_forced_reaction_idempotent_once_spent = {
    val t0 = FRESH_TURN
    val t1 = pUseReaction(t0)       // Horncaller forces the beast's reaction
    val t2 = pUseReaction(t1)       // second attempt has no effect
    assert(not(t2.reactionAvailable) and t2 == t1)
  }
  
  // Can a Horncaller control a Druid who is using Wild Shape? — reaction resets at start of own next turn
  run qa_horncaller_forced_reaction_resets_on_next_turn = {
    val creature = freshCreature(20)
    // Reaction consumed mid-round (Horncaller used it)
    val tSpent = FRESH_TURN.with("reactionAvailable", false)
    // On the druid's own next turn pStartTurn resets reaction (not surprised)
    val tNew = pStartTurn(TEST_CONFIG, creature, Unarmored, false, 0, false, false)
    assert(tNew.reactionAvailable)
  }
}
