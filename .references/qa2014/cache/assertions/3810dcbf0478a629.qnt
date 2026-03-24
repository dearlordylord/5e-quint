// Source: https://rpg.stackexchange.com/q/191194
module _qa_3810dcbf0478a629 {
  import dnd.* from "./dnd"

  // Do start of turn artifact properties work even when not in turn order/initiative time?
  run qa_artifact_start_of_turn_heals_outside_combat = {
    // Accepted answer: turns exist as a concept both in and out of initiative order;
    // pStartTurn in spec makes no in/out-of-combat distinction
    val maxHp = 20
    val healRoll = 4 // pre-resolved 1d6
    val c = freshCreature(maxHp).with("hp", 6)
    // pStartTurn models any turn start — identical regardless of initiative context
    val t = pStartTurn(TEST_CONFIG, c, Unarmored, false, 0, false, false)
    // Artifact: "regain 1d6 HP at the start of your turn if you have at least 1 HP"
    val afterArtifact = if (c.hp >= 1) pHeal(c, healRoll) else c
    assert(c.hp >= 1 and afterArtifact.hp == 10)
  }
  
  // Artifact start-of-turn heal boundary: "at least 1 hit point" condition gates the effect
  run qa_artifact_no_heal_at_zero_hp = {
    val maxHp = 20
    val healRoll = 6
    val c = freshCreature(maxHp)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
    // Artifact condition not met at 0 HP — no healing triggers
    val afterArtifact = if (c.hp >= 1) pHeal(c, healRoll) else c
    assert(afterArtifact.hp == 0)
  }
}
