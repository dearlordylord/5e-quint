// Source: https://rpg.stackexchange.com/q/180205
module _qa_4c94074275dc128f {
  import dnd.* from "./dnd"

  // Mending has instantaneous duration — no ongoing magic; Detect Magic finds nothing
  run qa_instantaneous_spell_no_ongoing_magic = {
    val ss = FRESH_SPELL_SLOTS
    // Instantaneous spells never call pStartConcentration → isConcentrating is false
    assert(not(isConcentrating(ss)))
  }
  
  // Mending: instantaneous effect — Dispel Magic (modeled as concentration check) is a no-op
  run qa_instantaneous_dispel_magic_no_effect = {
    val ss = FRESH_SPELL_SLOTS
    // pConcentrationCheck short-circuits when not concentrating; instantaneous spell leaves nothing to dispel
    val ssAfterDispel = pConcentrationCheck(ss, false)
    assert(ssAfterDispel == ss)
  }
  
  // Mending: instantaneous effect cannot be suppressed by Antimagic Field (no concentration to break)
  run qa_instantaneous_antimagic_field_no_effect = {
    val ss = FRESH_SPELL_SLOTS
    // pBreakConcentration on a non-concentrating state is identity; no active spell to suppress
    val ssAfterField = pBreakConcentration(ss)
    assert(ssAfterField == ss and not(isConcentrating(ssAfterField)))
  }
  
  // Mending: resuming from Antimagic Field has no effect — there was never an ongoing spell to resume
  run qa_instantaneous_exits_antimagic_field_unchanged = {
    val ss = FRESH_SPELL_SLOTS
    // Entering then leaving an antimagic field leaves instantaneous effect state identical
    val ssInField  = pBreakConcentration(ss)
    val ssOutField = ssInField   // no pStartConcentration to resume → state unchanged
    assert(ssOutField == ss and not(isConcentrating(ssOutField)))
  }
}
