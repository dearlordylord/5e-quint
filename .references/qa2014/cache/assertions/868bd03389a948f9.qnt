// Source: https://rpg.stackexchange.com/q/88635
module _qa_868bd03389a948f9 {
  import dnd.* from "./dnd"

  // Is the Turn Undead really usable only once a day at level 1 through 5?
  // Model Channel Divinity as a pact-slot pool (1 use, resets on short OR long rest)
  
  // Using Turn Undead consumes the single Channel Divinity use
  run qa_channel_divinity_expend_shared_use = {
    val cdSlots = FRESH_SPELL_SLOTS.with("pactSlotsMax", 1).with("pactSlotsCurrent", 1).with("pactSlotLevel", 1)
    val afterTurnUndead = pExpendPactSlot(cdSlots)
    assert(afterTurnUndead.pactSlotsCurrent == 0)
  }
  
  // Channel Divinity resets on short rest, not only long rest
  run qa_channel_divinity_resets_on_short_rest = {
    val cdSlots = FRESH_SPELL_SLOTS.with("pactSlotsMax", 1).with("pactSlotsCurrent", 1).with("pactSlotLevel", 1)
    val afterUse = pExpendPactSlot(cdSlots)
    val afterShortRest = pRestorePactSlots(afterUse)
    assert(afterShortRest.pactSlotsCurrent == 1)
  }
  
  // Channel Divinity also resets on long rest
  run qa_channel_divinity_resets_on_long_rest = {
    val cdSlots = FRESH_SPELL_SLOTS.with("pactSlotsMax", 1).with("pactSlotsCurrent", 1).with("pactSlotLevel", 1)
    val afterUse = pExpendPactSlot(cdSlots)
    val afterLongRest = pRestoreAllSlots(afterUse)
    assert(afterLongRest.pactSlotsCurrent == 1)
  }
  
  // Turn Undead and domain features (e.g. Preserve Life) share the same pool —
  // using one blocks the other until next rest
  run qa_channel_divinity_no_second_use_same_rest = {
    val cdSlots = FRESH_SPELL_SLOTS.with("pactSlotsMax", 1).with("pactSlotsCurrent", 1).with("pactSlotLevel", 1)
    val afterTurnUndead = pExpendPactSlot(cdSlots)
    // Attempting a second CD use (e.g. Preserve Life) is a no-op — pool already empty
    val afterDomainFeature = pExpendPactSlot(afterTurnUndead)
    assert(afterDomainFeature.pactSlotsCurrent == 0)
  }
}
