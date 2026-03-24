// Source: https://rpg.stackexchange.com/q/80441
module _qa_50d4cd183dae8a92 {
  import dnd.* from "./dnd"

  // How does Aura of Protection work with multiple paladins?
  // Rule: same-named features don't stack; only the most potent applies (highest CHA mod).
  run qa_aura_of_protection_no_stack = {
    val paladin1ChaMod = abilityModifier(16) // +3
    val paladin2ChaMod = abilityModifier(18) // +4
  
    // Non-stacking (correct): take only the most potent aura bonus
    val auraBonus = intMax(paladin1ChaMod, paladin2ChaMod) // 4, not 7
  
    // Stacking (incorrect ruling): both modifiers added
    val stackingBonus = paladin1ChaMod + paladin2ChaMod // 7
  
    // Wizard: d20=8, CON mod=0, not proficient, DC 15
    // Correct:   8 + 0 + 4 = 12, fails DC 15
    // Incorrect: 8 + 0 + 7 = 15, would pass DC 15
    val correctResult  = saveSucceeds(8, 0, false, 0, auraBonus,    15)
    val incorrectResult = saveSucceeds(8, 0, false, 0, stackingBonus, 15)
  
    assert(
      auraBonus == 4          // most potent aura wins
      and not(correctResult)  // 8+4=12 < 15: save fails under correct rule
      and incorrectResult     // 8+7=15 >= 15: stacking would wrongly succeed
    )
  }
}
