// Source: https://rpg.stackexchange.com/q/190811
module _qa_de9f6cb12de24a38 {
  import dnd.* from "./dnd"

  // "If I start combat by making an attack, does a high-initiative enemy see it coming?"
  // Non-surprised NPC winning initiative gets a full turn: can act, move, use bonus action, has reaction
  run qa_nonsurprised_high_initiative_npc_gets_full_turn = {
    val creature = freshCreature(20)
    // NPC "noticed the threat" (not surprised), wins initiative
    val t = pStartTurn(TEST_CONFIG, creature, Unarmored, false, 0, false, false)
    assert(
      not(t.actionUsed) and
      not(t.bonusActionUsed) and
      t.movementRemaining == 30 and
      t.reactionAvailable
    )
  }
  
  // "If I start combat by making an attack, does a high-initiative enemy see it coming?"
  // Non-surprised NPC can spend their action responding (e.g., dodge, attack back) before the PC's declared attack executes
  run qa_nonsurprised_npc_can_use_action_before_pc_attacks = {
    val creature = freshCreature(20)
    val t0 = pStartTurn(TEST_CONFIG, creature, Unarmored, false, 0, false, false)
    // NPC chooses to dodge — a valid response to perceived hostile intent
    val t1 = pUseAction(t0, creature, ADodge)
    assert(t1.actionUsed and t1.dodging)
  }
  
  // "If I start combat by making an attack, does a high-initiative enemy see it coming?"
  // Surprised creature (contrast: attacker who telegraphed intent) cannot act or move on first turn
  run qa_surprised_creature_loses_first_turn = {
    val creature = freshCreature(20)
    val t = pStartTurn(TEST_CONFIG, creature, Unarmored, true, 0, false, false)
    assert(
      t.actionUsed and
      t.bonusActionUsed and
      t.movementRemaining == 0 and
      not(t.reactionAvailable)
    )
  }
  
  // "If I start combat by making an attack, does a high-initiative enemy see it coming?"
  // Surprised creature's action is blocked — pUseAction is a no-op when actionUsed is already true
  run qa_surprised_creature_cannot_use_action = {
    val creature = freshCreature(20)
    val t0 = pStartTurn(TEST_CONFIG, creature, Unarmored, true, 0, false, false)
    val t1 = pUseAction(t0, creature, ADodge)
    // Surprise consumed the action; dodge could not be taken
    assert(not(t1.dodging))
  }
}
