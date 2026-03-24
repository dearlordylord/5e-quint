// Source: https://rpg.stackexchange.com/q/146783
module _qa_c895a7ec5a8d8ab2 {
  import dnd.* from "./dnd"

  // Can you stand up from being prone using Skirmisher outside of your turn?
  // Accepted answer: "you can move" grants the same movement resource regardless of source;
  // standing from prone spends that resource, so Skirmisher's half-speed reaction movement works.
  run qa_skirmisher_stand_from_prone = {
    // Speed 30 → Skirmisher grants 15 ft of movement (half speed) as reaction
    // Standing from prone costs half speed = 15 ft
    // If both use the same movement resource, spending the 15 ft on standing is valid.
    val speed = 30
    val halfSpeed = speed / 2 // 15 ft
  
    val proneCreature = freshCreature(20).with("prone", true)
  
    // Turn state mid-reaction: Skirmisher has granted half-speed movement;
    // reaction is consumed; movementRemaining == exactly halfSpeed
    val skirmisherTurn = FRESH_TURN
      .with("effectiveSpeed", speed)
      .with("movementRemaining", halfSpeed)
      .with("reactionAvailable", false)
  
    // pStandFromProne calls pSpendHalfSpeed: cost = effectiveSpeed/2 = 15
    // 15 <= movementRemaining (15), so it succeeds and deducts 15
    val t1 = pStandFromProne(skirmisherTurn)
  
    // If turnState changed, the movement cost was paid → remove prone
    val s1 = if (t1 != skirmisherTurn) pRemoveCondition(proneCreature, CProne) else proneCreature
  
    assert(
      // All granted movement was consumed paying the stand-up cost
      t1.movementRemaining == 0
      // Creature successfully stood up from prone
      and not(s1.prone)
      // Reaction was already spent (Skirmisher triggered it)
      and not(t1.reactionAvailable)
    )
  }
}
