// Source: https://rpg.stackexchange.com/q/98014
module _qa_a5957bd5393255f2 {
  import dnd.* from "./dnd"

  // Can a paladin use the Magic Initiate feat or racial spells to smite?
  // Rule: Divine Smite requires expending an actual spell slot; free racial/feat casts grant no slot.
  
  // A paladin with a spell slot can expend it — slot count drops, confirming smite is fueled.
  run qa_divine_smite_slot_is_consumed = {
    val ss = FRESH_SPELL_SLOTS
      .with("slotsMax", EMPTY_SLOTS.set(1, 1))
      .with("slotsCurrent", EMPTY_SLOTS.set(1, 1))
    val afterSmite = pExpendSlot(ss, 1)
    assert(afterSmite.slotsCurrent.get(1) == 0)
  }
  
  // Racial abilities / Magic Initiate grant no spell slots; pExpendSlot is a no-op when empty,
  // modelling that smite cannot be triggered without a real slot to spend.
  run qa_divine_smite_no_slot_no_smite = {
    // FRESH_SPELL_SLOTS has all slots at 0 — simulates racial/feat free-cast scenario
    val afterAttempt = pExpendSlot(FRESH_SPELL_SLOTS, 1)
    assert(afterAttempt == FRESH_SPELL_SLOTS)
  }
  
  // pCanCastAtLevel is false when no slot exists, confirming the smite precondition fails.
  run qa_divine_smite_can_cast_check_no_slot = {
    assert(not(pCanCastAtLevel(FRESH_SPELL_SLOTS, 1, 1)))
  }
  
  // pCanCastAtLevel is true when a slot exists — smite precondition passes with a real slot.
  run qa_divine_smite_can_cast_check_with_slot = {
    val ss = FRESH_SPELL_SLOTS
      .with("slotsMax", EMPTY_SLOTS.set(2, 1))
      .with("slotsCurrent", EMPTY_SLOTS.set(2, 1))
    // A 2nd-level slot satisfies a 1st-level spell slot requirement (slot >= spell level)
    assert(pCanCastAtLevel(ss, 1, 2))
  }
}
