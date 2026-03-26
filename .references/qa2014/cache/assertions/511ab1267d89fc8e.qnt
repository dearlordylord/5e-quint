// Source: https://rpg.stackexchange.com/q/122330
module _qa_511ab1267d89fc8e {
  import dnd.* from "./dnd"

  // Can you stay invisible by readying an attack instead of attacking?
  // Rule: taking the Ready action to ready an attack does NOT immediately end invisibility;
  // the invisible condition is only lost when the attack is actually executed.
  run qa_ready_action_preserves_invisibility = {
    val s0 = freshCreature(20).with("invisible", true)
    val t0 = FRESH_TURN
    // Creature uses their action to Ready (readying an attack, not casting)
    val t1 = pUseAction(t0, s0, AReady)
    assert(
      // Ready action was consumed
      t1.actionsRemaining == 0
      and t1.readiedAction == true
      // invisible condition is NOT removed by the Ready action itself
      and s0.invisible == true
      // contrast: if they had used AAttack the action would also be consumed,
      // but still no auto-removal of invisible in the turn machinery
      and pUseAction(t0, s0, AAttack).attackActionUsed == true
      and s0.invisible == true
    )
  }
}
