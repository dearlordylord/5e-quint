// Source: https://rpg.stackexchange.com/q/209395
module _qa_26e67edbbdd3e704 {
  import dnd.* from "./dnd"

  // True Polymorph is concentration; failing a concentration save ends it, losing access to any Body Thief–acquired knowledge
  run qa_true_polymorph_knowledge_temporary_concentration_broken = {
    val caster = freshCreature(20)
    val ss0 = FRESH_SPELL_SLOTS
    // Caster polymorphs into Intellect Devourer via True Polymorph (concentration)
    val ss1 = pStartConcentration(ss0, "true_polymorph")
    // Takes 10 damage mid-Body-Thief → DC = max(10/2, 10) = 10; roll 4, no modifiers → save fails
    val dc = pConcentrationDC(10)
    val savePasses = saveSucceeds(4, 0, false, 0, 0, dc)
    val ss2 = pConcentrationCheck(ss1, savePasses)
    assert(
      isConcentrating(ss1)
      and dc == 10
      and not(savePasses)
      and not(isConcentrating(ss2))
    )
  }
  
  // Going unconscious while concentrating on True Polymorph automatically ends the spell, reverting form and losing Body Thief features
  run qa_true_polymorph_unconscious_ends_polymorph = {
    val caster = freshCreature(8)
    val ss0 = FRESH_SPELL_SLOTS
    val ss1 = pStartConcentration(ss0, "true_polymorph")
    // Lethal blow drops caster to 0 HP → unconscious → incapacitated → concentration auto-breaks
    val s1 = pTakeDamage(caster, 12, Slashing, Set(), Set(), Set(), false)
    val ss2 = pBreakConcOnStateChange(ss1, caster, s1)
    assert(
      isConcentrating(ss1)
      and s1.unconscious
      and isIncapacitated(s1)
      and not(isConcentrating(ss2))
    )
  }
}
