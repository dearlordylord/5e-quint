// Source: https://rpg.stackexchange.com/q/114041
module _qa_8ce4440251aa9da4 {
  import dnd.* from "./dnd"

  // DMG p237: repeated ability checks - spending 10x time on a task = automatic success; warrior bashing door
  run qa_repeated_check_auto_success_with_time = {
    // Large warrior: STR 16 (+3), Athletics proficiency, level 1 (prof +2)
    val strMod  = abilityModifier(16)       // +3
    val profBonus = proficiencyBonus(1)     // +2
    val doorDC  = 15
  
    // Several terrible rolls fail individually (5+3+2=10, 3+3+2=8 — both < 15)
    val firstFail  = checkSucceeds(5, strMod, Proficient, profBonus, 0, doorDC)
    val secondFail = checkSucceeds(3, strMod, Proficient, profBonus, 0, doorDC)
  
    // DMG p237: 10x time = automatic success for a possible task.
    // Model as the guaranteed-success roll (20): 20+3+2=25 >= 15
    val eventualSuccess = checkSucceeds(20, strMod, Proficient, profBonus, 0, doorDC)
  
    assert(not(firstFail) and not(secondFail) and eventualSuccess)
  }
}
