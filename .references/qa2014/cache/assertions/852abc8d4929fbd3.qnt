// Source: https://rpg.stackexchange.com/q/162796
module _qa_852abc8d4929fbd3 {
  import dnd.* from "./dnd"

  // Can I use the Dimension Door spell to teleport onto the back of an ancient green dragon?
  run qa_dimension_door_uses_action_no_cling_action_left = {
    // Casting dimension door uses your action; no action remains for the contested cling check
    val creature = freshCreature(20)
    val t0 = FRESH_TURN
    val t1 = pUseAction(t0, creature, ACastSpell)
    // Attempting a second action is a no-op — action already consumed
    val t2 = pUseAction(t1, creature, AAttack)
    assert(t1.actionsRemaining == 0 and t2 == t1)
  }
  
  // Can I use the Dimension Door spell to teleport onto the back of an ancient green dragon?
  run qa_dimension_door_quickened_bonus_action_preserves_action = {
    // Quickened Spell: cast dimension door as bonus action; action still free for cling check
    val creature = freshCreature(20)
    val t0 = FRESH_TURN
    val t1 = pUseBonusAction(t0, creature)
    val t2 = pMarkBonusActionSpell(t1)
    assert(t2.bonusActionUsed == true and t2.actionsRemaining > 0)
  }
  
  // Can I use the Dimension Door spell to teleport onto the back of an ancient green dragon?
  run qa_dimension_door_cling_contest_still_required = {
    // Teleporting doesn't bypass the opposed Athletics/Acrobatics vs Acrobatics check
    // Dragon wins the contest → rider fails to cling (BWins = dragon)
    val riderTotal  = 8 + 3   // d20=8, rider Athletics mod+prof
    val dragonTotal = 15 + 5  // d20=15, dragon Acrobatics
    assert(contestWinner(riderTotal, dragonTotal) == BWins)
  }
  
  // Can I use the Dimension Door spell to teleport onto the back of an ancient green dragon?
  run qa_dimension_door_quickened_then_win_contest_succeeds = {
    // With quickened spell: bonus action for door, then action for cling — and rider wins contest
    val creature = freshCreature(20)
    val t0 = FRESH_TURN
    val t1 = pUseBonusAction(t0, creature)
    val t2 = pMarkBonusActionSpell(t1)
    // Action still available; rider rolls higher → contest won → cling succeeds
    val t3 = pUseAction(t2, creature, AAttack)  // action spent on cling attempt
    val riderTotal  = 18 + 4  // d20=18, Athletics
    val dragonTotal = 12 + 5  // d20=12, dragon Acrobatics
    assert(
      t3.actionsRemaining == 0 and
      t3.bonusActionUsed == true and
      contestWinner(riderTotal, dragonTotal) == AWins
    )
  }
}
