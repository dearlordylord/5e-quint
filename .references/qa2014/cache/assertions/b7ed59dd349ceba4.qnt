// Source: https://rpg.stackexchange.com/q/79835
module _qa_b7ed59dd349ceba4 {
  import dnd.* from "./dnd"

  // Can you use your Attack of Opportunity to Shove?
  // Accepted answer: No. OA grants one melee attack via reaction; shove requires the Attack action.
  run qa_oa_cannot_shove = {
    // An opportunity attack is modelled as spending the reaction (pUseReaction).
    // It does NOT spend the action slot and does NOT set attackActionUsed.
    // Shove requires the Attack action (AAttack → attackActionUsed: true).
    // Therefore, after an OA the precondition for shoving is not met.
    val afterOA = pUseReaction(FRESH_TURN)
    assert(
      not(afterOA.reactionAvailable)    // reaction consumed by the OA
      and not(afterOA.attackActionUsed) // Attack action was NOT taken
      and not(afterOA.actionUsed)       // action slot untouched
    )
  }
}
