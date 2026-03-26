// Source: https://rpg.stackexchange.com/q/188485
module _qa_2fe492dcaaf32ec7 {
  import dnd.* from "./dnd"

  // Should dismissing a Blood Hunter's Brand of Castigation require any action?
  // Accepted: dismissal costs an action only when explicitly stated; unspecified = free
  run qa_free_dismissal_no_action_cost = {
    val s0 = freshCreature(20)
    val t0 = FRESH_TURN  // actionsRemaining = 1, action available
  
    // Free dismissal: pBreakConcentration (and by analogy, Brand of Castigation dismissal)
    // does NOT route through pUseAction → turn state is untouched
    val ss0 = pStartConcentration(FRESH_SPELL_SLOTS, "brand_of_castigation")
    val ss1 = pBreakConcentration(ss0)
  
    // Explicit action cost (e.g. "dismiss this spell as an action") goes through pUseAction
    val t1 = pUseAction(t0, s0, AUseObject)
  
    assert(
      // Effect is gone after free dismissal
      not(isConcentrating(ss1)) and
      // Free dismissal: action NOT consumed — turn state never touched
      t0.actionsRemaining > 0 and
      // Contrast: explicit action cost DOES consume the action
      t1.actionsRemaining == 0
    )
  }
  
  // Dismissing a grapple (another PHB "no action required" dismissal) also leaves action intact
  run qa_release_grapple_no_action_cost = {
    val s0 = pApplyCondition(freshCreature(20), CGrappled)
    val t0 = FRESH_TURN  // action available
  
    // pReleaseGrapple = free dismissal; it only touches creature state, never TurnState
    val s1 = pReleaseGrapple(s0)
  
    assert(
      not(s1.grappled) and   // grapple dismissed
      t0.actionsRemaining > 0 // action was NOT consumed
    )
  }
}
