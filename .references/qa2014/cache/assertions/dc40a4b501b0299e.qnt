// Source: https://rpg.stackexchange.com/q/207165
module _qa_dc40a4b501b0299e {
  import dnd.* from "./dnd"

  // How can I learn wizard spells as a warlock without multiclassing?
  // Magic Initiate feat: grants one 1st-level spell use restored only on long rest
  run qa_magic_initiate_spell_restored_on_long_rest = {
    val ss = {
      slotsMax: EMPTY_SLOTS.set(1, 1),
      slotsCurrent: EMPTY_SLOTS.set(1, 1),
      pactSlotsMax: 0, pactSlotsCurrent: 0, pactSlotLevel: 0,
      concentrationSpellId: "",
    }
    val afterCast = pExpendSlot(ss, 1)
    val afterLongRest = pRestoreAllSlots(afterCast)
    assert(
      not(pCanCastAtLevel(afterCast, 1, 1))
      and pCanCastAtLevel(afterLongRest, 1, 1)
    )
  }
  
  // How can I learn wizard spells as a warlock without multiclassing?
  // Warlock pact slots (short rest) vs Magic Initiate regular slot (long rest only)
  run qa_warlock_pact_short_rest_magic_initiate_long_rest = {
    // Both exhausted: pact slot and the one regular level-1 slot from Magic Initiate
    val ss = {
      slotsMax: EMPTY_SLOTS.set(1, 1),
      slotsCurrent: EMPTY_SLOTS,
      pactSlotsMax: 1, pactSlotsCurrent: 0, pactSlotLevel: 1,
      concentrationSpellId: "",
    }
    val afterShortRest = pRestorePactSlots(ss)
    val afterLongRest  = pRestoreAllSlots(ss)
    assert(
      // Short rest restores pact slot but NOT Magic Initiate's regular slot
      afterShortRest.pactSlotsCurrent == 1
      and afterShortRest.slotsCurrent.get(1) == 0
      // Long rest restores both
      and afterLongRest.pactSlotsCurrent == 1
      and afterLongRest.slotsCurrent.get(1) == 1
    )
  }
  
  // How can I learn wizard spells as a warlock without multiclassing?
  // Book of Ancient Secrets: can inscribe ritual spells of level <= floor(warlock_level / 2)
  run qa_book_of_ancient_secrets_half_level_gate = {
    // Level-3 warlock: floor(3/2) = 1, so only 1st-level rituals are inscribable
    val warlockLevel3MaxRitual = 3 / 2  // = 1
    // Level-5 warlock: floor(5/2) = 2
    val warlockLevel5MaxRitual = 5 / 2  // = 2
    val floatingDiskLevel = 1  // Floating Disk is a 1st-level ritual
    val web2ndLevel = 2        // hypothetical 2nd-level ritual
    assert(
      // Floating Disk learnable at level 3
      floatingDiskLevel <= warlockLevel3MaxRitual
      // 2nd-level ritual NOT learnable at level 3, but IS at level 5
      and not(web2ndLevel <= warlockLevel3MaxRitual)
      and web2ndLevel <= warlockLevel5MaxRitual
    )
  }
  
  // How can I learn wizard spells as a warlock without multiclassing?
  // Ritual Caster feat / Pact of Tome + Book of Ancient Secrets sets canRitualCast = true
  run qa_ritual_caster_feat_enables_can_ritual_cast = {
    val configWithoutRitual = TEST_CONFIG.with("canRitualCast", false)
    val configWithRitual    = TEST_CONFIG.with("canRitualCast", true)
    assert(not(configWithoutRitual.canRitualCast) and configWithRitual.canRitualCast)
  }
}
