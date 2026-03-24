// Source: https://rpg.stackexchange.com/q/196624
module _qa_9cc421950b56fc8e {
  import dnd.* from "./dnd"

  // Is there an effect that will cause more than one level of exhaustion to be gained? — PHB Ch8 dehydration: already-exhausted creature takes 2 levels
  run qa_dehydration_two_levels_if_already_exhausted = {
    val s0 = freshCreature(20).with("exhaustion", 1)
    val s1 = pApplyDehydration(s0, false, false)
    assert(s1.exhaustion == 3)
  }
  
  // Dehydration baseline: creature with no prior exhaustion gains only 1 level
  run qa_dehydration_one_level_when_not_exhausted = {
    val s0 = freshCreature(20).with("exhaustion", 0)
    val s1 = pApplyDehydration(s0, false, false)
    assert(s1.exhaustion == 1)
  }
  
  // Half water + failed CON save still inflicts 2 levels when creature is already exhausted
  run qa_dehydration_half_water_failed_save_two_levels_if_exhausted = {
    val s0 = freshCreature(20).with("exhaustion", 2)
    val s1 = pApplyDehydration(s0, true, false)
    assert(s1.exhaustion == 4)
  }
  
  // Half water + successful CON save → no exhaustion gained regardless of prior exhaustion
  run qa_dehydration_half_water_passed_save_no_change = {
    val s0 = freshCreature(20).with("exhaustion", 3)
    val s1 = pApplyDehydration(s0, true, true)
    assert(s1.exhaustion == 3)
  }
  
  // Two levels of dehydration exhaustion can jump exhaustion 4 straight to 6 (death), skipping 5
  run qa_dehydration_exhaustion_4_to_dead_via_two_levels = {
    val s0 = freshCreature(20).with("exhaustion", 4)
    val s1 = pApplyDehydration(s0, false, false)
    assert(s1.exhaustion == 6 and s1.dead)
  }
}
