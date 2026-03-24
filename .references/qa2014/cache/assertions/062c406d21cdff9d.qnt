// Source: https://rpg.stackexchange.com/q/88452
module _qa_062c406d21cdff9d {
  import dnd.* from "./dnd"

  // Sending (PHB p.274): 3rd-level spell — slot level must be >= 3 to cast
  run qa_sending_requires_3rd_level_slot = {
      val ss = FRESH_SPELL_SLOTS.with("slotsCurrent", EMPTY_SLOTS.set(3, 2))
      assert(
          // slot level 3 meets spell level 3
          pCanCastAtLevel(ss, 3, 3)
          // slot level 2 is insufficient for a 3rd-level spell
          and not(pCanCastAtLevel(ss, 3, 2))
          // slot level 1 is also insufficient
          and not(pCanCastAtLevel(ss, 3, 1))
      )
  }
  
  // Sending (PHB p.274): upcasting with a 4th- or 5th-level slot is valid
  run qa_sending_upcast_valid = {
      val ss4 = FRESH_SPELL_SLOTS.with("slotsCurrent", EMPTY_SLOTS.set(4, 1))
      val ss5 = FRESH_SPELL_SLOTS.with("slotsCurrent", EMPTY_SLOTS.set(5, 1))
      assert(
          pCanCastAtLevel(ss4, 3, 4)
          and pCanCastAtLevel(ss5, 3, 5)
      )
  }
  
  // Sending (PHB p.274): casting expends exactly one 3rd-level slot
  run qa_sending_expends_slot = {
      val ss = FRESH_SPELL_SLOTS
          .with("slotsMax", EMPTY_SLOTS.set(3, 2))
          .with("slotsCurrent", EMPTY_SLOTS.set(3, 2))
      val ss1 = pExpendSlot(ss, 3)
      assert(
          // one slot consumed
          ss1.slotsCurrent.get(3) == 1
          // other levels untouched
          and ss1.slotsCurrent.get(2) == 0
          and ss1.slotsCurrent.get(4) == 0
          // slot cap unchanged
          and ss1.slotsMax.get(3) == 2
      )
  }
  
  // Sending (PHB p.274): no slots remaining means can't cast even at correct level
  run qa_sending_no_slots_blocks_cast = {
      val ss = FRESH_SPELL_SLOTS  // all slotsCurrent = 0
      assert(
          not(pCanCastAtLevel(ss, 3, 3))
          and not(pCanCastAtLevel(ss, 3, 4))
          and not(pCanCastAtLevel(ss, 3, 5))
      )
  }
}
