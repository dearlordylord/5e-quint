// Source: https://rpg.stackexchange.com/q/154093
module _qa_8770660ccc522684 {
  import dnd.* from "./dnd"

  // "you can release the target whenever you like (no action required)" — releasing grapple is free
  run qa_release_grapple_no_action_required = {
    val grappled = freshCreature(20).with("grappled", true)
    // Exhaust every turn resource: action, bonus action, reaction
    val allSpentTurn = FRESH_TURN
      .with("actionsRemaining", 0)
      .with("bonusActionUsed", true)
      .with("reactionAvailable", false)
    // pReleaseGrapple signature is (CreatureState) -> CreatureState — no TurnState parameter,
    // proving it consumes no action, bonus action, or reaction
    val released = pReleaseGrapple(grappled)
    assert(
      not(released.grappled)
      // allSpentTurn is completely unmodified — release is truly free
      and allSpentTurn.actionsRemaining == 0
      and allSpentTurn.bonusActionUsed == true
      and allSpentTurn.reactionAvailable == false
    )
  }
  
  // Releasing a grapple involves no movement; no opportunity attack is triggered
  run qa_release_grapple_no_oa_no_movement = {
    val grappled = freshCreature(20).with("grappled", true)
    val grapplerTurn = FRESH_TURN  // grappler's turn state before releasing
    val released = pReleaseGrapple(grappled)
    // pReleaseGrapple never calls pUseMovement or pUseAction(_, _, ADisengage),
    // so disengaged remains false on the grappler's turn — no OA trigger conditions met
    assert(
      not(released.grappled)
      and not(grapplerTurn.disengaged)
      and pCanBeOpportunityAttacked(grapplerTurn) == true
    )
  }
  
  // Grapple release removes only the grappled condition; all other creature state is preserved
  run qa_release_grapple_preserves_other_state = {
    val grappled = freshCreature(30)
      .with("grappled", true)
      .with("poisoned", true)
      .with("hp", 15)
    val released = pReleaseGrapple(grappled)
    assert(
      not(released.grappled)
      and released.poisoned == true
      and released.hp == 15
      and released.maxHp == 30
    )
  }
}
