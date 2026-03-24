// Source: https://rpg.stackexchange.com/q/94118
module _qa_eea63ea74c3ca5ed {
  import dnd.* from "./dnd"

  // Does Sequester extend the duration of Conjure spells? No — caster's spell clock runs independently of summoned creature state
  run qa_sequester_does_not_pause_conjure_duration = {
    // Caster concentrating on conjure_fey (limited-duration conjure spell)
    val casterSlots = pStartConcentration(FRESH_SPELL_SLOTS, "conjure_fey")
    // Sequester applied to the summoned fey — simulate stasis via incapacitation/unconscious
    val summonedOld = freshCreature(20)
    val summonedNew = pApplyCondition(summonedOld, CUnconscious)
    // Caster is unchanged — pBreakConcOnStateChange is called with CASTER states, not summoned creature states
    val casterOld = freshCreature(30)
    val casterNew = casterOld
    // Summoned creature entering stasis does NOT pause the caster's conjure spell duration
    val resultSlots = pBreakConcOnStateChange(casterSlots, casterOld, casterNew)
    assert(isConcentrating(resultSlots))
  }
}
