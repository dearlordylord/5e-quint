// Source: https://rpg.stackexchange.com/q/209031
module _qa_6b9aa84274a4542a {
  import dnd.* from "./dnd"

  // Can you use Glyph of Warding to prepare for a difficult fight and avoid total party kill?
  run qa_glyph_healing_word_fits_in_3rd_level_slot = {
    // Healing Word is level 1; Glyph of Warding cast at slot 3: slotLevel >= spellLevel → can store
    val ss = FRESH_SPELL_SLOTS
      .with("slotsCurrent", EMPTY_SLOTS.set(3, 2))
      .with("slotsMax", EMPTY_SLOTS.set(3, 2))
    assert(pCanCastAtLevel(ss, 1, 3))
  }
  
  // Can you use Glyph of Warding to prepare for a difficult fight and avoid total party kill?
  run qa_glyph_aura_of_life_blocked_by_3rd_level_slot = {
    // Aura of Life is level 4; Glyph of Warding cast at slot 3: slotLevel < spellLevel → cannot store
    val ss = FRESH_SPELL_SLOTS
      .with("slotsCurrent", EMPTY_SLOTS.set(3, 2))
      .with("slotsMax", EMPTY_SLOTS.set(3, 2))
    assert(not(pCanCastAtLevel(ss, 4, 3)))
  }
  
  // Can you use Glyph of Warding to prepare for a difficult fight and avoid total party kill?
  run qa_glyph_aura_of_life_allowed_when_upcast_to_4th = {
    // Aura of Life is level 4; Glyph of Warding upcast to slot 4: slotLevel >= spellLevel → can store
    val ss = FRESH_SPELL_SLOTS
      .with("slotsCurrent", EMPTY_SLOTS.set(4, 1))
      .with("slotsMax", EMPTY_SLOTS.set(4, 1))
    assert(pCanCastAtLevel(ss, 4, 4))
  }
  
  // Can you use Glyph of Warding to prepare for a difficult fight and avoid total party kill?
  run qa_glyph_casting_expends_the_slot = {
    // Creating a Glyph of Warding expends the slot used to cast it
    val ss = FRESH_SPELL_SLOTS
      .with("slotsCurrent", EMPTY_SLOTS.set(3, 1))
      .with("slotsMax", EMPTY_SLOTS.set(3, 1))
    val ssAfter = pExpendSlot(ss, 3)
    assert(ssAfter.slotsCurrent.get(3) == 0)
  }
}
