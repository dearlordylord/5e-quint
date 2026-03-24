// Source: https://rpg.stackexchange.com/q/193545
module _qa_f4baf5085a01aa8a {
  import dnd.* from "./dnd"

  // "How would you rule impact force vs weight limits (Tenser's Floating Disk / Immovable Rod)?"
  // Accepted answer: D&D treats weight limits as static mass, not dynamic impact force
  run qa_weight_limit_is_static_mass = {
    // The spec models carrying capacity as purely static (STR × 15); no dynamic force component.
    // This mirrors the PHB ruling: 500 lb on Tenser's Disk means 500 lb of mass, not 500 lb of force.
    val capMedium = carryingCapacity(10, Medium)
    val capLarge  = carryingCapacity(10, Large)
    assert(
      capMedium == 150        // 10 × 15 = 150 lb static
      and capLarge == 300     // Large doubles it; still purely static
      and capLarge == capMedium * 2
    )
  }
  
  // "Pressing the Immovable Rod button uses an action, so it can't be done reactively"
  // Accepted answer: pressing the button is an action; reaction is a separate, still-available resource
  run qa_use_object_costs_action_not_reaction = {
    val creature = freshCreature(20)
    val afterUse = pUseAction(FRESH_TURN, creature, AUseObject)
    assert(
      afterUse.actionUsed       == true   // action slot consumed (pressing the button)
      and afterUse.reactionAvailable == true  // reaction is unaffected — can't "reactively press"
      and afterUse.bonusActionUsed   == false // bonus action also unaffected
    )
  }
}
