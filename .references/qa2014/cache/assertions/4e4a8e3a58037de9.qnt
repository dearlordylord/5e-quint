// Source: https://rpg.stackexchange.com/q/132490
module _qa_4e4a8e3a58037de9 {
  import dnd.* from "./dnd"

  // Opportunity Attack, Ready Action, & Eldritch Blast/Repelling Blast: readied action fires after trigger, consuming reaction
  run qa_readied_action_fires_after_trigger = {
    val creature = freshCreature(20)
    val turn = FRESH_TURN
    // Taking the Ready action spends your action and sets the readiedAction flag,
    // but does NOT yet consume your reaction — the reaction is held in reserve
    val turnAfterReady = pUseAction(turn, creature, AReady)
    // The trigger (berserker attacks the druid) completes first — only then does
    // the readied action fire, spending the reaction (DMG p.252: reaction occurs
    // after its trigger finishes when timing is unspecified)
    val turnAfterFiring = pUseReaction(turnAfterReady)
    assert(and {
      turnAfterReady.actionUsed == true,
      turnAfterReady.readiedAction == true,
      // Reaction still available immediately after readying — trigger hasn't fired yet
      turnAfterReady.reactionAvailable == true,
      // Reaction spent only when the readied action is released (after trigger completes)
      turnAfterFiring.reactionAvailable == false,
    })
  }
}
