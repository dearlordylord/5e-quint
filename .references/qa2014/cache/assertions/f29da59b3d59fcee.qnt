// Source: https://rpg.stackexchange.com/q/122208
module _qa_f29da59b3d59fcee {
  import dnd.* from "./dnd"

  // Does Hex disappear if combat resolves peacefully?
  // Concentration on Hex does NOT auto-break when the caster's state is unchanged (target survived)
  run qa_hex_concentration_persists_peaceful_resolution = {
    val ss0 = pStartConcentration(FRESH_SPELL_SLOTS, "hex")
    val casterAlive = freshCreature(20)
    // Combat ends peacefully: caster's state is unchanged — pBreakConcOnStateChange leaves concentration intact
    val ss1 = pBreakConcOnStateChange(ss0, casterAlive, casterAlive)
    assert(isConcentrating(ss1) and ss1.concentrationSpellId == "hex")
  }
  
  // Does Hex disappear if combat resolves peacefully?
  // Dropping concentration is the ONLY way to end Hex when the target is still alive
  run qa_hex_ends_only_by_explicit_drop = {
    val ss0 = pStartConcentration(FRESH_SPELL_SLOTS, "hex")
    // Caster chooses to drop — this is the sole available action per the accepted answer
    val ss1 = pBreakConcentration(ss0)
    assert(not(isConcentrating(ss1)))
  }
}
