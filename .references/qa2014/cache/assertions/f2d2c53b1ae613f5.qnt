// Source: https://rpg.stackexchange.com/q/168998
module _qa_f2d2c53b1ae613f5 {
  import dnd.* from "./dnd"

  // RAW can an Eldritch Knight 9/Wizard 2 multiclass cast/learn 3rd level spells?
  run qa_ek9_wiz2_multiclass_caster_level = {
    // EK is a 1/3 caster (9 levels → 3 effective); Wizard is full (2 levels → 2 effective)
    assert(pMulticlassCasterLevel(2, 0, 9) == 5)
  }
  
  // EK9/Wiz2 multiclass table grants 3rd-level slots despite neither class allowing 3rd-level spells at those levels
  run qa_ek9_wiz2_3rd_level_slot_count = {
    // PHB multiclass spellcaster table: caster level 5 → 2 slots at spell level 3
    assert(pSlotsPerLevel(5, 3) == 2)
  }
  
  // EK9 alone has no 3rd-level slots — shows the Wizard levels are what push over the threshold
  run qa_ek9_alone_no_3rd_level_slots = {
    // EK9 single-class: effective caster level = floor(9/3) = 3 → 0 third-level slots
    assert(pSlotsPerLevel(3, 3) == 0)
  }
  
  // EK9/Wiz2 can upcast a 2nd-level known spell using a 3rd-level slot (the accepted answer's key claim)
  run qa_ek9_wiz2_upcast_2nd_to_3rd_slot = {
    // Build slot state with 2 third-level slots (as granted by caster level 5 table)
    val slots = FRESH_SPELL_SLOTS.with("slotsCurrent", EMPTY_SLOTS.set(3, 2))
    // spellLevel=2 (max EK9 can learn), slotLevel=3 → pCanCastAtLevel: slot >= spell and slot available
    assert(pCanCastAtLevel(slots, 2, 3))
  }
  
  // EK9/Wiz2 can also upcast a 1st-level spell to 3rd-level using the same slots
  run qa_ek9_wiz2_upcast_1st_to_3rd_slot = {
    val slots = FRESH_SPELL_SLOTS.with("slotsCurrent", EMPTY_SLOTS.set(3, 2))
    assert(pCanCastAtLevel(slots, 1, 3))
  }
}
