// Source: https://rpg.stackexchange.com/q/135926
module _qa_474798952e033e21 {
  import dnd.* from "./dnd"

  // Is it possible to increase the AC of a mirror image duplicate?
  run qa_mirror_image_duplicate_ac_base_formula = {
    // Duplicate AC = 10 + DEX modifier — fixed formula, no armor or shield
    val dexMod = abilityModifier(14) // +2
    val duplicateAC = calculateAC(Unarmored, dexMod, false, NoUnarmoredDefense, 0, 0)
    assert(duplicateAC == 12)
  }
  
  // Is it possible to increase the AC of a mirror image duplicate?
  run qa_mirror_image_ac_only_dex_modifier_matters = {
    // High CON/WIS do not contribute to duplicate AC under NoUnarmoredDefense
    val dexMod    = abilityModifier(14) // +2
    val highConMod = abilityModifier(20) // +5, irrelevant
    val highWisMod = abilityModifier(20) // +5, irrelevant
    val duplicateAC = calculateAC(Unarmored, dexMod, false, NoUnarmoredDefense, highConMod, highWisMod)
    assert(duplicateAC == 12)
  }
  
  // Is it possible to increase the AC of a mirror image duplicate?
  run qa_mirror_image_ac_rises_with_dex_asi = {
    // Raising DEX via ASI (14→16) lifts the duplicate's AC by 1
    val acBefore = calculateAC(Unarmored, abilityModifier(14), false, NoUnarmoredDefense, 0, 0) // 12
    val acAfter  = calculateAC(Unarmored, abilityModifier(16), false, NoUnarmoredDefense, 0, 0) // 13
    assert(acAfter == acBefore + 1)
  }
  
  // Is it possible to increase the AC of a mirror image duplicate?
  run qa_mirror_image_duplicate_cover_bonus = {
    // Cover applies to duplicates as targets (PHB p.196); half +2, three-quarters +5
    val dexMod  = abilityModifier(14) // +2
    val baseAC  = calculateAC(Unarmored, dexMod, false, NoUnarmoredDefense, 0, 0) // 12
    val halfCoverEffectiveAC       = baseAC + coverBonus(HalfCover)           // 14
    val threeQtrCoverEffectiveAC   = baseAC + coverBonus(ThreeQuartersCover)  // 17
    assert(halfCoverEffectiveAC == 14 and threeQtrCoverEffectiveAC == 17)
  }
}
