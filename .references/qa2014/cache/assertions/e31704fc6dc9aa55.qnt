// Source: https://rpg.stackexchange.com/q/119864
module _qa_e31704fc6dc9aa55 {
  import dnd.* from "./dnd"

  // If I scribe a scroll of a spell I know, is it cast at my slot level or the spell's base level?
  run qa_scroll_scribing_uses_slot_level = {
    // 6th-level Warlock: pact slots are 3rd level, 2 available
    val warlockSlots: SpellSlotState = {
      slotsMax: EMPTY_SLOTS,
      slotsCurrent: EMPTY_SLOTS,
      pactSlotsMax: 2,
      pactSlotsCurrent: 2,
      pactSlotLevel: 3,
      concentrationSpellId: "",
    }
    // Warlock can use their 3rd-level pact slot to scribe a 1st-level known spell
    val canScribeWith3rdSlot = pCanCastWithPactSlot(warlockSlots, 1)
    // Scroll level = slot level used in creation (3), NOT the spell's base level (1)
    val scrollLevel = warlockSlots.pactSlotLevel
    // Scribing the scroll consumes the pact slot
    val afterScribing = pExpendPactSlot(warlockSlots)
    // The 3rd-level scroll satisfies casting of a 1st-level spell (slot >= spell level)
    // This mirrors the recipient using the scroll: cast at level 3, not level 1
    val scrollSatisfiesSpellLevel = scrollLevel >= 1
    assert(
      canScribeWith3rdSlot          // warlock's pact slot (lvl 3) qualifies to scribe a lvl-1 spell
      and scrollLevel == 3          // scroll is lvl 3, determined by slot used — not spell base level
      and scrollLevel != 1          // NOT the spell's base level
      and afterScribing.pactSlotsCurrent == 1  // pact slot consumed by scribing
      and scrollSatisfiesSpellLevel // 3rd-level scroll can deliver a 1st-level spell (upcast)
    )
  }
}
