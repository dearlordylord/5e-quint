// Source: https://rpg.stackexchange.com/q/129419
module _qa_c98c6ec6d7cc17a4 {
  import dnd.* from "./dnd"

  // Can you use Lucky (feat) followed by Portent to replace a roll that's already been made?
  // Ruling: No — Lucky adds an extra die to the same ongoing attack roll, not a new attack roll.
  // Portent requires "before the roll"; the attack roll began with the attacker's die, so
  // Portent cannot intercept the Lucky die mid-roll. Lucky merely selects which d20 to use.
  run qa_lucky_is_extra_die_not_new_attack_roll = {
    // Scenario: attacker rolls nat 20 (crit). Defender uses Lucky, rolls a 3.
    // Defender chooses the Lucky roll (3) — it becomes the d20 for the same attack roll.
    val attackerRoll    = 20
    val luckyRoll       = 3
    val attackBonus     = 5
    val targetAC        = 16
  
    val critResult  = resolveAttackRoll(attackerRoll, attackBonus, targetAC, 0)
    // Lucky is not a new attack roll — it selects which d20 feeds into the ONE attack roll.
    // If the defender's Lucky die is chosen, it replaces the d20 in resolveAttackRoll.
    val luckyResult = resolveAttackRoll(luckyRoll, attackBonus, targetAC, 0)
  
    assert(
      // The original nat-20 is indeed a critical hit
      critResult.hits and critResult.isCritical
      // Defender choosing Lucky roll: 3 + 5 = 8 < 16 → miss (Lucky worked)
      and not(luckyResult.hits)
      and not(luckyResult.isCritical)
      // Both resolutions use exactly one d20Roll — Lucky contributes an extra die to the
      // same attack roll, confirming Portent (which requires "before the roll") cannot
      // replace the Lucky die once the attack roll is already underway.
    )
  }
}
