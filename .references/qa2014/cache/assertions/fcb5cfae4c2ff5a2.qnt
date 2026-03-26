// Source: https://rpg.stackexchange.com/q/59584
module _qa_fcb5cfae4c2ff5a2 {
  import dnd.* from "./dnd"

  // Can a support combat style be effective without magic? — Help action uses your action but doesn't mark attack action
  run qa_help_action_consumes_action_not_attack = {
    val creature = freshCreature(20)
    val t1 = pUseAction(FRESH_TURN, creature, AHelp)
    assert(t1.actionsRemaining == 0 and t1.attackActionUsed == false and t1.bonusActionUsed == false)
  }
  
  // Can a support combat style be effective without magic? — advantage (from Help) converts a near-miss into a hit
  run qa_help_advantage_converts_miss_to_hit = {
    val attackBonus = 4
    val targetAC = 16
    // Normal roll: 11 + 4 = 15 < 16 → miss
    val normalRoll = resolveAttackRoll(11, attackBonus, targetAC, 0)
    // With advantage the ally picks the better die: 13 + 4 = 17 >= 16 → hit
    val advRoll = resolveAttackRoll(13, attackBonus, targetAC, 0)
    assert(normalRoll.hits == false and advRoll.hits == true)
  }
  
  // Can a support combat style be effective without magic? — Lay on Hands (pHeal) restores a downed ally from 0 HP
  run qa_lay_on_hands_restores_downed_ally = {
    val downed = freshCreature(20)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
      .with("deathSaves", { successes: 1, failures: 1 })
    val s1 = pHeal(downed, 5)
    assert(s1.hp == 5 and s1.unconscious == false and s1.deathSaves == DEATH_SAVES_RESET)
  }
}
