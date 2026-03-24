// Source: https://rpg.stackexchange.com/q/211315
module _qa_5edd82959f01f2f8 {
  import dnd.* from "./dnd"

  // D&D 5e: Does the same spell prepared for different levels count as multiple prepared spells or the same prepared single spell?
  run qa_prepared_spell_single_entry_multiple_slot_levels = {
    // A level-4 cleric with 1st- and 2nd-level slots available.
    // Healing Word is a 1st-level spell prepared exactly once.
    // The spec separates preparation (not tracked) from slot expenditure,
    // encoding the PHB rule: one prepared spell entry, cast at any slot level >= spell level.
    val ss = {
      slotsMax: Map(1 -> 3, 2 -> 2, 3 -> 0, 4 -> 0, 5 -> 0, 6 -> 0, 7 -> 0, 8 -> 0, 9 -> 0),
      slotsCurrent: Map(1 -> 3, 2 -> 2, 3 -> 0, 4 -> 0, 5 -> 0, 6 -> 0, 7 -> 0, 8 -> 0, 9 -> 0),
      pactSlotsMax: 0,
      pactSlotsCurrent: 0,
      pactSlotLevel: 0,
      concentrationSpellId: "",
    }
    // Healing Word (spellLevel=1) can be cast with a 1st-level slot (normal cast)
    val canCastAtLevel1 = pCanCastAtLevel(ss, 1, 1)
    // ...or upcast with a 2nd-level slot — no second preparation required
    val canCastAtLevel2 = pCanCastAtLevel(ss, 1, 2)
    // Upcasting (expending a 2nd-level slot) does not affect 1st-level slots
    val ssAfterUpcast = pExpendSlot(ss, 2)
    val level1SlotsUntouched = ssAfterUpcast.slotsCurrent.get(1) == 3
    val level2SlotDecremented = ssAfterUpcast.slotsCurrent.get(2) == 1
    assert(canCastAtLevel1 and canCastAtLevel2 and level1SlotsUntouched and level2SlotDecremented)
  }
}
