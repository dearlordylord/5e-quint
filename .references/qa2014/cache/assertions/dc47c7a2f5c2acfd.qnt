// Source: https://rpg.stackexchange.com/q/102679
module _qa_dc47c7a2f5c2acfd {
  import dnd.* from "./dnd"

  // What roll is appropriate for hiding pain?
  run qa_hide_pain_con_save = {
    val conMod = abilityModifier(TEST_CONFIG.abilityScores.get(Con))
    val profBonus = proficiencyBonus(TEST_CONFIG.level)
    val isProficient = TEST_CONFIG.saveProficiencies.contains(Con)
    // CON save used to keep focus under pain (as with concentration checks)
    // roll 8 + CON mod(+2) + prof(+3) = 13 >= DC 13 → succeeds
    val successCase = saveSucceeds(8, conMod, isProficient, profBonus, 0, 13)
    // roll 7 + CON mod(+2) + prof(+3) = 12 < DC 13 → fails
    val failCase = saveSucceeds(7, conMod, isProficient, profBonus, 0, 13)
    assert(successCase and not(failCase))
  }
  
  // What roll is appropriate for hiding pain? (variant PHB p.175: CON replaces CHA for Deception)
  run qa_hide_pain_con_deception_variant = {
    val conMod = abilityModifier(TEST_CONFIG.abilityScores.get(Con))
    val profBonus = proficiencyBonus(TEST_CONFIG.level)
    // Variant rule: CON (Deception) check — CON mod used instead of CHA mod, no Deception prof for this character
    // roll 11 + CON mod(+2) + NoneProf(0) = 13 >= DC 13 → succeeds
    val successCase = checkSucceeds(11, conMod, NoneProf, profBonus, 0, 13)
    // roll 10 + CON mod(+2) + NoneProf(0) = 12 < DC 13 → fails
    val failCase = checkSucceeds(10, conMod, NoneProf, profBonus, 0, 13)
    assert(successCase and not(failCase))
  }
}
