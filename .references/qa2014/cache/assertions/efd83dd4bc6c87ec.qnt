// Source: https://rpg.stackexchange.com/q/154142
module _qa_efd83dd4bc6c87ec {
  import dnd.* from "./dnd"

  // Wild Shape concentration save uses beast's Con mod + retained proficiency bonus (Resilient feat)
  run qa_wild_shape_concentration_save_with_resilient = {
    // Brown bear Con 16 → +3; level 5 proficiency bonus → +3; retained Con save proficiency
    val bearConMod  = abilityModifier(16)  // physical stats of beast: +3
    val profBonus   = proficiencyBonus(5)  // level 5 → +3
    val dc          = pConcentrationDC(30) // 30 damage taken → DC max(10, 15) = 15
    val roll        = 11
    // With retained Con proficiency (Resilient feat): 11 + 3 + 3 = 17 >= 15 → succeeds
    val withRetainedProf = saveSucceeds(roll, bearConMod, true, profBonus, 0, dc)
    // Without retained proficiency (counterfactual): 11 + 3 = 14 < 15 → fails
    val withoutProf = saveSucceeds(roll, bearConMod, false, profBonus, 0, dc)
    assert(withRetainedProf == true and withoutProf == false)
  }
  
  // Full pipeline: concentrating druid wild shaped, hit for 30, succeeds save, still concentrating
  run qa_wild_shape_concentration_check_pipeline = {
    val ss0        = FRESH_SPELL_SLOTS.with("concentrationSpellId", "call_lightning")
    val bearConMod = abilityModifier(16)   // beast's Con score 16 → +3
    val profBonus  = proficiencyBonus(5)   // +3 at level 5
    val dc         = pConcentrationDC(30)  // DC 15
    val roll       = 11
    // Retained proficiency: 11 + 3 + 3 = 17 >= 15 → save succeeds
    val saveOk = saveSucceeds(roll, bearConMod, true, profBonus, 0, dc)
    val ss1    = pConcentrationCheck(ss0, saveOk)
    assert(isConcentrating(ss1))
  }
  
  // Concentration breaks when beast Con mod alone is insufficient without retained proficiency
  run qa_wild_shape_concentration_breaks_without_retained_prof = {
    val ss0        = FRESH_SPELL_SLOTS.with("concentrationSpellId", "call_lightning")
    val bearConMod = abilityModifier(16)   // +3
    val profBonus  = proficiencyBonus(5)   // +3 (unused — no proficiency)
    val dc         = pConcentrationDC(30)  // DC 15
    val roll       = 11
    // No retained proficiency: 11 + 3 = 14 < 15 → fails
    val saveOk = saveSucceeds(roll, bearConMod, false, profBonus, 0, dc)
    val ss1    = pConcentrationCheck(ss0, saveOk)
    assert(not(isConcentrating(ss1)))
  }
}
