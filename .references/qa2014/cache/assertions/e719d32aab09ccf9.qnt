// Source: https://rpg.stackexchange.com/q/70821
module _qa_e719d32aab09ccf9 {
  import dnd.* from "./dnd"

  // Pearl of Power: 4th-level+ expended slot converts to 3rd-level slot (DMG errata)
  run qa_pearl_of_power_converts_4th_plus_to_3rd = {
    // Warlock at level 9+ has level-5 pact slots
    val warlockSlots: SpellSlotState = {
      slotsMax: EMPTY_SLOTS,
      slotsCurrent: EMPTY_SLOTS,
      pactSlotsMax: 1,
      pactSlotsCurrent: 1,
      pactSlotLevel: 5,
      concentrationSpellId: "",
    }
    // Step 1: expend the level-5 pact slot
    val afterExpend = pExpendPactSlot(warlockSlots)
    // Step 2: Pearl of Power — pactSlotLevel >= 4, so restore a 3rd-level slot (not 5th)
    val restoredLevel = if (warlockSlots.pactSlotLevel >= 4) 3 else warlockSlots.pactSlotLevel
    val afterPearl = afterExpend.with(
      "slotsCurrent",
      afterExpend.slotsCurrent.set(restoredLevel, afterExpend.slotsCurrent.get(restoredLevel) + 1)
    )
    assert(
      // Pact slot is NOT restored — the pearl doesn't return the high-level slot
      afterPearl.pactSlotsCurrent == 0
      // A 3rd-level regular slot is gained instead
      and afterPearl.slotsCurrent.get(3) == 1
      // No 5th-level regular slot was created
      and afterPearl.slotsCurrent.get(5) == 0
    )
  }
  
  // Pearl of Power: recovered 3rd-level slot is still usable, so pearl is not useless for high-level warlocks
  run qa_pearl_of_power_still_useful_high_level_warlock = {
    val warlockSlots: SpellSlotState = {
      slotsMax: EMPTY_SLOTS,
      slotsCurrent: EMPTY_SLOTS,
      pactSlotsMax: 1,
      pactSlotsCurrent: 1,
      pactSlotLevel: 5,
      concentrationSpellId: "",
    }
    val afterExpend = pExpendPactSlot(warlockSlots)
    // Pearl gives back a 3rd-level slot for the expended level-5 pact slot
    val afterPearl = afterExpend.with(
      "slotsCurrent",
      afterExpend.slotsCurrent.set(3, afterExpend.slotsCurrent.get(3) + 1)
    )
    assert(
      // Recovered 3rd-level slot can cast level 1, 2, or 3 spells
      pCanCastAtLevel(afterPearl, 1, 3)
      and pCanCastAtLevel(afterPearl, 2, 3)
      and pCanCastAtLevel(afterPearl, 3, 3)
      // But cannot upcast to 4th level from a 3rd-level slot
      and not(pCanCastAtLevel(afterPearl, 4, 3))
    )
  }
  
  // Pearl of Power: low-level warlock (pact slot <= 3) restores at original level unchanged
  run qa_pearl_of_power_low_level_warlock_no_conversion = {
    // Warlock at level 5 has level-3 pact slots
    val warlockSlots: SpellSlotState = {
      slotsMax: EMPTY_SLOTS,
      slotsCurrent: EMPTY_SLOTS,
      pactSlotsMax: 1,
      pactSlotsCurrent: 1,
      pactSlotLevel: 3,
      concentrationSpellId: "",
    }
    val afterExpend = pExpendPactSlot(warlockSlots)
    // Pearl: pactSlotLevel (3) < 4, so restore at original level (3) — no conversion needed
    val restoredLevel = if (warlockSlots.pactSlotLevel >= 4) 3 else warlockSlots.pactSlotLevel
    // restoredLevel == 3 either way here, but the logic is identical to the high-level case
    val afterPearl = afterExpend.with(
      "slotsCurrent",
      afterExpend.slotsCurrent.set(restoredLevel, afterExpend.slotsCurrent.get(restoredLevel) + 1)
    )
    assert(
      restoredLevel == 3
      and afterPearl.slotsCurrent.get(3) == 1
    )
  }
}
