// Source: https://rpg.stackexchange.com/q/177700
module _qa_49f6d7b909d07d16 {
  import dnd.* from "./dnd"

  // Wild Companion: casting find familiar costs one action (not 1 hour) per specific-beats-general rule
  run qa_wild_companion_find_familiar_as_action = {
    val creature = freshCreature(20)
    val t0 = FRESH_TURN
    // Wild Companion says "as an action ... cast find familiar" — one action, resolved in same turn
    val t1 = pUseAction(t0, creature, ACastSpell)
    assert(
      // The spell cast consumes exactly the action — done within the turn
      t1.actionsRemaining == 0
      // Bonus action is NOT consumed (it was just an action, not a bonus action cast)
      and t1.bonusActionUsed == false
      // Movement is unaffected — the action completes immediately, not over hours
      and t1.movementRemaining == t0.movementRemaining
      // No other turn resources are drained
      and t1.reactionAvailable == true
      and t1.extraAttacksRemaining == t0.extraAttacksRemaining
    )
  }
}
