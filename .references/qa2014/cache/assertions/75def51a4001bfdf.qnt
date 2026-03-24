// Source: https://rpg.stackexchange.com/q/184149
module _qa_75def51a4001bfdf {
  import dnd.* from "./dnd"

  // Thief of Five Fates: without warlock pact slots, the invocation cannot be used (useless for non-warlocks)
  run qa_thief_of_five_fates_no_pact_slots_cannot_cast = {
    // Non-warlock: no pact slots at all
    val ss = FRESH_SPELL_SLOTS
    // pCanCastWithPactSlot requires pactSlotsCurrent > 0 AND pactSlotLevel >= spellLevel
    // Bane is a 1st-level spell; neither condition is met
    assert(not(pCanCastWithPactSlot(ss, 1)))
  }
  
  // Thief of Five Fates: regular spell slots do NOT substitute for warlock spell slots
  run qa_thief_of_five_fates_regular_slots_dont_substitute = {
    // Character has a full complement of regular level-1 slots but zero pact slots
    val regularSlots = EMPTY_SLOTS.set(1, 4)
    val ss = FRESH_SPELL_SLOTS
                .with("slotsMax", regularSlots)
                .with("slotsCurrent", regularSlots)
    // Must still fail: pCanCastWithPactSlot only checks pactSlotsCurrent, not slotsCurrent
    assert(not(pCanCastWithPactSlot(ss, 1)))
  }
  
  // Thief of Five Fates: pExpendPactSlot is a no-op when no pact slots exist
  run qa_thief_of_five_fates_expend_pact_noop = {
    val ss = FRESH_SPELL_SLOTS  // pactSlotsCurrent = 0
    val ss1 = pExpendPactSlot(ss)
    assert(ss1 == ss)
  }
  
  // Thief of Five Fates: a warlock with pact slots CAN use the invocation (control case)
  run qa_thief_of_five_fates_warlock_has_slot_can_cast = {
    // Warlock with one pact slot at level 2 (>= bane's required level 1)
    val ss = FRESH_SPELL_SLOTS
                .with("pactSlotsMax", 1)
                .with("pactSlotsCurrent", 1)
                .with("pactSlotLevel", 2)
    assert(pCanCastWithPactSlot(ss, 1))
  }
  
  // Thief of Five Fates: after a warlock expends their only pact slot, the invocation becomes unusable
  run qa_thief_of_five_fates_slot_exhausted_after_use = {
    val ss = FRESH_SPELL_SLOTS
                .with("pactSlotsMax", 1)
                .with("pactSlotsCurrent", 1)
                .with("pactSlotLevel", 1)
    val ssAfter = pExpendPactSlot(ss)
    // Slot was consumed; can no longer cast until a short/long rest
    assert(not(pCanCastWithPactSlot(ssAfter, 1)))
  }
  
  // Thief of Five Fates: short rest restores pact slots, making the invocation available again
  run qa_thief_of_five_fates_short_rest_restores_pact_slot = {
    val ss = FRESH_SPELL_SLOTS
                .with("pactSlotsMax", 1)
                .with("pactSlotsCurrent", 0)
                .with("pactSlotLevel", 1)
    val ssRestored = pRestorePactSlots(ss)
    assert(pCanCastWithPactSlot(ssRestored, 1))
  }
}
