// Source: https://rpg.stackexchange.com/q/123553
module _qa_d4e83b58a3e50aa1 {
  import dnd.* from "./dnd"

  // How many times per rest cycle can a cleric cast their domain spells? And at what level are they cast?
  run qa_domain_spell_uses_slot = {
    // Domain spells consume regular spell slots — not free like cantrips
    val slots = EMPTY_SLOTS.set(1, 2)
    val ss = FRESH_SPELL_SLOTS.with("slotsMax", slots).with("slotsCurrent", slots)
    val ss1 = pExpendSlot(ss, 1)
    assert(ss1.slotsCurrent.get(1) == 1)
  }
  
  // Domain spell upcast: using a higher-level slot consumes that slot, not the spell's base slot
  run qa_domain_spell_upcast_uses_higher_slot = {
    val slots = EMPTY_SLOTS.set(1, 2).set(4, 1)
    val ss = FRESH_SPELL_SLOTS.with("slotsMax", slots).with("slotsCurrent", slots)
    // PHB: "if you use a higher-level slot to cast it, it will consume a slot of the level you used"
    val canUpcast = pCanCastAtLevel(ss, 1, 4)
    val ss1 = pExpendSlot(ss, 4)
    assert(canUpcast and ss1.slotsCurrent.get(4) == 0 and ss1.slotsCurrent.get(1) == 2)
  }
  
  // Domain spell slots are NOT restored on short rest — only on long rest
  run qa_domain_spells_restore_on_long_rest_only = {
    val slots = EMPTY_SLOTS.set(1, 2)
    val ss = FRESH_SPELL_SLOTS.with("slotsMax", slots).with("slotsCurrent", slots)
    val ss1 = pExpendSlot(ss, 1)
    val ssAfterShortRest = pRestorePactSlots(ss1)
    val ssAfterLongRest  = pRestoreAllSlots(ss1)
    assert(
      ssAfterShortRest.slotsCurrent.get(1) == 1 and
      ssAfterLongRest.slotsCurrent.get(1)  == 2
    )
  }
}
