module _qa_03d2e4c570a19b2e {
  import dnd.* from "./dnd"

  // In what ways can a druid's Wild Shape be detected?
  run qa_wild_shape_detect_magic_castable_with_1st_level_slot = {
    // Detect Magic is a 1st-level spell; any caster with a 1st-level slot can use it to sense Wild Shape's aura
    val ss = FRESH_SPELL_SLOTS
      .with("slotsMax", EMPTY_SLOTS.set(1, 4))
      .with("slotsCurrent", EMPTY_SLOTS.set(1, 4))
    assert(pCanCastAtLevel(ss, 1, 1))
  }
  
  // In what ways can a druid's Wild Shape be detected?
  run qa_wild_shape_true_seeing_requires_6th_level_slot = {
    // True Seeing is a 6th-level spell; a 5th-level slot is insufficient — slotLevel must be >= spellLevel
    val ss = FRESH_SPELL_SLOTS
      .with("slotsMax", EMPTY_SLOTS.set(5, 2).set(6, 1))
      .with("slotsCurrent", EMPTY_SLOTS.set(5, 2).set(6, 1))
    assert(not(pCanCastAtLevel(ss, 6, 5)) and pCanCastAtLevel(ss, 6, 6))
  }
  
  // In what ways can a druid's Wild Shape be detected?
  run qa_wild_shape_true_seeing_expends_only_6th_slot = {
    // Casting True Seeing expends the single 6th-level slot, leaving it unavailable for a second cast
    val ss = FRESH_SPELL_SLOTS
      .with("slotsMax", EMPTY_SLOTS.set(6, 1))
      .with("slotsCurrent", EMPTY_SLOTS.set(6, 1))
    val ssAfter = pExpendSlot(ss, 6)
    assert(ssAfter.slotsCurrent.get(6) == 0 and not(pCanCastAtLevel(ssAfter, 6, 6)))
  }
  
  // In what ways can a druid's Wild Shape be detected?
  run qa_wild_shape_detect_magic_expended_blocks_casting = {
    // Once the 1st-level slot is spent on Detect Magic, no further castings are possible without ritual or new slot
    val ss = FRESH_SPELL_SLOTS
      .with("slotsMax", EMPTY_SLOTS.set(1, 1))
      .with("slotsCurrent", EMPTY_SLOTS.set(1, 1))
    val ssAfter = pExpendSlot(ss, 1)
    assert(not(pCanCastAtLevel(ssAfter, 1, 1)))
  }
}
