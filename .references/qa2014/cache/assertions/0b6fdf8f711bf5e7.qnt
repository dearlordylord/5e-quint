// Source: https://rpg.stackexchange.com/q/95317
module _qa_0b6fdf8f711bf5e7 {
  import dnd.* from "./dnd"

  // Can I make an opportunity attack against a grappled creature if it's being moved out of my reach?
  run qa_grappled_creature_moved_by_grappler_no_oa = {
      // Grappled creature: grapple condition sets own speed to 0 on its turn
      val grappled = freshCreature(20).with("grappled", true)
      val grappledTurn = pStartTurn(TEST_CONFIG, grappled, Unarmored, false, 0, false, false)
  
      // Grappler uses THEIR OWN movement to drag the grappled creature (separate TurnState)
      // PHB p.195: dragging costs 1 extra foot per foot (2x multiplier) — 10 ft drag = 20 ft spent
      val grapplerTurnAfterDrag = pUseMovement(FRESH_TURN, 10, 2)
  
      assert(and {
          // Grappled creature's own speed is 0 — it cannot use its own movement/action/reaction
          grappledTurn.effectiveSpeed == 0,
          grappledTurn.movementRemaining == 0,
          // Grappler consumed their own movement budget, not the grappled creature's
          grapplerTurnAfterDrag.movementRemaining == 10,
          // PHB p.195: "you don't provoke an OA when someone or something moves you
          // without using your movement, action, or reaction."
          // The grappled creature's TurnState is completely unmodified by the drag —
          // no self-movement, no action spent, not disengaged.
          grappledTurn.actionsRemaining > 0,
          not(grappledTurn.disengaged),
          not(grappledTurn.attackActionUsed),
      })
  }
}
