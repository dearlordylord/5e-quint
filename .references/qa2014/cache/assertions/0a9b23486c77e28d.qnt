// Source: https://rpg.stackexchange.com/q/150288
module _qa_0a9b23486c77e28d {
  import dnd.* from "./dnd"

  // "What happens when your group is victim of a surprise attack but you can't be surprised?"
  // Rule: A character immune to surprise acts fully on their first turn; surprised allies cannot move or act.
  run qa_immune_to_surprise_gets_full_turn = {
    val creature = freshCreature(30)
    val t = pStartTurn(TEST_CONFIG, creature, Unarmored, false, 0, false, false)
    assert(
      t.actionsRemaining > 0 and
      not(t.bonusActionUsed) and
      t.reactionAvailable and
      t.movementRemaining == 30 and
      not(t.surprised)
    )
  }
  
  // Rule: A surprised creature cannot move or take an action on its first turn, and cannot react until that turn ends.
  run qa_surprised_creature_locked_out = {
    val creature = freshCreature(30)
    val t = pStartTurn(TEST_CONFIG, creature, Unarmored, true, 0, false, false)
    assert(
      t.actionsRemaining == 0 and
      t.bonusActionUsed and
      not(t.reactionAvailable) and
      t.movementRemaining == 0 and
      t.surprised
    )
  }
  
  // Rule: A member of a group can be surprised even if the other members aren't — both states are independently valid.
  run qa_partial_surprise_independent_per_creature = {
    val creature = freshCreature(30)
    val immuneTurn   = pStartTurn(TEST_CONFIG, creature, Unarmored, false, 0, false, false)
    val surprisedTurn = pStartTurn(TEST_CONFIG, creature, Unarmored, true,  0, false, false)
    assert(
      // Immune character (e.g. Weapon of Warning bearer) can act, move, and react
      immuneTurn.actionsRemaining > 0 and
      immuneTurn.movementRemaining > 0 and
      immuneTurn.reactionAvailable and
      // Surprised ally is locked out for the first turn
      surprisedTurn.actionsRemaining == 0 and
      surprisedTurn.movementRemaining == 0 and
      not(surprisedTurn.reactionAvailable)
    )
  }
  
  // Rule: After the surprised turn ends, a previously surprised creature regains its reaction.
  run qa_surprised_creature_regains_reaction_after_first_turn = {
    val creature = freshCreature(30)
    val t0 = pStartTurn(TEST_CONFIG, creature, Unarmored, true, 0, false, false)
    val t1 = pEndSurpriseTurn(t0)
    assert(
      not(t0.reactionAvailable) and
      t1.reactionAvailable and
      not(t1.surprised)
    )
  }
}
