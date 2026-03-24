// Source: https://rpg.stackexchange.com/q/211794
module _qa_7234d9338cffac5c {
  import dnd.* from "./dnd"

  // Do you have to be holding the agate for Awaken to awaken a beast/plant?
  // Instantaneous duration: full effect (including the touch) resolves at cast time; no stored effect for later
  run qa_instantaneous_awaken_no_deferred_touch = {
    val slots: SpellSlotState = {
      slotsMax: Map(1->4, 2->3, 3->3, 4->3, 5->2, 6->1, 7->1, 8->1, 9->1),
      slotsCurrent: Map(1->4, 2->3, 3->3, 4->3, 5->2, 6->1, 7->1, 8->1, 9->1),
      pactSlotsMax: 0, pactSlotsCurrent: 0, pactSlotLevel: 0,
      concentrationSpellId: "",
    }
    // Awaken is 5th-level, instantaneous: casting = slot consumed + effect resolves immediately
    val afterCast = pExpendSlot(slots, 5)
    // No concentration started means no stored/pending effect — the touch cannot be deferred
    // A second awakening requires a fresh slot expenditure right then and there
    val afterSecondCast = pExpendSlot(afterCast, 5)
    assert(
      afterCast.slotsCurrent.get(5) == 1        // first slot consumed
      and not(isConcentrating(afterCast))        // no ongoing effect to trigger later
      and afterSecondCast.slotsCurrent.get(5) == 0 // each target needs its own immediate casting
      and not(isConcentrating(afterSecondCast))  // still no stored effect after second cast
    )
  }
}
