// Source: https://rpg.stackexchange.com/q/179871
module _qa_fcb71dbc6052d82b {
  import dnd.* from "./dnd"

  // Does the Elemental Gem require Concentration?
  // "as if you had cast conjure elemental" inherits all spell rules, including concentration.
  run qa_elemental_gem_requires_concentration = {
    val afterGemUse = pStartConcentration(FRESH_SPELL_SLOTS, "conjure_elemental")
    assert(isConcentrating(afterGemUse) and afterGemUse.concentrationSpellId == "conjure_elemental")
  }
  
  // Does the Elemental Gem require Concentration? — breaking concentration dismisses the elemental
  run qa_elemental_gem_concentration_break_ends_effect = {
    val afterGemUse = pStartConcentration(FRESH_SPELL_SLOTS, "conjure_elemental")
    val afterBreak  = pBreakConcentration(afterGemUse)
    assert(not(isConcentrating(afterBreak)))
  }
  
  // Does the Elemental Gem require Concentration? — using the gem while concentrating on another spell drops the prior spell
  run qa_elemental_gem_replaces_existing_concentration = {
    val concentratingOnBless = pStartConcentration(FRESH_SPELL_SLOTS, "bless")
    val afterGemUse = pStartConcentration(concentratingOnBless, "conjure_elemental")
    assert(
      isConcentrating(afterGemUse)
      and afterGemUse.concentrationSpellId == "conjure_elemental"
    )
  }
  
  // Does the Elemental Gem require Concentration? — damage while concentrating can break the effect via failed save
  run qa_elemental_gem_concentration_breaks_on_failed_save = {
    val concentrating = pStartConcentration(FRESH_SPELL_SLOTS, "conjure_elemental")
    val afterFailedSave = pConcentrationCheck(concentrating, false)
    assert(not(isConcentrating(afterFailedSave)))
  }
  
  // Does the Elemental Gem require Concentration? — concentration survives a passed CON save
  run qa_elemental_gem_concentration_survives_passed_save = {
    val concentrating = pStartConcentration(FRESH_SPELL_SLOTS, "conjure_elemental")
    val afterPassedSave = pConcentrationCheck(concentrating, true)
    assert(isConcentrating(afterPassedSave) and afterPassedSave.concentrationSpellId == "conjure_elemental")
  }
}
