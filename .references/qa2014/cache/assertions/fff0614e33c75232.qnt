// Source: https://rpg.stackexchange.com/q/215863
module _qa_fff0614e33c75232 {
  import dnd.* from "./dnd"

  // Can an attack action be broken up for other actions?
  run qa_bonus_action_between_attacks = {
    // Attack action taken (first attack done), extra attack still pending — bonus action is available
    val creature = freshCreature(20)
    val t = FRESH_TURN
      .with("actionsRemaining", 0)
      .with("attackActionUsed", true)
      .with("extraAttacksRemaining", 1)
      .with("bonusActionUsed", false)
    val t1 = pUseBonusAction(t, creature)
    assert(t1.bonusActionUsed and t1.extraAttacksRemaining == 1)
  }
  
  // Can an attack action be broken up for other actions? (reaction between attacks)
  run qa_reaction_between_attacks = {
    // Reaction (e.g. Shield, Opportunity Attack trigger) available while Attack action is in progress
    val t = FRESH_TURN
      .with("actionsRemaining", 0)
      .with("attackActionUsed", true)
      .with("extraAttacksRemaining", 1)
      .with("reactionAvailable", true)
    val t1 = pUseReaction(t)
    // Reaction consumed; extra attack still intact
    assert(not(t1.reactionAvailable) and t1.extraAttacksRemaining == 1)
  }
  
  // Can an attack action be broken up for other actions? (TWF Light-weapon bonus action after Attack action)
  run qa_twf_bonus_action_eligible_after_attack = {
    // PHB: TWF off-hand attack is a bonus action; timing is player's choice, so usable between extra attacks
    val creature = freshCreature(20)
    val t = FRESH_TURN
      .with("actionsRemaining", 0)
      .with("attackActionUsed", true)
      .with("extraAttacksRemaining", 1)
      .with("bonusActionUsed", false)
    // Eligible for TWF bonus attack (attacks taken, bonus not yet used, not incapacitated)
    assert(pCanTwoWeaponFighting(t, creature))
  }
  
  // Can an attack action be broken up for other actions? (incapacitated blocks bonus action mid-attack)
  run qa_incapacitated_no_bonus_action_between_attacks = {
    // Anything that deprives you of actions also prevents bonus actions (PHB Bonus Action rule)
    val creature = freshCreature(20)
      .with("stunned", true)
      .with("incapacitatedSources", Set(ISStunned))
    val t = FRESH_TURN
      .with("actionsRemaining", 0)
      .with("attackActionUsed", true)
      .with("extraAttacksRemaining", 1)
      .with("bonusActionUsed", false)
    val t1 = pUseBonusAction(t, creature)
    assert(not(t1.bonusActionUsed) and not(pCanTwoWeaponFighting(t, creature)))
  }
}
