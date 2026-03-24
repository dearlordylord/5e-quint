// Source: https://rpg.stackexchange.com/q/141816
module _qa_e9f32a6d6a0c02c4 {
  import dnd.* from "./dnd"

  // How often can spells be cast from a Rod of Alertness? - unlimited casts, one action each, resets each turn
  run qa_rod_of_alertness_unlimited_casts = {
    val creature = freshCreature(20)
    val turn1 = FRESH_TURN
  
    // First cast: use action for the rod spell
    val turn1_after = pUseAction(turn1, creature, ACastSpell)
  
    // New turn resets action economy — rod can be used again
    val turn2 = pStartTurn(TEST_CONFIG, creature, Unarmored, false, 0, false, false)
  
    // Second cast on the new turn (demonstrating no per-day limit)
    val turn2_after = pUseAction(turn2, creature, ACastSpell)
  
    assert(
      // Each cast consumes exactly one action
      turn1_after.actionUsed
      // A new turn restores the action (unlimited use across turns)
      and not(turn2.actionUsed)
      // The spell can be cast again on the next turn
      and turn2_after.actionUsed
    )
  }
  
  // How often can spells be cast from a Rod of Alertness? - 3 of 4 rod spells require concentration; new cast replaces old
  run qa_rod_of_alertness_concentration_replacement = {
    val ss0 = FRESH_SPELL_SLOTS
  
    // Concentrating on a rod spell (e.g. detect magic)
    val ss1 = pStartConcentration(ss0, "detect_magic")
  
    // Cast another concentration spell from the same rod — PHB: can't concentrate on two spells
    val ss2 = pStartConcentration(ss1, "see_invisibility")
  
    assert(
      // Old concentration is dropped
      ss2.concentrationSpellId != "detect_magic"
      // Now concentrating on the newly cast rod spell
      and ss2.concentrationSpellId == "see_invisibility"
      and isConcentrating(ss2)
    )
  }
}
