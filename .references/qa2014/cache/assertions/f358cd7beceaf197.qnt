// Source: https://rpg.stackexchange.com/q/140564
module _qa_f358cd7beceaf197 {
  import dnd.* from "./dnd"

  // Is the dulcimer listed under 5e's tools intended to be the hammered variety or the strummed variety?
  run qa_dulcimer_first_equip_is_free_interaction = {
    // Equipping any instrument (strummed or hammered) uses the one free object interaction per turn
    val t0 = FRESH_TURN
    val t1 = pUseObjectInteraction(t0)
    assert(t1.freeInteractionUsed == true and t1.actionsRemaining > 0)
  }
  
  // Is the dulcimer listed under 5e's tools intended to be the hammered variety or the strummed variety?
  run qa_dulcimer_second_equip_no_longer_free = {
    // Hammered dulcimer concern: equipping mallets is a second interaction — spec returns
    // unchanged state (caller must spend Use an Object action for the second equip)
    val t0 = FRESH_TURN
    val t1 = pUseObjectInteraction(t0)  // equip dulcimer (free)
    val t2 = pUseObjectInteraction(t1)  // equip mallet — no longer free; spec leaves state unchanged
    assert(t2 == t1)
  }
  
  // Is the dulcimer listed under 5e's tools intended to be the hammered variety or the strummed variety?
  run qa_dulcimer_holding_as_focus_enables_spellcasting_no_playing_required = {
    // Accepted answer: bard only needs to *hold* the instrument as a spellcasting focus,
    // not play it — hasFreeHand=true (instrument hand doubles as focus hand) satisfies V+S
    val c = freshCreature(20)
    val canCast = pCanProvideComponents(c, true, true, true)
    assert(canCast == true)
  }
  
  // Is the dulcimer listed under 5e's tools intended to be the hammered variety or the strummed variety?
  run qa_dulcimer_strummed_one_interaction_leaves_action_free = {
    // Strummed dulcimer: one object interaction to equip, action is still available for casting
    val t0 = FRESH_TURN
    val t1 = pUseObjectInteraction(t0)
    // action still unused — bard can cast a spell on the same turn
    assert(t1.actionsRemaining > 0)
  }
}
