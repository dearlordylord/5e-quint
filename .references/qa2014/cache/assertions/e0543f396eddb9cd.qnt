// Source: https://rpg.stackexchange.com/q/168283
module _qa_e0543f396eddb9cd {
  import dnd.* from "./dnd"

  // Does the Echo Knight fighter's Legion of One feature allow each echo to use Unleash Incarnation?
  // Accepted answer: one extra attack per Attack action, not one per echo.
  run qa_unleash_incarnation_one_extra_per_attack_action = {
    val creature = freshCreature(30)
    val t = pStartTurn(TEST_CONFIG, creature, Unarmored, false, 0, false, false)
    val t2 = pUseAction(t, creature, AAttack)
    // Legion of One (2 echoes) does NOT double the extra attack grant; still exactly 1 per Attack action
    assert(t2.attackActionUsed == true and t2.extraAttacksRemaining == 1)
  }
  
  // Does the Echo Knight fighter's Legion of One feature allow each echo to use Unleash Incarnation?
  // Accepted answer: bonus action attack does not trigger Unleash Incarnation (not an Attack action).
  run qa_unleash_incarnation_bonus_action_no_trigger = {
    val creature = freshCreature(30)
    val t = pStartTurn(TEST_CONFIG, creature, Unarmored, false, 0, false, false)
    val t2 = pUseAction(t, creature, AAttack)
    val t3 = pUseBonusAction(t2, creature)
    // Using a bonus action after the Attack action does NOT add more extra attacks
    assert(t3.bonusActionUsed == true and t3.extraAttacksRemaining == 1)
  }
  
  // Does the Echo Knight fighter's Legion of One feature allow each echo to use Unleash Incarnation?
  // Accepted answer: each use of Unleash Incarnation consumes one of the granted extra attacks.
  run qa_unleash_incarnation_extra_attack_consumed = {
    val creature = freshCreature(30)
    val t = pStartTurn(TEST_CONFIG, creature, Unarmored, false, 0, false, false)
    val t2 = pUseAction(t, creature, AAttack)
    val t3 = pUseExtraAttack(t2)
    // After spending the one granted extra attack, none remain
    assert(t3.extraAttacksRemaining == 0)
  }
}
