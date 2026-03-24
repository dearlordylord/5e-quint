// Source: https://rpg.stackexchange.com/q/99704
module _qa_7d5ca64ae1969b88 {
  import dnd.* from "./dnd"

  // Is there a limit to the number of Unseen Servants I can have?
  run qa_unseen_servant_no_concentration_limit = {
    // Unseen Servant has no concentration requirement and no explicit "only one" clause.
    // Each casting is independent; the only constraint is available spell slots.
    val level1Slots = EMPTY_SLOTS.set(1, 4)
    val slots0 = {
      slotsMax: level1Slots,
      slotsCurrent: level1Slots,
      pactSlotsMax: 0,
      pactSlotsCurrent: 0,
      pactSlotLevel: 0,
      concentrationSpellId: "",
    }
    // Three castings of Unseen Servant: expend a slot each time, never call pStartConcentration
    val slots1 = pExpendSlot(slots0, 1)
    val slots2 = pExpendSlot(slots1, 1)
    val slots3 = pExpendSlot(slots2, 1)
    assert(
      // No concentration active — all three servants coexist with no mutual exclusion
      not(isConcentrating(slots3))
      // Three slots consumed confirms three independent, simultaneous castings
      and slots3.slotsCurrent.get(1) == 1
    )
  }
  
  // Is there a limit to the number of Unseen Servants I can have? (contrast: concentration spells ARE limited)
  run qa_concentration_spell_limited_to_one = {
    // Spells like Hold Person DO call pStartConcentration — each new casting replaces the old one,
    // enforcing the "only one active effect" constraint that Unseen Servant lacks.
    val level1Slots = EMPTY_SLOTS.set(1, 4)
    val slots0 = {
      slotsMax: level1Slots,
      slotsCurrent: level1Slots,
      pactSlotsMax: 0,
      pactSlotsCurrent: 0,
      pactSlotLevel: 0,
      concentrationSpellId: "",
    }
    // Cast a concentration spell on target A, then on target B
    val slots1 = pExpendSlot(pStartConcentration(slots0, "hold_person_target_A"), 1)
    val slots2 = pExpendSlot(pStartConcentration(slots1, "hold_person_target_B"), 1)
    assert(
      // Second casting overwrote the first — only target B is affected
      slots2.concentrationSpellId == "hold_person_target_B"
      and slots2.slotsCurrent.get(1) == 2
    )
  }
}
