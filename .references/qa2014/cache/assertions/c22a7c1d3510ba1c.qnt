// Source: https://rpg.stackexchange.com/q/199803
module _qa_c22a7c1d3510ba1c {
  import dnd.* from "./dnd"

  // Does anything stop a sorcerer stockpiling spell slots?
  // Accepted answer: sorcerer-created spell slots vanish on long rest (slotsCurrent resets to slotsMax)
  run qa_sorcerer_created_slots_vanish_on_long_rest = {
    // Sorcerer has 2 level-1 slots max, but created 2 extras via sorcery points (4 current)
    val sorcererSlots: SpellSlotState = {
      slotsMax: Map(1 -> 2, 2 -> 0, 3 -> 0, 4 -> 0, 5 -> 0, 6 -> 0, 7 -> 0, 8 -> 0, 9 -> 0),
      slotsCurrent: Map(1 -> 4, 2 -> 0, 3 -> 0, 4 -> 0, 5 -> 0, 6 -> 0, 7 -> 0, 8 -> 0, 9 -> 0),
      pactSlotsMax: 0,
      pactSlotsCurrent: 0,
      pactSlotLevel: 0,
      concentrationSpellId: "",
    }
    val afterRest = pRestoreAllSlots(sorcererSlots)
    // Extra created slots are gone; only the base max remains
    assert(afterRest.slotsCurrent.get(1) == 2)
  }
}
