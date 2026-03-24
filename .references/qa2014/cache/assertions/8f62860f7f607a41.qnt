// Source: https://rpg.stackexchange.com/q/122701
module _qa_8f62860f7f607a41 {
  import dnd.* from "./dnd"

  // Can you long/short rest during Astral Projection? — long rest restores HP and spell slots (no restriction in astral form)
  run qa_long_rest_during_astral_projection_restores_resources = {
    val depletedSlots: SpellSlotState = {
      slotsMax: Map(1 -> 4, 2 -> 3, 3 -> 3, 4 -> 3, 5 -> 2, 6 -> 1, 7 -> 1, 8 -> 1, 9 -> 1),
      slotsCurrent: Map(1 -> 0, 2 -> 0, 3 -> 0, 4 -> 0, 5 -> 0, 6 -> 0, 7 -> 0, 8 -> 0, 9 -> 0),
      pactSlotsMax: 0,
      pactSlotsCurrent: 0,
      pactSlotLevel: 0,
      concentrationSpellId: "",
    }
    val creature = freshCreature(20).with("hp", 5).with("hitDiceRemaining", 2)
    // totalHitDice=5: spent=3, maxRecover=max(1,2)=2 → hitDiceRemaining ends at 4
    val rested = pLongRest(creature, 5, true)
    val ssRested = pRestoreAllSlots(depletedSlots)
    assert(
      rested.hp == 20 and
      rested.hitDiceRemaining == 4 and
      ssRested.slotsCurrent.get(1) == 4 and
      ssRested.slotsCurrent.get(3) == 3 and
      ssRested.slotsCurrent.get(9) == 1
    )
  }
  
  // Can you long/short rest during Astral Projection? — short rest restores warlock pact slots but not regular slots
  run qa_short_rest_during_astral_projection_warlock_pact_slots = {
    val warlockSlots: SpellSlotState = {
      slotsMax: Map(1 -> 0, 2 -> 0, 3 -> 0, 4 -> 0, 5 -> 0, 6 -> 0, 7 -> 0, 8 -> 0, 9 -> 0),
      slotsCurrent: Map(1 -> 0, 2 -> 0, 3 -> 0, 4 -> 0, 5 -> 0, 6 -> 0, 7 -> 0, 8 -> 0, 9 -> 0),
      pactSlotsMax: 2,
      pactSlotsCurrent: 0,
      pactSlotLevel: 3,
      concentrationSpellId: "",
    }
    // Short rest: pact slots recover; regular slots do not
    val ssAfterShortRest = pRestorePactSlots(warlockSlots)
    assert(
      ssAfterShortRest.pactSlotsCurrent == 2 and
      ssAfterShortRest.slotsCurrent.get(1) == 0 and
      ssAfterShortRest.slotsCurrent.get(3) == 0
    )
  }
  
  // Can you long/short rest during Astral Projection? — short rest does NOT recover hit dice
  run qa_short_rest_during_astral_projection_no_hit_die_recovery = {
    val creature = freshCreature(20).with("hp", 10).with("hitDiceRemaining", 1)
    // Short rest with no rolls spent — hit dice not recovered (only long rest recovers them)
    val rested = pShortRest(creature, 2, [])
    assert(rested.hitDiceRemaining == 1)
  }
}
