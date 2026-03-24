// Source: https://rpg.stackexchange.com/q/158079
module _qa_afd7c8d6461f94ac {
  import dnd.* from "./dnd"

  // By RAW, can you use your free object interaction while taking the "Use an Object" action?
  
  // Free object interaction is capped at one per turn; second call is a no-op per spec
  run qa_free_object_interaction_once_per_turn = {
    val t0 = FRESH_TURN
    val t1 = pUseObjectInteraction(t0)
    val t2 = pUseObjectInteraction(t1)
    assert(
      t1.freeInteractionUsed == true
      and t2.freeInteractionUsed == true
      and t2 == t1  // second call returns unchanged state
    )
  }
  
  // Rogue Fast Hands: action (Use an Object) + free interaction + bonus action = 3 object interactions
  run qa_rogue_fast_hands_three_flagons = {
    val creature = freshCreature(20)
    val t0 = FRESH_TURN
    // Flagon 1: Use an Object action
    val t1 = pUseAction(t0, creature, AUseObject)
    // Flagon 2: free object interaction (can be taken during the action per RAW)
    val t2 = pUseObjectInteraction(t1)
    // Flagon 3: Fast Hands — bonus action grants another Use an Object
    val t3 = pUseBonusAction(t2, creature)
    assert(
      t3.actionUsed == true
      and t3.freeInteractionUsed == true
      and t3.bonusActionUsed == true
    )
  }
}
