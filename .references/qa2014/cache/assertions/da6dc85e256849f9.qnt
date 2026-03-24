// Source: https://rpg.stackexchange.com/q/158304
module _qa_da6dc85e256849f9 {
  import dnd.* from "./dnd"

  // Can you use a Tentacle Rod to make Opportunity Attacks?
  // OA is a reaction; using it does not consume an action, so action-requiring items (like the Rod) cannot be activated
  run qa_opportunity_attack_uses_reaction_not_action = {
    val t0 = FRESH_TURN
    val t1 = pUseReaction(t0)
    assert(
      // Reaction is spent — OA was taken
      t1.reactionAvailable == false
      // Action is NOT consumed — OA never grants an action
      and t1.actionUsed == false
      // Attack action not triggered either — no attackActionUsed-gated abilities become available
      and t1.attackActionUsed == false
    )
  }
  
  // Can you use a Tentacle Rod to make Opportunity Attacks? (grapple/shove analog from Sage Advice)
  // Grapple/shove require the Attack action; TWF shares the same attackActionUsed gate — both unavailable after OA (reaction-only)
  run qa_opp_attack_no_attack_action_grapple_analog = {
    val creature = freshCreature(20)
    val t0 = FRESH_TURN
    // Opportunity attack: spend reaction only
    val t_oa = pUseReaction(t0)
    // TWF requires attackActionUsed=true; after OA (reaction only), attackActionUsed is still false
    assert(pCanTwoWeaponFighting(t_oa, creature) == false)
  }
}
