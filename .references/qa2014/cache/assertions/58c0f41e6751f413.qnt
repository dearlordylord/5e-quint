// Source: https://rpg.stackexchange.com/q/168563
module _qa_58c0f41e6751f413 {
  import dnd.* from "./dnd"

  // Magic Initiate feat: 1st-level spell needs no spell slot; long rest is the only reset mechanism
  run qa_magic_initiate_no_slot_needed = {
    // Character with 2 first-level spell slots (e.g., a multiclassed caster)
    val slots = FRESH_SPELL_SLOTS
      .with("slotsMax", EMPTY_SLOTS.set(1, 2))
      .with("slotsCurrent", EMPTY_SLOTS.set(1, 2))
  
    // Normal slot-based cast consumes a slot (the standard spellcasting path)
    val afterNormalCast = pExpendSlot(slots, 1)
  
    // Magic Initiate cast: NOT slot-based — PHB p.201 "special abilities that let them
    // cast spells without using spell slots"; no pExpendSlot called
    val afterMICast = slots  // slot state unchanged — MI feat spell needs no spell slot
  
    // Long rest restores all spell slots (the same rest that resets the once-per-LR MI use)
    val afterLR = pRestoreAllSlots(afterNormalCast)
  
    assert(
      // Normal cast reduces available slots by 1
      afterNormalCast.slotsCurrent.get(1) == 1
      // Magic Initiate cast leaves all slots intact
      and afterMICast.slotsCurrent.get(1) == 2
      // Long rest brings slots back to maximum
      and afterLR.slotsCurrent.get(1) == 2
    )
  }
}
