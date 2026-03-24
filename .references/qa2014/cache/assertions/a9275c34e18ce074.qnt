// Source: https://rpg.stackexchange.com/q/80006
module _qa_a9275c34e18ce074 {
  import dnd.* from "./dnd"

  // Would a mummy (undead) react to a minor illusion? - Investigation check vs spell save DC applies to all creature types
  run qa_minor_illusion_investigation_check_undead = {
    // Bard (TEST_CONFIG: level 5, Wis 13) casts Minor Illusion
    // spell save DC = 8 + prof(5) + wisMod(13) = 8 + 3 + 1 = 12
    val bardDC = spellSaveDC(TEST_CONFIG)
  
    // Mummy: Int 7 (-2 mod), not proficient in Investigation
    val mummyIntMod = abilityModifier(7)
    val mummyProfBonus = proficiencyBonus(3)
  
    // Low roll: mummy fails to discern the illusion (10 - 2 = 8 < 12)
    val lowRollFails = not(checkSucceeds(10, mummyIntMod, NoneProf, mummyProfBonus, 0, bardDC))
  
    // High roll: mummy succeeds in discerning the illusion (15 - 2 = 13 >= 12)
    val highRollPasses = checkSucceeds(15, mummyIntMod, NoneProf, mummyProfBonus, 0, bardDC)
  
    // Same DC and formula applies regardless of creature type (undead/mummy is not exempt)
    assert(bardDC == 12 and lowRollFails and highRollPasses)
  }
}
