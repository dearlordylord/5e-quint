// Source: https://rpg.stackexchange.com/q/59071
module _qa_8c060a9725bf3472 {
  import dnd.* from "./dnd"

  // Does whether a Wizard can maintain Polymorph concentration depend on beast form?
  // Answer: No – concentration persists through non-incapacitating state changes; mental stats are irrelevant.
  run qa_polymorph_concentration_not_broken_by_non_incapacitating_condition = {
    val creature = freshCreature(30)
    val ss = FRESH_SPELL_SLOTS.with("concentrationSpellId", "polymorph")
    // Beast form does not incapacitate; CPoisoned models a non-incapacitating restriction
    val s1 = pApplyCondition(creature, CPoisoned)
    // Mirror doApplyCondition logic: break concentration only on newly incapacitated
    val ssAfter = if (isIncapacitated(s1) and not(isIncapacitated(creature)) and isConcentrating(ss))
      pBreakConcentration(ss) else ss
    assert(isConcentrating(ssAfter))
  }
  
  // Concentration does break when the creature becomes incapacitated (the actual listed exception)
  run qa_polymorph_concentration_breaks_when_incapacitated = {
    val creature = freshCreature(30)
    val ss = FRESH_SPELL_SLOTS.with("concentrationSpellId", "polymorph")
    val s1 = pApplyCondition(creature, CStunned)
    val ssAfter = if (isIncapacitated(s1) and not(isIncapacitated(creature)) and isConcentrating(ss))
      pBreakConcentration(ss) else ss
    assert(not(isConcentrating(ssAfter)))
  }
  
  // Concentration survives taking damage if the CON save succeeds
  run qa_polymorph_concentration_survives_successful_con_save = {
    val ss = FRESH_SPELL_SLOTS.with("concentrationSpellId", "polymorph")
    val ssAfter = pConcentrationCheck(ss, true)
    assert(isConcentrating(ssAfter))
  }
  
  // Concentration breaks if the CON save from damage fails
  run qa_polymorph_concentration_breaks_on_failed_con_save = {
    val ss = FRESH_SPELL_SLOTS.with("concentrationSpellId", "polymorph")
    val ssAfter = pConcentrationCheck(ss, false)
    assert(not(isConcentrating(ssAfter)))
  }
}
