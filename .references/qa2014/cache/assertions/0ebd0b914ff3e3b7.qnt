// Source: https://rpg.stackexchange.com/q/160875
module _qa_0ebd0b914ff3e3b7 {
  import dnd.* from "./dnd"

  // Does a patron have to know their warlock? (warlock spellcasting is patron-awareness-agnostic at mechanics level)
  // The accepted answer concludes patrons are generally aware, but the GOO may be unaware of the specific warlock.
  // Mechanically: warlock pact slots function regardless of patron awareness — the spec models slot expenditure
  // as a pure function of slot state, with no patron-awareness field. We assert pact slots are expended
  // and restored normally regardless of any narrative context.
  run qa_warlock_pact_slots_function_regardless_of_patron_awareness = {
    // A warlock with 1 pact slot at level 1 (pact slot level 1)
    val warlockSlots: SpellSlotState = {
      slotsMax: EMPTY_SLOTS,
      slotsCurrent: EMPTY_SLOTS,
      pactSlotsMax: 1,
      pactSlotsCurrent: 1,
      pactSlotLevel: 1,
      concentrationSpellId: "",
    }
  
    // Can cast a 1st-level spell using the pact slot (patron awareness irrelevant)
    val canCast = pCanCastWithPactSlot(warlockSlots, 1)
  
    // Expend the pact slot
    val afterCast = pExpendPactSlot(warlockSlots)
  
    // Slot is now gone
    val slotGone = afterCast.pactSlotsCurrent == 0
  
    // Short rest restores pact slot (patron awareness still irrelevant)
    val afterShortRest = pRestorePactSlots(afterCast)
    val slotRestored = afterShortRest.pactSlotsCurrent == 1
  
    // Cannot cast a 2nd-level spell with a 1st-level pact slot
    val cannotUpcast = not(pCanCastWithPactSlot(warlockSlots, 2))
  
    assert(canCast and slotGone and slotRestored and cannotUpcast)
  }
}
