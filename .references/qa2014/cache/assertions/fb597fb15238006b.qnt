// Source: https://rpg.stackexchange.com/q/127422
module _qa_fb597fb15238006b {
  import dnd.* from "./dnd"

  // Does a spellcaster lose their skill proficiencies when viewing through their familiar?
  // Rule: retain own proficiencies while in familiar-vision; familiar's skill proficiencies do NOT transfer.
  
  // Test 1: Caster keeps own Deception proficiency while using familiar's senses.
  // With own proficiency: 10 + 2 + 3 = 15 >= DC 15 (success).
  // Without (wrong — if own proficiency lost): 10 + 2 = 12 < 15 (fail).
  run qa_familiar_vision_own_proficiency_retained = {
    val chaMod    = abilityModifier(14)    // Warlock Cha 14 → +2
    val profBonus = proficiencyBonus(5)    // level 5 → +3
    val dc   = 15
    val roll = 10
    // Correct: own Deception proficiency retained in familiar-vision mode → succeeds
    val retained = checkSucceeds(roll, chaMod, Proficient, profBonus, 0, dc)
    // Wrong: if own proficiency were somehow lost → fails
    val lost     = checkSucceeds(roll, chaMod, NoneProf,   profBonus, 0, dc)
    assert(retained and not(lost))
  }
  
  // Test 2: Familiar's Insight proficiency does NOT transfer to the caster.
  // Without transfer (correct): 10 + 1 = 11 < DC 14 (fail).
  // With transfer (wrong): 10 + 1 + 3 = 14 >= DC 14 (would succeed).
  run qa_familiar_vision_familiar_skill_not_transferred = {
    val wisMod    = abilityModifier(12)    // Warlock Wis 12 → +1
    val profBonus = proficiencyBonus(5)    // level 5 → +3
    val dc   = 14
    val roll = 10
    // Correct: familiar's Insight proficiency is NOT transferred → NoneProf → fails
    val noTransfer   = checkSucceeds(roll, wisMod, NoneProf,   profBonus, 0, dc)
    // Wrong: if familiar's Insight proficiency incorrectly transferred → Proficient → succeeds
    val withTransfer = checkSucceeds(roll, wisMod, Proficient, profBonus, 0, dc)
    assert(not(noTransfer) and withTransfer)
  }
}
