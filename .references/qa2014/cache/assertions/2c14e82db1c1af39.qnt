// Source: https://rpg.stackexchange.com/q/176986
module _qa_2c14e82db1c1af39 {
  import dnd.* from "./dnd"

  // Improvised weapons and proficiency: without DM approval, no proficiency bonus on attack roll
  run qa_improvised_weapon_no_proficiency = {
    val dexMod   = abilityModifier(14)   // Dex 14 → +2
    val targetAC = 15
    val roll     = 10
    // Default: improvised weapon (acid vial) grants no proficiency bonus
    val result = resolveAttackRoll(roll, dexMod, targetAC, 0)
    // 10 + 2 = 12 < 15 → miss
    assert(not(result.hits))
  }
  
  // Improvised weapons and proficiency: DM rules vial resembles a dart/thrown weapon, proficiency applies
  run qa_improvised_weapon_dm_approves_resemblance = {
    val dexMod   = abilityModifier(14)   // +2
    val profBonus = proficiencyBonus(5)  // level 5 → +3
    val targetAC = 15
    val roll     = 10
    // DM-approved resemblance: attackBonus includes proficiency (PHB improvised weapons rule)
    val result = resolveAttackRoll(roll, dexMod + profBonus, targetAC, 0)
    // 10 + 2 + 3 = 15 >= 15 → hit
    assert(result.hits)
  }
}
