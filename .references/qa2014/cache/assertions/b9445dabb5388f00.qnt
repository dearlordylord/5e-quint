// Source: https://rpg.stackexchange.com/q/156825
module _qa_b9445dabb5388f00 {
  import dnd.* from "./dnd"

  // Is it possible for both sides of an encounter to be surprised?
  run qa_both_sides_surprised_mechanics = {
    val creature = freshCreature(20)
    // Both sides start surprised: no movement, no action, no bonus action, no reaction
    val turnA = pStartTurn(TEST_CONFIG, creature, Unarmored, true, 0, false, false)
    val turnB = pStartTurn(TEST_CONFIG, creature, Unarmored, true, 0, false, false)
    // After each side's (empty) turn ends, reaction becomes available again
    val turnAAfter = pEndSurpriseTurn(turnA)
    val turnBAfter = pEndSurpriseTurn(turnB)
    assert(
      // Both sides: locked out of movement, actions, bonus actions, and reactions on first turn
      turnA.movementRemaining == 0 and
      turnA.actionUsed == true and
      turnA.bonusActionUsed == true and
      turnA.reactionAvailable == false and
      turnB.movementRemaining == 0 and
      turnB.actionUsed == true and
      turnB.bonusActionUsed == true and
      turnB.reactionAvailable == false and
      // Once the (empty) surprised turn ends, reactions are restored for both sides
      turnAAfter.reactionAvailable == true and
      turnAAfter.surprised == false and
      turnBAfter.reactionAvailable == true and
      turnBAfter.surprised == false
    )
  }
}
