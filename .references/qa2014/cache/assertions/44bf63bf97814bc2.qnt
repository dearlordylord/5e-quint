// Source: https://rpg.stackexchange.com/q/162527
module _qa_44bf63bf97814bc2 {
  import dnd.* from "./dnd"

  // Can you investigate the same room twice? — RAW allows retrying ability checks, time is the only cost (DMG 237)
  run qa_retry_ability_check = {
    val intMod    = abilityModifier(TEST_CONFIG.abilityScores.get(Int_))  // 0 (score 10)
    val profBonus = proficiencyBonus(TEST_CONFIG.level)                    // 3 (level 5)
    val dc        = 15
    // First attempt: low roll, no Investigation proficiency → fails
    val firstAttempt  = checkSucceeds(5,  intMod, NoneProf, profBonus, 0, dc)
    // Second attempt (retry): higher roll, same modifiers → succeeds
    val secondAttempt = checkSucceeds(15, intMod, NoneProf, profBonus, 0, dc)
    assert(
      not(firstAttempt) and secondAttempt
    )
  }
}
