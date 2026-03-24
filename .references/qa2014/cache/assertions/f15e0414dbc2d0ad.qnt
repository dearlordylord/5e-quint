// Source: https://rpg.stackexchange.com/q/215917
module _qa_f15e0414dbc2d0ad {
  import dnd.* from "./dnd"

  // How does Control Weather interact with a moving caster? — spell ends if caster is knocked unconscious (concentration breaks on incapacitation)
  run qa_control_weather_concentration_breaks_on_unconscious = {
    val caster = freshCreature(10)
    val ss0 = FRESH_SPELL_SLOTS.with("concentrationSpellId", "control_weather")
    // 11 damage on 10 HP caster: overflow=1 < maxHP=10 → unconscious, not dead
    val s1 = pTakeDamage(caster, 11, Slashing, Set(), Set(), Set(), false)
    // pBreakConcOnStateChange detects new incapacitation → breaks concentration
    val ss1 = pBreakConcOnStateChange(ss0, caster, s1)
    assert(
      s1.unconscious
      and not(isConcentrating(ss1))
    )
  }
  
  // How does Control Weather interact with a moving caster? — concentration check after damage determines if spell persists
  run qa_control_weather_concentration_save_on_damage = {
    val caster = freshCreature(40)
    val ss0 = FRESH_SPELL_SLOTS.with("concentrationSpellId", "control_weather")
    // 20 damage → DC = max(10, 20/2) = 10
    val dc = pConcentrationDC(20)
    // Failed save: d20=5, CON mod=+2, not proficient → 7 < 10
    val savePassedLow = saveSucceeds(5, 2, false, 0, 0, dc)
    val ss_fail = pConcentrationCheck(ss0, savePassedLow)
    // Passed save: d20=15, CON mod=+2, not proficient → 17 >= 10
    val savePassedHigh = saveSucceeds(15, 2, false, 0, 0, dc)
    val ss_pass = pConcentrationCheck(ss0, savePassedHigh)
    assert(
      not(savePassedLow) and not(isConcentrating(ss_fail))
      and savePassedHigh and isConcentrating(ss_pass)
    )
  }
}
