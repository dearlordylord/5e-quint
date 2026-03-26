// Source: https://rpg.stackexchange.com/q/194795
module _qa_290dac078d2ce241 {
  import dnd.* from "./dnd"

  // Can a Temporally Shunted character use any remaining actions for its turn?
  run qa_temporal_shunt_no_remaining_actions = {
    val creature = freshCreature(20)
    // Mid-turn: Attack action used, bonus action (e.g. Curving Arrow) and reaction (e.g. Sentinel) still available
    val midTurn = FRESH_TURN
      .with("actionsRemaining", 0)
      .with("attackActionUsed", true)
    // Temporal Shunt effect: creature vanishes instantly — all remaining turn resources forfeit
    // "no time between failing the save and the beginning of their next turn"
    val shuntedTurn = midTurn
      .with("bonusActionUsed", true)
      .with("reactionAvailable", false)
      .with("movementRemaining", 0)
    // Attempting to use bonus action (Curving Arrow / Longtooth Shifter bite) is a no-op
    val afterBonusAttempt = pUseBonusAction(shuntedTurn, creature)
    // Attempting to use reaction (Sentinel) is also a no-op
    val afterReactionAttempt = pUseReaction(shuntedTurn)
    // At the start of their next turn the creature reappears with full action economy restored
    val nextTurn = pStartTurn(TEST_CONFIG, creature, Unarmored, false, 0, false, false)
    assert(
      afterBonusAttempt == shuntedTurn
      and afterReactionAttempt == shuntedTurn
      and nextTurn.bonusActionUsed == false
      and nextTurn.actionsRemaining > 0
      and nextTurn.reactionAvailable == true
      and nextTurn.movementRemaining > 0
    )
  }
}
