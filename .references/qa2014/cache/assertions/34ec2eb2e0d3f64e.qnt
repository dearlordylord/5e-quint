// Source: https://rpg.stackexchange.com/q/95409
module _qa_34ec2eb2e0d3f64e {
  import dnd.* from "./dnd"

  // Q&A: How should a Valor Bard's focus, weapon and shield interact?
  // First object interaction per turn is free (does not consume action)
  run qa_first_object_interaction_is_free = {
    val t0 = FRESH_TURN
    val t1 = pUseObjectInteraction(t0)
    assert(t1.freeInteractionUsed == true and t1.actionUsed == false)
  }
  
  // Q&A: How should a Valor Bard's focus, weapon and shield interact?
  // Second object interaction in same turn is a no-op via pUseObjectInteraction (caller must spend action)
  run qa_second_object_interaction_is_noop = {
    val t0 = FRESH_TURN
    val t1 = pUseObjectInteraction(t0)  // stow weapon: free
    val t2 = pUseObjectInteraction(t1)  // draw instrument: no free slot left, unchanged
    assert(t2 == t1)
  }
  
  // Q&A: How should a Valor Bard's focus, weapon and shield interact?
  // Stow instrument + draw weapon in one turn: first is free, second must consume the action
  run qa_stow_and_draw_same_turn_costs_action = {
    val creature = freshCreature(20)
    val t0 = FRESH_TURN
    val t1 = pUseObjectInteraction(t0)          // stow instrument: free interaction used
    val t2 = pUseAction(t1, creature, AUseObject) // draw weapon: costs the action
    assert(t1.freeInteractionUsed == true and t2.actionUsed == true)
  }
}
