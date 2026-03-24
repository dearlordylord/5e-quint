// Source: https://rpg.stackexchange.com/q/159800
module _qa_4c67cb3024fe6d25 {
  import dnd.* from "./dnd"

  // Does a cantrip fired with the Ready Action require concentration?
  run qa_ready_cantrip_requires_concentration = {
    // Readying any spell (including a 0th-level cantrip) requires concentration per PHB Ready action rules
    val s0 = freshCreature(20)
    val t0 = FRESH_TURN
    val ss0 = FRESH_SPELL_SLOTS
    // Caster declares Ready action with a cantrip; holding the energy requires concentration
    val t1 = pUseAction(t0, s0, AReady)
    val ss1 = pStartConcentration(ss0, "firebolt_cantrip")
    assert(t1.readiedAction and isConcentrating(ss1))
  }
  
  // Readied cantrip concentration check DC = max(10, half damage taken)
  run qa_ready_cantrip_concentration_dc = {
    // PHB: concentration check DC = max(10, floor(damage/2)); javelin deals 8 → DC 10
    val dc = pConcentrationDC(8)
    assert(dc == 10)
  }
  
  // Failing concentration check while holding a readied cantrip loses the spell
  run qa_ready_cantrip_failed_concentration_breaks_spell = {
    // Merlin readies Firebolt, ogre javelin hits for 8 damage, Merlin fails CON save → loses readied spell
    val s0 = freshCreature(20)
    val ss0 = pStartConcentration(FRESH_SPELL_SLOTS, "firebolt_cantrip")
    // 8 damage taken, DC = 10; roll 3 + CON mod 2 + prof 3 (CON proficient, level 5) = 8 < 10 → fail
    val dc = pConcentrationDC(8)
    val savePassed = saveSucceeds(3, 2, true, proficiencyBonus(5), 0, dc)
    val ss1 = pConcentrationCheck(ss0, savePassed)
    assert(not(isConcentrating(ss1)))
  }
  
  // Passing concentration check while holding a readied cantrip maintains it
  run qa_ready_cantrip_passed_concentration_maintains_spell = {
    // Merlin readies Firebolt, ogre javelin hits for 8 damage, Merlin passes CON save → spell still held
    val ss0 = pStartConcentration(FRESH_SPELL_SLOTS, "firebolt_cantrip")
    // roll 5 + CON mod 2 + prof 3 = 10 >= DC 10 → succeeds
    val dc = pConcentrationDC(8)
    val savePassed = saveSucceeds(5, 2, true, proficiencyBonus(5), 0, dc)
    val ss1 = pConcentrationCheck(ss0, savePassed)
    assert(isConcentrating(ss1) and ss1.concentrationSpellId == "firebolt_cantrip")
  }
}
