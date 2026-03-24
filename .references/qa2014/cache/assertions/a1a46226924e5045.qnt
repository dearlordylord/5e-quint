// Source: https://rpg.stackexchange.com/q/179286
module _qa_a1a46226924e5045 {
  import dnd.* from "./dnd"

  // True Polymorph + Awaken: failed concentration check ends True Polymorph, losing the 1000gp Awaken investment
  run qa_true_polymorph_concentration_check_failure_breaks_spell = {
    val ss = FRESH_SPELL_SLOTS.with("concentrationSpellId", "true_polymorph")
    val damageTaken = 20
    val dc = pConcentrationDC(damageTaken)   // max(10, 20/2) = 10
    val ss1 = pConcentrationCheck(ss, false) // caster fails the save
    assert(
      dc == 10
      and not(isConcentrating(ss1))
      and ss1.concentrationSpellId == ""
    )
  }
  
  // True Polymorph + Awaken: heavier damage raises the concentration save DC, increasing risk to the Awaken investment
  run qa_true_polymorph_concentration_dc_scales_with_damage = {
    val ss = FRESH_SPELL_SLOTS.with("concentrationSpellId", "true_polymorph")
    val dc_low  = pConcentrationDC(8)   // max(10, 4)  = 10 (floor kicks in)
    val dc_mid  = pConcentrationDC(30)  // max(10, 15) = 15
    val dc_high = pConcentrationDC(50)  // max(10, 25) = 25
    assert(dc_low == 10 and dc_mid == 15 and dc_high == 25)
  }
  
  // True Polymorph + Awaken: caster death immediately breaks concentration → True Polymorph ends, Awaken lost
  run qa_true_polymorph_breaks_on_caster_death = {
    val s  = freshCreature(10)
    val ss = FRESH_SPELL_SLOTS.with("concentrationSpellId", "true_polymorph")
    val s1  = pTakeDamage(s, 100, Slashing, Set(), Set(), Set(), false)
    val ss1 = pBreakConcOnStateChange(ss, s, s1)
    assert(
      s1.dead
      and not(isConcentrating(ss1))
      and ss1.concentrationSpellId == ""
    )
  }
  
  // True Polymorph + Awaken: passing the concentration save preserves the spell (and the Awaken investment)
  run qa_true_polymorph_concentration_maintained_on_passed_save = {
    val ss  = FRESH_SPELL_SLOTS.with("concentrationSpellId", "true_polymorph")
    val ss1 = pConcentrationCheck(ss, true) // caster succeeds the save
    assert(
      isConcentrating(ss1)
      and ss1.concentrationSpellId == "true_polymorph"
    )
  }
}
