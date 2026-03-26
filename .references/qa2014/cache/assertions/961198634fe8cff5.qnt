// Source: https://rpg.stackexchange.com/q/131181
module _qa_961198634fe8cff5 {
  import dnd.* from "./dnd"

  // How does the Fighter's possible bonus action from Action Surge work?
  // Action Surge grants one extra Action; it does NOT grant or consume a bonus action.
  run qa_action_surge_does_not_grant_bonus_action = {
    val creature = freshCreature(20)
    val t0 = FRESH_TURN
    // Simulate using the action (e.g. via Action Surge's extra action)
    val t1 = pUseAction(t0, creature, AAttack)
    // Action is consumed, but bonus action remains untouched
    assert(t1.actionsRemaining == 0 and not(t1.bonusActionUsed))
  }
  
  // "Possible" bonus action means bonus actions require a separate feature to exist at all.
  // Action and bonus action are fully independent resources on the same turn.
  run qa_bonus_action_is_independent_of_action = {
    val creature = freshCreature(20)
    val t0 = FRESH_TURN
    val t1 = pUseAction(t0, creature, AAttack)
    val t2 = pUseBonusAction(t1, creature)
    // Spending the bonus action is a distinct operation from spending the action
    assert(t2.actionsRemaining == 0 and t2.bonusActionUsed)
  }
}
