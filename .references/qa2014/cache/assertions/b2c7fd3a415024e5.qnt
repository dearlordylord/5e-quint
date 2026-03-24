// Source: https://rpg.stackexchange.com/q/194851
module _qa_b2c7fd3a415024e5 {
  import dnd.* from "./dnd"

  // Does a Shield Guardian concentrate on the stored spells it casts?
  run qa_shield_guardian_concentrates_on_stored_spell = {
    // Guardian casts stored Greater Invisibility -> it (as caster) must concentrate.
    // Concentration is an inherent spell property, not a caster-set parameter.
    val ss1 = pStartConcentration(FRESH_SPELL_SLOTS, "greater_invisibility")
    assert(isConcentrating(ss1) and ss1.concentrationSpellId == "greater_invisibility")
  }
  
  // Does a Shield Guardian concentrate on the stored spells it casts?
  run qa_stored_spell_concentration_replaces_existing = {
    // PHB: "You can't concentrate on two spells at once."
    // If guardian was already concentrating, casting the stored spell replaces it.
    val ss1 = pStartConcentration(FRESH_SPELL_SLOTS, "bless")
    val ss2 = pStartConcentration(ss1, "greater_invisibility")
    assert(isConcentrating(ss2) and ss2.concentrationSpellId == "greater_invisibility")
  }
  
  // Does a Shield Guardian concentrate on the stored spells it casts?
  run qa_guardian_concentration_subject_to_standard_rules = {
    // The guardian concentrates as any caster would: damage forces a CON save.
    // Fail -> concentration broken. (High CON helps, but failure is possible.)
    val ss1 = pStartConcentration(FRESH_SPELL_SLOTS, "greater_invisibility")
    val dc   = pConcentrationDC(20) // took 20 damage -> DC 10
    val ss2  = pConcentrationCheck(ss1, false) // CON save failed
    assert(not(isConcentrating(ss2)) and dc == 10)
  }
  
  // Does a Shield Guardian concentrate on the stored spells it casts?
  run qa_concentration_is_spell_property_not_original_caster_parameter = {
    // "Parameters set by the caster" = targets/modes chosen at cast time.
    // Concentration is a property of Greater Invisibility itself.
    // The original spellcaster's slot state is NOT affected; the guardian's is.
    val originalCasterSlots = FRESH_SPELL_SLOTS
    val guardianSlots        = pStartConcentration(FRESH_SPELL_SLOTS, "greater_invisibility")
    assert(isConcentrating(guardianSlots) and not(isConcentrating(originalCasterSlots)))
  }
}
