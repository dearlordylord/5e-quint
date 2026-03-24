// Source: https://rpg.stackexchange.com/q/172210
module _qa_ea260b5353875698 {
  import dnd.* from "./dnd"

  // Tavern Brawler rope grapple: grapple requires a free hand; holding rope means no free hand, so grapple fails
  run qa_tavern_brawler_rope_no_free_hand_grapple_fails = {
    val target = freshCreature(20)
    // Attacker wins the contest but is holding the rope — no free hand available
    val result = pGrapple(Medium, Medium, target, AWins, false)
    assert(result.success == false and not(result.targetState.grappled))
  }
  
  // Tavern Brawler grapple: with a free hand (no rope in hand) and winning contest, grapple succeeds normally
  run qa_tavern_brawler_free_hand_grapple_succeeds = {
    val target = freshCreature(20)
    val result = pGrapple(Medium, Medium, target, AWins, true)
    assert(result.success == true and result.targetState.grappled)
  }
  
  // Tavern Brawler rope grapple: even a tie (status quo) with a free hand does not apply grappled
  run qa_tavern_brawler_grapple_tie_no_change = {
    val target = freshCreature(20)
    val result = pGrapple(Medium, Medium, target, Tie, true)
    assert(result.success == false and not(result.targetState.grappled))
  }
}
