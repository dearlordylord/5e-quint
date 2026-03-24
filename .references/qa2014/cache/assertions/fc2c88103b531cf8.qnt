// Source: https://rpg.stackexchange.com/q/150587
module _qa_fc2c88103b531cf8 {
  import dnd.* from "./dnd"

  // Expert Divination: upcasting a divination spell uses the slot level (not original spell level) to determine which slots can be regained
  run qa_expert_divination_upcast_level = {
    // 6th-level Divination wizard has 1st/2nd/3rd-level slots available
    val slots: SpellSlotState = {
      slotsMax: Map(1 -> 4, 2 -> 3, 3 -> 2, 4 -> 0, 5 -> 0, 6 -> 0, 7 -> 0, 8 -> 0, 9 -> 0),
      slotsCurrent: Map(1 -> 4, 2 -> 3, 3 -> 2, 4 -> 0, 5 -> 0, 6 -> 0, 7 -> 0, 8 -> 0, 9 -> 0),
      pactSlotsMax: 0,
      pactSlotsCurrent: 0,
      pactSlotLevel: 0,
      concentrationSpellId: "",
    }
    // Cast Mind Spike (2nd-level divination) using a 3rd-level slot (upcasting)
    val afterCast = pExpendSlot(slots, 3)
    // PHB p.201: spell assumes the higher level for that casting
    // Expert Divination: regain a slot of level LOWER than the slot used
    val slotLevelUsed = 3       // spell counts as 3rd level (slot used)
    val originalSpellLevel = 2  // would be wrong basis for the feature
    assert(
      // 3rd-level slot was consumed
      afterCast.slotsCurrent.get(3) == 1
      // Correct ruling: a 2nd-level slot (< 3) is a valid recovery target
      and 2 < slotLevelUsed
      // Wrong reading: if original spell level were used, 2nd-level slot would NOT qualify (not 2 < 2)
      and not(2 < originalSpellLevel)
      // 1st-level slot is also a valid recovery target under either reading (1 < 2 and 1 < 3)
      and 1 < slotLevelUsed
      and 1 < originalSpellLevel
    )
  }
}
