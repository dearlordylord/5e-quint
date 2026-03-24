// Source: https://rpg.stackexchange.com/q/49759
module _qa_8a55ae1f99cbc1c1 {
  import dnd.* from "./dnd"

  // Does drinking a potion permit an opportunity attack?
  run qa_potion_no_opportunity_attack = {
    val t0 = FRESH_TURN
    // Drinking a potion = free object interaction; does NOT affect OA eligibility
    val t1 = pUseObjectInteraction(t0)
    // OA is triggered only by moving out of reach (disengaged=false + movement);
    // using an object interaction leaves OA eligibility state entirely unchanged
    assert(
      t1.freeInteractionUsed == true
      and t1.disengaged == false
      and pCanBeOpportunityAttacked(t1) == pCanBeOpportunityAttacked(t0)
    )
  }
}
