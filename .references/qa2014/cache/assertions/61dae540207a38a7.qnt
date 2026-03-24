// Source: https://rpg.stackexchange.com/q/60523
module _qa_61dae540207a38a7 {
  import dnd.* from "./dnd"

  // Can a wizard have more than one Alarm spell active at once?
  run qa_multiple_alarm_spells_active = {
    // Alarm is non-concentration: casting it does NOT call pStartConcentration.
    // Multiple instances are modeled by repeated casts that never touch concentrationSpellId.
    val ss0 = FRESH_SPELL_SLOTS
    // Cast alarm instance 1 (non-concentration — no pStartConcentration call)
    val ss1 = ss0
    // Cast alarm instance 2 (non-concentration — no pStartConcentration call)
    val ss2 = ss1
    // Contrast: a concentration spell IS exclusive — pStartConcentration replaces the active one
    val ss_conc_a = pStartConcentration(ss0, "hold_person")
    val ss_conc_b = pStartConcentration(ss_conc_a, "web")
    assert(
      // Both Alarm instances coexist: concentration slot never occupied
      not(isConcentrating(ss2)) and
      ss2.concentrationSpellId == "" and
      // Concentration spells are mutually exclusive: second cast evicts the first
      isConcentrating(ss_conc_a) and
      ss_conc_a.concentrationSpellId == "hold_person" and
      ss_conc_b.concentrationSpellId == "web"
    )
  }
}
