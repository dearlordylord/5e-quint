// Source: https://rpg.stackexchange.com/q/99082
module _qa_ad4761cdbb5374c8 {
  import dnd.* from "./dnd"

  // How are resources recovered during a long rest that was interrupted?
  // Spell slots spent mid-rest during interruption combat are fully restored at rest completion.
  run qa_long_rest_restores_slots_spent_during_interruption = {
    val casterLevel5Max = Map(1 -> 4, 2 -> 3, 3 -> 2, 4 -> 0, 5 -> 0, 6 -> 0, 7 -> 0, 8 -> 0, 9 -> 0)
    val ss = {
      slotsMax: casterLevel5Max,
      slotsCurrent: casterLevel5Max,
      pactSlotsMax: 0,
      pactSlotsCurrent: 0,
      pactSlotLevel: 0,
      concentrationSpellId: "",
    }
    // Interruption: casters burn slots fighting the random encounter
    val ssDuringInterruption = pExpendSlot(pExpendSlot(pExpendSlot(ss, 1), 1), 3)
    // Finish the long rest — all slots restored regardless of when spent
    val ssAfterRest = pRestoreAllSlots(ssDuringInterruption)
    assert(ssAfterRest.slotsCurrent == casterLevel5Max)
  }
  
  // How are resources recovered during a long rest that was interrupted?
  // HP lost during rest interruption is fully restored at long rest completion.
  run qa_long_rest_restores_hp_lost_during_interruption = {
    val creature = freshCreature(30).with("hitDiceRemaining", 5)
    // Take damage during the interruption (still conscious: 30 - 18 = 12 HP)
    val damaged = pTakeDamage(creature, 18, Slashing, Set(), Set(), Set(), false)
    // Finish the long rest
    val afterRest = pLongRest(damaged, 5, true)
    assert(afterRest.hp == 30)
  }
  
  // How are resources recovered during a long rest that was interrupted?
  // Slots spent BEFORE the rest started (and again during interruption) are all restored at completion.
  run qa_long_rest_restores_slots_spent_before_and_during_rest = {
    val casterLevel5Max = Map(1 -> 4, 2 -> 3, 3 -> 2, 4 -> 0, 5 -> 0, 6 -> 0, 7 -> 0, 8 -> 0, 9 -> 0)
    // Heavily depleted before rest began
    val ssBeforeRest = {
      slotsMax: casterLevel5Max,
      slotsCurrent: Map(1 -> 1, 2 -> 0, 3 -> 0, 4 -> 0, 5 -> 0, 6 -> 0, 7 -> 0, 8 -> 0, 9 -> 0),
      pactSlotsMax: 0,
      pactSlotsCurrent: 0,
      pactSlotLevel: 0,
      concentrationSpellId: "",
    }
    // Spend last slot during interruption combat
    val ssDuringInterruption = pExpendSlot(ssBeforeRest, 1)
    // Finish long rest
    val ssAfterRest = pRestoreAllSlots(ssDuringInterruption)
    // All slots back regardless of when each was spent
    assert(
      ssAfterRest.slotsCurrent == casterLevel5Max and
      ssAfterRest.slotsCurrent.get(1) == 4 and
      ssAfterRest.slotsCurrent.get(2) == 3 and
      ssAfterRest.slotsCurrent.get(3) == 2
    )
  }
}
