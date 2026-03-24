// Source: https://rpg.stackexchange.com/q/180005
module _qa_c67ab871d5d06e7e {
  import dnd.* from "./dnd"

  // "What happen if a Twilight Domain Cleric that shared his darkvision becomes unconscious or dies?"
  // Accepted: Eyes of Night specifies only "lasts 1 hour" — no termination clause.
  // If something would cut it short, the feature would say so (like concentration or Wild Shape).
  // Therefore shared darkvision persists regardless of the cleric's state.
  
  // Contrast: concentration (which HAS an explicit termination clause) breaks when caster goes unconscious
  run qa_eyes_of_night_concentration_contrast_unconscious = {
    val s0 = freshCreature(20)
    val ss0 = FRESH_SPELL_SLOTS.with("concentrationSpellId", "hold_person")
    val s1 = pApplyCondition(s0, CUnconscious)
    val ss1 = pBreakConcOnStateChange(ss0, s0, s1)
    assert(ss1.concentrationSpellId == "")
  }
  
  // Contrast: concentration breaks when caster dies
  run qa_eyes_of_night_concentration_contrast_death = {
    val s0 = freshCreature(20)
    val ss0 = FRESH_SPELL_SLOTS.with("concentrationSpellId", "hold_person")
    val s1 = s0.with("dead", true).with("hp", 0)
    val ss1 = pBreakConcOnStateChange(ss0, s0, s1)
    assert(ss1.concentrationSpellId == "")
  }
  
  // Eyes of Night: non-concentration fixed-duration effect — going unconscious does NOT cancel it
  run qa_eyes_of_night_persists_through_unconscious = {
    val s0 = freshCreature(20)
    // Eyes of Night shared darkvision has no concentration tracking — modeled as no concentrationSpellId
    val ss0 = FRESH_SPELL_SLOTS
    val s1 = pApplyCondition(s0, CUnconscious)
    val ss1 = pBreakConcOnStateChange(ss0, s0, s1)
    // Non-concentration spell slot state is completely unaffected by the caster going unconscious
    assert(ss1 == ss0)
  }
  
  // Eyes of Night: non-concentration fixed-duration effect — death does NOT cancel it
  run qa_eyes_of_night_persists_through_death = {
    val s0 = freshCreature(20)
    val ss0 = FRESH_SPELL_SLOTS
    val s1 = s0.with("dead", true).with("hp", 0)
    val ss1 = pBreakConcOnStateChange(ss0, s0, s1)
    assert(ss1 == ss0)
  }
}
