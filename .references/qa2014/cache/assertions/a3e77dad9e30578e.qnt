// Source: https://rpg.stackexchange.com/q/163841
module _qa_a3e77dad9e30578e {
  import dnd.* from "./dnd"

  // Do ingested poisons have a taste? — Detection requires active Investigation check, CON save resists effect
  
  // Failed CON save against ingested poison results in the Poisoned condition being applied
  run qa_ingested_poison_con_save_fail_applies_poisoned = {
    val creature = freshCreature(20)
    val conMod = 1      // CON 12 → +1
    val profBonus = 2
    val isProficient = false
    val poisonDC = 14
    val d20Roll = 8     // 8 + 1 = 9, fails DC 14
    val savePassed = saveSucceeds(d20Roll, conMod, isProficient, profBonus, 0, poisonDC)
    val s1 = if (not(savePassed)) pApplyCondition(creature, CPoisoned) else creature
    assert(not(savePassed) and s1.poisoned)
  }
  
  // Successful CON save against ingested poison — creature is not poisoned
  run qa_ingested_poison_con_save_success_no_poisoned = {
    val creature = freshCreature(20)
    val conMod = 3      // CON 16 → +3
    val profBonus = 2
    val isProficient = true
    val poisonDC = 14
    val d20Roll = 12    // 12 + 3 + 2 = 17, passes DC 14
    val savePassed = saveSucceeds(d20Roll, conMod, isProficient, profBonus, 0, poisonDC)
    val s1 = if (not(savePassed)) pApplyCondition(creature, CPoisoned) else creature
    assert(savePassed and not(s1.poisoned))
  }
  
  // Casual detection fails — active Investigation check with low roll cannot identify poison at consumption
  run qa_ingested_poison_casual_detection_fails = {
    // Answer: detection is not incidental; requires active Investigation (Int) check vs DM-set DC
    val intMod = abilityModifier(10)   // average Int → 0
    val profBonus = 2
    val poisonDetectDC = 15            // representative DM-assigned DC for subtle ingested poison
    val d20Roll = 9                    // 9 + 0 (no proficiency) = 9, fails DC 15
    val detected = checkSucceeds(d20Roll, intMod, NoneProf, profBonus, 0, poisonDetectDC)
    assert(not(detected))
  }
  
  // Proficient investigator can actively detect poison with a good roll
  run qa_ingested_poison_proficient_check_succeeds = {
    // An expert with Investigation proficiency and decent Int can succeed on an active check
    val intMod = abilityModifier(16)   // Int 16 → +3
    val profBonus = 2
    val poisonDetectDC = 15
    val d20Roll = 14                   // 14 + 3 + 2 = 19, beats DC 15
    val detected = checkSucceeds(d20Roll, intMod, Proficient, profBonus, 0, poisonDetectDC)
    assert(detected)
  }
  
  // Poisoned condition imposes disadvantage on attack rolls and ability checks
  run qa_ingested_poison_condition_imposes_disadvantage = {
    val creature = freshCreature(20)
    val poisoned = pApplyCondition(creature, CPoisoned)
    val mods = pCheckModifiers(poisoned, false, false, false)
    assert(poisoned.poisoned and mods.hasDisadvantage)
  }
}
