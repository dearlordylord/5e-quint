// Source: https://rpg.stackexchange.com/q/183471
module _qa_2e51ada4eb70d476 {
  import dnd.* from "./dnd"

  // Mind spike while concentrating in another spell: casting a concentration spell always breaks existing concentration
  run qa_concentration_spell_breaks_existing = {
    val ss0 = FRESH_SPELL_SLOTS
    val ss1 = pStartConcentration(ss0, "shadow_blade")
    // Warlock casts mind spike (also concentration) — breaks shadow blade
    val ss2 = pStartConcentration(ss1, "mind_spike")
    assert(
      ss1.concentrationSpellId == "shadow_blade" and
      ss2.concentrationSpellId == "mind_spike" and
      ss2.concentrationSpellId != "shadow_blade"
    )
  }
  
  // Cannot opt out of concentrating on new spell to keep the old one: breaking mind spike does not restore shadow blade
  run qa_cannot_opt_out_of_new_concentration_to_keep_old = {
    val ss0 = FRESH_SPELL_SLOTS
    val ss1 = pStartConcentration(ss0, "shadow_blade")
    // Casting mind spike irrevocably breaks shadow blade concentration
    val ss2 = pStartConcentration(ss1, "mind_spike")
    // Even immediately dropping mind spike concentration cannot restore shadow blade
    val ss3 = pBreakConcentration(ss2)
    assert(
      not(isConcentrating(ss3)) and
      ss3.concentrationSpellId != "shadow_blade"
    )
  }
}
