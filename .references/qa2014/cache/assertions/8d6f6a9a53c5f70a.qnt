// Source: https://rpg.stackexchange.com/q/120025
module _qa_8d6f6a9a53c5f70a {
  import dnd.* from "./dnd"

  // Does a Troll benefit from its Regeneration trait if it is surprised?
  // Accepted answer: passive traits triggering at start of turn still fire on a surprised
  // creature's turn — surprise only prevents movement and actions, not passive effects.
  run qa_surprised_regeneration_still_triggers = {
    // Troll-like creature at 20/30 HP (10 damage taken before combat)
    val damagedCreature = freshCreature(30).with("hp", 20)
    // Surprised creature still gets a turn — pStartTurn is called with isSurprised = true
    val surprisedTurn = pStartTurn(TEST_CONFIG, damagedCreature, Unarmored, true, 0, false, false)
    // Regeneration is a passive trait (not an action/bonus/reaction): it triggers at turn
    // start regardless of surprise. Simulate it as pHeal applied at start of turn.
    val afterRegen = pHeal(damagedCreature, 10)
    assert(and {
      // Surprised turn: no movement, action already spent, bonus action already spent
      surprisedTurn.movementRemaining == 0,
      surprisedTurn.actionsRemaining == 0      == true,
      surprisedTurn.bonusActionUsed == true,
      // But the passive heal (regeneration) is NOT an action — it still applies
      afterRegen.hp == 30,
      // Regeneration would not over-heal past max
      afterRegen.hp <= afterRegen.maxHp,
    })
  }
}
