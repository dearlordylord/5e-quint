// Source: https://rpg.stackexchange.com/q/211928
module _qa_56e190501372a920 {
  import dnd.* from "./dnd"

  // Could you kill someone using Enchantment School Wizard's Hypnotic Gaze forever?
  run qa_hypnotic_gaze_starvation_kills = {
    // Hypnotic Gaze: charmed + incapacitated; target starves over 6 days → exhaustion 6 → dead.
    val target = freshCreature(30)
    val underGaze = pApplyCondition(pApplyCondition(target, CCharmed), CIncapacitated)
    val d1 = pApplyStarvation(underGaze)
    val d2 = pApplyStarvation(d1)
    val d3 = pApplyStarvation(d2)
    val d4 = pApplyStarvation(d3)
    val d5 = pApplyStarvation(d4)
    val d6 = pApplyStarvation(d5)
    assert(d6.dead and d6.exhaustion == 6)
  }
  
  // Could you kill someone using Enchantment School Wizard's Hypnotic Gaze forever?
  run qa_hypnotic_gaze_incap_blocks_action = {
    // Hypnotic Gaze incapacitates the target; incapacitated creatures cannot take actions.
    val target = freshCreature(20)
    val underGaze = pApplyCondition(pApplyCondition(target, CCharmed), CIncapacitated)
    val t1 = pUseAction(FRESH_TURN, underGaze, AAttack)
    assert(t1.actionsRemaining > 0)
  }
  
  // Could you kill someone using Enchantment School Wizard's Hypnotic Gaze forever?
  run qa_hypnotic_gaze_dehydration_accelerates_death = {
    // Dehydration stacks with starvation: once already exhausted (>=1), dehydration adds 2 levels.
    // Starvation day 1 → exh 1; dehydration (no water, save failed) → +2 = exh 3;
    // starvation days 2-4 → exh 4, 5, 6 = dead. Faster than starvation alone.
    val target = freshCreature(20)
    val underGaze = pApplyCondition(pApplyCondition(target, CCharmed), CIncapacitated)
    val s1 = pApplyStarvation(underGaze)          // exhaustion 1
    val s2 = pApplyDehydration(s1, false, false)  // already exhausted → +2 → exhaustion 3
    val s3 = pApplyStarvation(s2)                 // exhaustion 4, hp clamped to maxHp/2
    val s4 = pApplyStarvation(s3)                 // exhaustion 5
    val s5 = pApplyStarvation(s4)                 // exhaustion 6 → dead
    assert(s5.dead and s2.exhaustion == 3)
  }
}
