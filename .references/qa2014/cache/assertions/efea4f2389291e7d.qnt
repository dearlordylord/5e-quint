// Source: https://rpg.stackexchange.com/q/103571
module _qa_efea4f2389291e7d {
  import dnd.* from "./dnd"

  // When neither side attempts stealth, combatants automatically notice each other — no surprise (PHB p.189)
  run qa_no_stealth_no_surprise = {
    val creature = freshCreature(30)
    val t = pStartTurn(TEST_CONFIG, creature, Unarmored, false, 0, false, false)
    assert(
      not(t.surprised)       and
      not(t.actionUsed)      and
      not(t.bonusActionUsed) and
      t.reactionAvailable    and
      t.movementRemaining > 0
    )
  }
  
  // Contrast: a creature that IS surprised (one side hid) loses action, bonus action, movement, and reaction (PHB p.189)
  run qa_surprised_creature_loses_full_turn_economy = {
    val creature = freshCreature(30)
    val t = pStartTurn(TEST_CONFIG, creature, Unarmored, true, 0, false, false)
    assert(
      t.surprised              and
      t.actionUsed             and
      t.bonusActionUsed        and
      not(t.reactionAvailable) and
      t.movementRemaining == 0
    )
  }
  
  // When neither side is stealthy, surprise ends after first turn — reaction restores normally (PHB p.189)
  run qa_surprise_clears_after_first_turn = {
    val creature = freshCreature(30)
    val t0 = pStartTurn(TEST_CONFIG, creature, Unarmored, true, 0, false, false)
    val t1 = pEndSurpriseTurn(t0)
    assert(
      not(t1.surprised)  and
      t1.reactionAvailable
    )
  }
}
