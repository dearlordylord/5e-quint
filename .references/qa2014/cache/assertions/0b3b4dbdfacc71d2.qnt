// Source: https://rpg.stackexchange.com/q/167936
module _qa_0b3b4dbdfacc71d2 {
  import dnd.* from "./dnd"

  // Does moving away from a prone creature trigger an opportunity attack?
  run qa_prone_oa_triggers_at_disadvantage = {
    // Prone creature is the OA attacker; mover hasn't disengaged so OA triggers
    val proneCreature = pApplyCondition(freshCreature(20), CProne)
  
    // Prone does NOT cause incapacitation, so the creature can still take reactions / make OAs
    val canAct = pCanAct(proneCreature)
  
    // Moving creature started a fresh turn and never used Disengage, so it can be OA'd
    val canBeOAd = pCanBeOpportunityAttacked(FRESH_TURN)
  
    // PHB Appendix A / Prone: prone creature has disadvantage on its own attack rolls (incl. OA)
    val ownMods = pOwnAttackModifiers(proneCreature, false)
  
    assert(
      canAct        and   // prone ≠ incapacitated; OA is legal
      canBeOAd      and   // mover didn't Disengage; OA is triggered
      ownMods.hasDisadvantage and   // OA roll made at disadvantage
      not(ownMods.hasAdvantage)     // no advantage cancelling it out
    )
  }
}
