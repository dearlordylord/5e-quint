// Source: https://rpg.stackexchange.com/q/144139
module _qa_19d406986f7ce61c {
  import dnd.* from "./dnd"

  // Are there any limitations on attacking while grappling?
  run qa_grapple_requires_free_hand_no_twohanded = {
    // Barbarian wielding a 2H weapon has no free hand; grapple fails even on winning contest
    val target = freshCreature(20)
    val result = pGrapple(Medium, Medium, target, AWins, false)
    assert(not(result.success) and not(result.targetState.grappled))
  }
  
  // Are there any limitations on attacking while grappling?
  run qa_grapple_free_hand_available_succeeds = {
    // Setting aside the 2H weapon frees a hand; grapple then succeeds on winning contest
    val target = freshCreature(20)
    val result = pGrapple(Medium, Medium, target, AWins, true)
    assert(result.success and result.targetState.grappled)
  }
  
  // Are there any limitations on attacking while grappling?
  run qa_grapple_no_free_hand_blocks_regardless_of_contest = {
    // Even a tie (which normally just means no change) is irrelevant:
    // the hard block is the missing free hand, not the contest outcome
    val target = freshCreature(20)
    val resultWin  = pGrapple(Medium, Medium, target, AWins, false)
    val resultTie  = pGrapple(Medium, Medium, target, Tie,   false)
    val resultLose = pGrapple(Medium, Medium, target, BWins, false)
    assert(
      not(resultWin.success)  and not(resultWin.targetState.grappled)  and
      not(resultTie.success)  and not(resultTie.targetState.grappled)  and
      not(resultLose.success) and not(resultLose.targetState.grappled)
    )
  }
}
