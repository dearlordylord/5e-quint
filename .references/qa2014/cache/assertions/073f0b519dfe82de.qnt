// Source: https://rpg.stackexchange.com/q/172150
module _qa_073f0b519dfe82de {
  import dnd.* from "./dnd"

  // Can the creature from a Bag of Tricks make opportunity attacks?
  run qa_bag_of_tricks_oa_reaction_consumed = {
    // OA is a reaction; any creature with reaction available (incl. summoned) can make one
    val t = FRESH_TURN
    val tAfterOA = pUseReaction(t)
    assert(t.reactionAvailable == true and tAfterOA.reactionAvailable == false)
  }
  
  // Can the creature from a Bag of Tricks make opportunity attacks?
  run qa_bag_of_tricks_oa_disengage_blocks = {
    // If the target uses Disengage, the summoned creature cannot make an OA against it
    val c = freshCreature(10)
    val t = FRESH_TURN
    val tAfterDisengage = pUseAction(t, c, ADisengage)
    assert(not(pCanBeOpportunityAttacked(tAfterDisengage)))
  }
  
  // Can the creature from a Bag of Tricks make opportunity attacks?
  run qa_bag_of_tricks_oa_no_disengage_allows_oa = {
    // Without Disengage, any creature (incl. summoned) is eligible to be OA'd
    val t = FRESH_TURN
    assert(pCanBeOpportunityAttacked(t))
  }
  
  // Can the creature from a Bag of Tricks make opportunity attacks?
  run qa_bag_of_tricks_oa_reaction_spent_blocks_second_oa = {
    // After the summoned creature uses its reaction for an OA, it cannot make another
    val t = FRESH_TURN
    val tSpent = pUseReaction(t)
    // Attempting to use reaction again is a no-op when already spent
    val tSpentAgain = pUseReaction(tSpent)
    assert(not(tSpent.reactionAvailable) and tSpentAgain == tSpent)
  }
}
