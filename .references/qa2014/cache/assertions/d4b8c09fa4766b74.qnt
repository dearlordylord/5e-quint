// Source: https://rpg.stackexchange.com/q/166863
module _qa_d4b8c09fa4766b74 {
  import dnd.* from "./dnd"

  // Can a caster interrupt another caster from casting Time Stop by readying a Time Stop?
  // Accepted: Ready action consumes the action but NOT the reaction; reaction fires AFTER the trigger, not during cast
  run qa_ready_action_preserves_reaction = {
    val creature = freshCreature(20)
    val t0 = FRESH_TURN
    val t1 = pUseAction(t0, creature, AReady)
    assert(t1.actionUsed and t1.readiedAction and t1.reactionAvailable)
  }
  
  // Readied action fires AFTER trigger: reaction is a separate resource consumed post-trigger
  run qa_readied_reaction_fires_after_not_during = {
    val creature = freshCreature(20)
    val t0 = FRESH_TURN
    val t1 = pUseAction(t0, creature, AReady)  // Alice readies Time Stop on her turn
    // Bob's cast resolves fully (cannot be interrupted by readied action)
    // Only then does Alice's reaction fire
    val t2 = pUseReaction(t1)
    assert(t1.reactionAvailable and not(t2.reactionAvailable))
  }
  
  // Once the reaction is spent firing the readied action, it cannot fire a second time this round
  run qa_reaction_cannot_fire_twice_same_round = {
    val creature = freshCreature(20)
    val t0 = FRESH_TURN
    val t1 = pUseAction(t0, creature, AReady)
    val t2 = pUseReaction(t1)   // readied action fires (after trigger)
    val t3 = pUseReaction(t2)   // attempt second use — no-op, already spent
    assert(not(t2.reactionAvailable) and not(t3.reactionAvailable))
  }
  
  // Reaction resets at the start of the creature's own turn — after readied action fired, fresh reaction next round
  run qa_reaction_resets_at_turn_start = {
    val creature = freshCreature(20)
    val t0 = FRESH_TURN
    val t1 = pUseReaction(t0)  // reaction spent firing the readied action
    val t2 = pStartTurn(TEST_CONFIG, creature, Unarmored, false, 0, false, false)
    assert(not(t1.reactionAvailable) and t2.reactionAvailable)
  }
}
