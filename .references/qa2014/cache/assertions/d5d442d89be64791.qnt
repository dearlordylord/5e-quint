// Source: https://rpg.stackexchange.com/q/56631
module _qa_d5d442d89be64791 {
  import dnd.* from "./dnd"

  // Would Shriekers prevent someone from hearing Harpies?
  run qa_shrieker_no_deafened_means_can_hear_harpy = {
    // Shriekers don't impose CDeafened; a creature not deafened has no auto-fail
    // on hearing-required checks, so Harpy Luring Song can still affect them.
    val creature = freshCreature(20)
    val mods = pCheckModifiers(creature, false, true, false)
    assert(not(mods.autoFail))
  }
  
  // Would Shriekers prevent someone from hearing Harpies? (contrast: deafened does block)
  run qa_deafened_condition_blocks_hearing_based_checks = {
    // Only CDeafened causes auto-fail on hearing-required checks — not loud noises alone.
    val creature = pApplyCondition(freshCreature(20), CDeafened)
    val mods = pCheckModifiers(creature, false, true, false)
    assert(mods.autoFail)
  }
}
