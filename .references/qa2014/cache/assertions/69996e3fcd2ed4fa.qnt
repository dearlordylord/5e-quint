// Source: https://rpg.stackexchange.com/q/180499
module _qa_69996e3fcd2ed4fa {
  import dnd.* from "./dnd"

  // Does Voice of the Chain Master allow casting certain spells from an isolated space?
  // Accepted answer: spells with targets require a clear path; Total Cover blocks targeting entirely
  run qa_total_cover_blocks_targeting = {
    assert(canBeTargeted(TotalCover) == false)
  }
  
  // Does Voice of the Chain Master allow casting certain spells from an isolated space?
  // Accepted answer: activating familiar senses costs an action; no action remains to cast a spell on same turn
  run qa_familiar_senses_action_exhausts_action_economy = {
    val creature = freshCreature(20)
    // Spend the action activating familiar senses (modeled as AUseObject)
    val afterSenses = pUseAction(FRESH_TURN, creature, AUseObject)
    // Attempt to also cast a spell as an action — must be blocked
    val afterSpell = pUseAction(afterSenses, creature, ACastSpell)
    assert(afterSenses.actionsRemaining == 0 and afterSpell == afterSenses)
  }
  
  // Does Voice of the Chain Master allow casting certain spells from an isolated space?
  // Accepted answer: NoCover / HalfCover / ThreeQuartersCover all allow targeting; only TotalCover does not
  run qa_partial_cover_still_targetable = {
    assert(
      canBeTargeted(NoCover) == true and
      canBeTargeted(HalfCover) == true and
      canBeTargeted(ThreeQuartersCover) == true and
      canBeTargeted(TotalCover) == false
    )
  }
}
