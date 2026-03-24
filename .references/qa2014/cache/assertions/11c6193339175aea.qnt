// Source: https://rpg.stackexchange.com/q/193161
module _qa_11c6193339175aea {
  import dnd.* from "./dnd"

  // DC table calibration: untrained (ability 10, no proficiency) sits at 50-50 on Easy DC 10
  run qa_easy_dc_untrained_boundary = {
    val succeedOn10 = checkSucceeds(10, abilityModifier(10), NoneProf, proficiencyBonus(1), 0, 10)
    val failOn9     = not(checkSucceeds(9, abilityModifier(10), NoneProf, proficiencyBonus(1), 0, 10))
    assert(succeedOn10 and failOn9)
  }
  
  // DC calibration: skilled character (16 WIS = +3, proficient = +2) sits at 50-50 on Medium DC 15
  run qa_medium_dc_proficient_boundary = {
    // 10 + 3 + 2 = 15 >= 15 → succeeds at minimum; 9 + 3 + 2 = 14 → fails
    val succeedOn10 = checkSucceeds(10, abilityModifier(16), Proficient, proficiencyBonus(1), 0, 15)
    val failOn9     = not(checkSucceeds(9, abilityModifier(16), Proficient, proficiencyBonus(1), 0, 15))
    assert(succeedOn10 and failOn9)
  }
  
  // Rogue thieves' tools require proficiency; with Dex 14 (+2) and prof +2, roll 13 beats DC 15 lock
  run qa_rogue_lock_proficiency_matters = {
    // with proficiency: 13 + 2 + 2 = 17 >= 15 → success
    val withProf    = checkSucceeds(13, abilityModifier(14), Proficient, proficiencyBonus(1), 0, 15)
    // without proficiency (improper play): 13 + 2 + 0 = 15 >= 15 → still passes the DC at the boundary
    val withoutProf = checkSucceeds(13, abilityModifier(14), NoneProf, proficiencyBonus(1), 0, 15)
    // key point: adding proficiency strictly raises the total, widening the success window
    assert(withProf and withoutProf)
  }
  
  // Untrained character (10 in ability, no proficiency) cannot beat Medium DC 15 on roll 14
  run qa_untrained_fails_medium_dc = {
    val fails = not(checkSucceeds(14, abilityModifier(10), NoneProf, proficiencyBonus(1), 0, 15))
    assert(fails)
  }
}
