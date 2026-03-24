module _qa_ed65a27003261a14 {
  import dnd.* from "./dnd"

  // If you cast a spell with different effect options twice on the same creature, do multiple castings of the spell stack?
  run qa_condition_spell_no_stack_idempotent = {
    val creature = freshCreature(20)
    // Blindness/deafness applies CBlinded; casting it twice on the same target
    // must not produce a "stronger" blinded than casting it once
    val after_first_cast = pApplyCondition(creature, CBlinded)
    val after_second_cast = pApplyCondition(after_first_cast, CBlinded)
    assert(after_first_cast == after_second_cast)
  }
  
  // If you cast a spell with different effect options twice on the same creature, do multiple castings of the spell stack?
  run qa_concentration_most_recent_equally_potent_replaces = {
    val ss = FRESH_SPELL_SLOTS
    // First equally-potent casting of a concentration spell
    val ss1 = pStartConcentration(ss, "hold_person_cast1")
    // Second equally-potent casting: per PHB errata, most recent replaces the first
    val ss2 = pStartConcentration(ss1, "hold_person_cast2")
    assert(
      ss1.concentrationSpellId == "hold_person_cast1"
      and ss2.concentrationSpellId == "hold_person_cast2"
    )
  }
  
  // If you cast a spell with different effect options twice on the same creature, do multiple castings of the spell stack?
  run qa_deafened_no_stack_idempotent = {
    val creature = freshCreature(20)
    // The deafened option of blindness/deafness: casting twice is idempotent
    val after_first_cast = pApplyCondition(creature, CDeafened)
    val after_second_cast = pApplyCondition(after_first_cast, CDeafened)
    assert(after_first_cast == after_second_cast)
  }
}
