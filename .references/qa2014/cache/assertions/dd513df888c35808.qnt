// Source: https://rpg.stackexchange.com/q/143504
module _qa_dd513df888c35808 {
  import dnd.* from "./dnd"

  // Can mounted creatures be attacked instead of their mount, and which character(s) in mounted combat receive attacks of opportunity?
  
  // Total cover prevents targeting entirely — applies equally to riders and mounts
  run qa_total_cover_blocks_targeting = {
    assert(canBeTargeted(TotalCover) == false)
  }
  
  // Half and three-quarters cover still allow targeting (with AC bonus) — normal targeting rules
  run qa_partial_cover_allows_targeting = {
    assert(
      canBeTargeted(HalfCover) == true
      and canBeTargeted(ThreeQuartersCover) == true
      and canBeTargeted(NoCover) == true
    )
  }
  
  // Three-quarters cover gives +5 AC bonus, half cover +2 — normal attack modifiers apply to rider and mount alike
  run qa_cover_ac_bonuses = {
    assert(
      coverBonus(NoCover) == 0
      and coverBonus(HalfCover) == 2
      and coverBonus(ThreeQuartersCover) == 5
    )
  }
  
  // A mounted creature that has not disengaged can provoke opportunity attacks (attacker may choose rider or mount)
  run qa_oa_eligible_when_not_disengaged = {
    assert(pCanBeOpportunityAttacked(FRESH_TURN) == true)
  }
  
  // After using Disengage, neither the rider nor mount can be OA-targeted
  run qa_oa_blocked_after_disengage = {
    val creature = freshCreature(20)
    val t1 = pUseAction(FRESH_TURN, creature, ADisengage)
    assert(pCanBeOpportunityAttacked(t1) == false)
  }
}
