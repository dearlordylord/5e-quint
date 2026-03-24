// Source: https://rpg.stackexchange.com/q/105205
module _qa_e68c7361746494f0 {
  import dnd.* from "./dnd"

  // Which spell casting level do you use when casting spells with a Staff of Power?
  // DMG p.141: spells from magic items cast at lowest possible spell level unless specified.
  run qa_magic_item_spell_minimum_level_ray_of_enfeeblement = {
    // Ray of Enfeeblement is 2nd level → Staff of Power expends a 2nd-level slot, not higher.
    val ss = FRESH_SPELL_SLOTS
      .with("slotsMax", EMPTY_SLOTS.set(2, 1).set(5, 1))
      .with("slotsCurrent", EMPTY_SLOTS.set(2, 1).set(5, 1))
    val rayBaseLevel = 2
    val afterCast = pExpendSlot(ss, rayBaseLevel)
    assert(
      // Minimum level is castable
      pCanCastAtLevel(ss, rayBaseLevel, rayBaseLevel)
      // 2nd-level slot consumed
      and afterCast.slotsCurrent.get(2) == 0
      // 5th-level slot untouched — magic item does NOT upcast
      and afterCast.slotsCurrent.get(5) == 1
    )
  }
  
  // Which spell casting level do you use when casting spells with a Staff of Power?
  // Cone of Cold is a 5th-level spell; its minimum is 5th, so a 5th-level slot is expended.
  run qa_magic_item_spell_minimum_level_cone_of_cold = {
    val ss = FRESH_SPELL_SLOTS
      .with("slotsMax", EMPTY_SLOTS.set(5, 2).set(9, 1))
      .with("slotsCurrent", EMPTY_SLOTS.set(5, 2).set(9, 1))
    val coneBaseLevel = 5
    val afterCast = pExpendSlot(ss, coneBaseLevel)
    assert(
      // Minimum level is castable
      pCanCastAtLevel(ss, coneBaseLevel, coneBaseLevel)
      // One 5th-level slot consumed
      and afterCast.slotsCurrent.get(5) == 1
      // 9th-level slot untouched — magic item does NOT upcast to highest available
      and afterCast.slotsCurrent.get(9) == 1
    )
  }
}
