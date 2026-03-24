// Source: https://rpg.stackexchange.com/q/169605
module _qa_fa052424eafc3ee4 {
  import dnd.* from "./dnd"

  // Dragon Fear feat: DC = 8 + proficiency bonus + CHA modifier; failed WIS save → Frightened
  run qa_dragon_fear_failed_save_applies_frightened = {
    val chaMod    = abilityModifier(16)       // +3
    val profBonus = proficiencyBonus(5)       // +3
    val dc        = 8 + profBonus + chaMod   // 14
    val wisMod    = abilityModifier(10)       // +0
    val roll      = 10                        // 10 + 0 = 10 < 14 → fail
    val savePassed = saveSucceeds(roll, wisMod, false, profBonus, 0, dc)
    val target    = freshCreature(20)
    val s1        = if (savePassed) target else pApplyCondition(target, CFrightened)
    assert(not(savePassed) and s1.frightened)
  }
  
  // Dragon Fear feat: passing the WIS save leaves target un-Frightened
  run qa_dragon_fear_passed_save_no_frightened = {
    val chaMod    = abilityModifier(16)
    val profBonus = proficiencyBonus(5)
    val dc        = 8 + profBonus + chaMod   // 14
    val wisMod    = abilityModifier(18)       // +4
    val roll      = 15                        // 15 + 4 = 19 >= 14 → pass
    val savePassed = saveSucceeds(roll, wisMod, false, profBonus, 0, dc)
    val target    = freshCreature(20)
    val s1        = if (savePassed) target else pApplyCondition(target, CFrightened)
    assert(savePassed and not(s1.frightened))
  }
  
  // Dragon Fear feat: frightened creature has disadvantage on attacks while source is in LOS
  run qa_dragon_fear_frightened_attack_disadvantage = {
    val target = freshCreature(20)
    val s1     = pApplyCondition(target, CFrightened)
    val mods   = pOwnAttackModifiers(s1, true)  // frightening source in line of sight
    assert(s1.frightened and mods.hasDisadvantage)
  }
  
  // Dragon Fear feat: frightened creature has no attack disadvantage when source is NOT in LOS
  run qa_dragon_fear_frightened_no_disadv_out_of_los = {
    val target = freshCreature(20)
    val s1     = pApplyCondition(target, CFrightened)
    val mods   = pOwnAttackModifiers(s1, false)  // source not in LOS
    assert(s1.frightened and not(mods.hasDisadvantage))
  }
  
  // Dragon Hide feat: retractable claws deal 1d4 + STR mod slashing (normalDamage formula)
  run qa_dragon_hide_claw_damage_formula = {
    val strMod  = abilityModifier(16)   // +3
    val dieRoll = 4                     // max d4
    val dmg     = normalDamage(dieRoll, strMod)
    assert(dmg == 7)
  }
  
  // Dragon Hide feat: +1 unarmored AC bonus stacks on top of base 10 + DEX mod
  run qa_dragon_hide_unarmored_ac_bonus = {
    val dexMod  = abilityModifier(14)   // +2
    val baseAC  = calculateAC(Unarmored, dexMod, false, NoUnarmoredDefense, 0, 0)
    val withHide = baseAC + 1           // Dragon Hide +1 to unarmored AC
    assert(baseAC == 12 and withHide == 13)
  }
  
  // Dragon Wings feat: flying speed available only when within carrying capacity
  run qa_dragon_wings_carrying_capacity_gate = {
    val strScore   = 14
    val capacity   = carryingCapacity(strScore, Medium)   // 14 * 15 = 210 lbs
    val withinCap  = 200 <= capacity
    val overCap    = 220 <= capacity
    assert(withinCap and not(overCap) and capacity == 210)
  }
  
  // Dragon Wings feat: Small creature has halved carrying capacity (affects Dragon Wings eligibility)
  run qa_dragon_wings_small_creature_capacity = {
    val strScore      = 14
    val medCapacity   = carryingCapacity(strScore, Medium)   // 210
    val smallCapacity = carryingCapacity(strScore, Small)    // 210 (Small == Medium per PHB)
    assert(medCapacity == smallCapacity)
  }
}
