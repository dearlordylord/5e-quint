// Source: https://rpg.stackexchange.com/q/212728
module _qa_38b739486af06e14 {
  import dnd.* from "./dnd"

  // Can you use Fortune from the Many multiple times on the same saving throw?
  // Accepted answer: no — same-named game features don't stack (DMG p.252); only most potent applies.
  run qa_fortune_from_many_no_stacking = {
    // Scenario: d20=8, DC=12, no ability mod, no proficiency.
    // Fortune from the Many: +3 (3 allies visible, max bonus).
    // Single use:  8 + 3 = 11 < 12 → fails.
    // "Double use": same-named effect, most potent wins → still +3, still 11 < 12.
    // Hypothetical stacking (+6): 8 + 6 = 14 ≥ 12 → would succeed — but the rule forbids it.
    val roll       = 8
    val abilityMod = 0
    val profBonus  = 2
    val dc         = 12
    val fortuneBonus = 3  // 3 allies within 30 ft → maximum +3
  
    val firstUse  = saveSucceeds(roll, abilityMod, false, profBonus, fortuneBonus, dc)
    // Second application of Fortune from the Many on the same roll:
    // most-potent-wins rule means bonus stays at +3, not +6.
    val secondUse = saveSucceeds(roll, abilityMod, false, profBonus, fortuneBonus, dc)
    // Counterfactual: if the bonus did stack the save would succeed.
    val ifStacked = saveSucceeds(roll, abilityMod, false, profBonus, fortuneBonus * 2, dc)
  
    assert(
      not(firstUse)          // single use: 11 < 12 → still fails
      and (firstUse == secondUse)  // second use changes nothing — no stacking
      and ifStacked           // +6 *would* have succeeded, proving stacking matters
    )
  }
}
