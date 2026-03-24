// Source: https://rpg.stackexchange.com/q/170259
module _qa_dbe4d5700cd7d07b {
  import dnd.* from "./dnd"

  // Can someone use a Readied Help action between multiple attacks?
  run qa_ready_action_uses_action_keeps_reaction = {
    // Ready action costs action slot and sets readiedAction; reaction stays available for when trigger fires
    val helper = freshCreature(20)
    val t = FRESH_TURN
    val t1 = pUseAction(t, helper, AReady)
    assert(t1.actionUsed and t1.readiedAction and t1.reactionAvailable)
  }
  
  // Can someone use a Readied Help action between multiple attacks?
  run qa_ready_help_reaction_expended_when_triggered = {
    // When trigger fires (after ally's first attack), helper expends reaction to deliver Help
    val helper = freshCreature(20)
    val t = FRESH_TURN
    val t1 = pUseAction(t, helper, AReady)
    // trigger fires → reaction used
    val t2 = pUseReaction(t1)
    assert(t1.reactionAvailable and not(t2.reactionAvailable) and t2.readiedAction)
  }
  
  // Can someone use a Readied Help action between multiple attacks?
  run qa_extra_attack_slot_available_for_help_benefiting_second_attack = {
    // Ally with Extra Attack still has extra attack slot after first attack action;
    // the readied Help fires in between, granting advantage on this second attack
    val ally = freshCreature(20)
    val t = FRESH_TURN   // extraAttacksRemaining = 1 (FExtraAttack)
    val t1 = pUseAction(t, ally, AAttack)
    // first attack made; Help reaction fires here (modeled separately above)
    val t2 = pUseExtraAttack(t1)
    assert(t1.extraAttacksRemaining == 1 and t2.extraAttacksRemaining == 0)
  }
  
  // Can someone use a Readied Help action between multiple attacks?
  run qa_readied_help_full_sequence_ready_attack_react_extra_attack = {
    // Full sequence: helper readies, ally takes Attack action, help reaction fires,
    // ally still has extra attack slot for second swing with advantage
    val helper = freshCreature(20)
    val ally = freshCreature(20)
    // Helper's turn: ready Help
    val helperTurn = FRESH_TURN
    val helperT1 = pUseAction(helperTurn, helper, AReady)
    // Ally's turn: Attack action (first attack)
    val allyTurn = FRESH_TURN
    val allyT1 = pUseAction(allyTurn, ally, AAttack)
    // Trigger fires: helper's reaction expended to Help
    val helperT2 = pUseReaction(helperT1)
    // Ally makes second attack (benefiting from Help advantage)
    val allyT2 = pUseExtraAttack(allyT1)
    assert(
      helperT1.readiedAction
      and not(helperT2.reactionAvailable)
      and allyT1.extraAttacksRemaining == 1
      and allyT2.extraAttacksRemaining == 0
    )
  }
}
