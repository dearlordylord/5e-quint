// Source: https://rpg.stackexchange.com/q/48729
module _qa_a7fa87f809a95a2b {
  import dnd.* from "./dnd"

  // How many Actions are allowed per round in DND 5e for a 2nd level Rogue
  run qa_action_and_bonus_action_limit_per_round = {
    // Attack (action) + TWF off-hand (bonus action) exhausts both slots;
    // subsequent Disengage attempt via pUseAction is a no-op
    val creature = freshCreature(20)
    val t0 = FRESH_TURN
    val t1 = pUseAction(t0, creature, AAttack)
    val t2 = pUseBonusAction(t1, creature)
    val t3 = pUseAction(t2, creature, ADisengage)
    assert(
      t1.actionsRemaining == 0
      and t2.bonusActionUsed == true
      // Disengage was not granted — action already consumed
      and t3.disengaged == false
      and t3.actionsRemaining == 0
    )
  }
  
  // How many Actions are allowed per round in DND 5e for a 2nd level Rogue
  run qa_cunning_action_blocked_when_bonus_already_spent = {
    // Cunning Action (Rogue): Disengage as a bonus action.
    // If the bonus action was already spent on TWF off-hand, a second bonus action is a no-op.
    val creature = freshCreature(20)
    val t0 = FRESH_TURN
    val t1 = pUseAction(t0, creature, AAttack)
    val t2 = pUseBonusAction(t1, creature)
    // Attempt Cunning Action Disengage (bonus action) — should be a no-op
    val t3 = pUseBonusAction(t2, creature)
    assert(t3 == t2)
  }
  
  // How many Actions are allowed per round in DND 5e for a 2nd level Rogue
  run qa_movement_is_independent_of_action_economy = {
    // Movement budget is separate from action + bonus action;
    // after both are spent, movement can still be used (e.g. retreat to pillar)
    val creature = freshCreature(20)
    val t0 = FRESH_TURN
    val t1 = pUseAction(t0, creature, AAttack)
    val t2 = pUseBonusAction(t1, creature)
    val t3 = pUseMovement(t2, 10, 1)
    assert(
      t3.actionsRemaining == 0
      and t3.bonusActionUsed == true
      and t3.movementRemaining == 20
    )
  }
  
  // How many Actions are allowed per round in DND 5e for a 2nd level Rogue
  run qa_use_object_needs_action_which_is_exhausted = {
    // Drinking a potion (Use an Object action) cannot be done after the action
    // was already spent on the Attack action
    val creature = freshCreature(20)
    val t0 = FRESH_TURN
    val t1 = pUseAction(t0, creature, AAttack)
    val t2 = pUseBonusAction(t1, creature)
    val t3 = pUseAction(t2, creature, AUseObject)
    // t3 must equal t2: pUseAction is a no-op when actionsRemaining is already 0
    assert(t3 == t2)
  }
}
