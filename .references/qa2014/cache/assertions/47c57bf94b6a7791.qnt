// Source: https://rpg.stackexchange.com/q/195280
module _qa_47c57bf94b6a7791 {
  import dnd.* from "./dnd"

  // Weapon proficiency is distinct from skill proficiency; expertise doubles prof bonus for ability checks, not attack rolls
  run qa_weapon_vs_skill_proficiency_distinct = {
    val profBonus = proficiencyBonus(5)   // level 5 → +3
    val abilityMod = abilityModifier(14)  // STR 14 → +2
    val dc = 21
    val roll = 15
  
    // Skill check with Proficient: 15 + 2 + 3 = 20 < 21 → fails
    val skillProficient = checkSucceeds(roll, abilityMod, Proficient, profBonus, 0, dc)
    // Skill check with Expertise (doubled prof): 15 + 2 + 6 = 23 >= 21 → succeeds
    val skillExpertise = checkSucceeds(roll, abilityMod, Expertise, profBonus, 0, dc)
  
    // Attack roll: resolveAttackRoll takes a flat int attackBonus — no ProficiencyLevel parameter exists
    // Weapon proficiency contributes a flat profBonus to the roll; there is no doubling mechanism
    val attackBonus = abilityMod + profBonus  // +2 + +3 = +5
    val attack = resolveAttackRoll(roll, attackBonus, 20, 0)  // 15 + 5 = 20 >= AC 20
  
    assert(
      // Expertise matters for skill (ability) checks — it doubles the proficiency contribution
      not(skillProficient) and skillExpertise
      // profMultiplier confirms: Expertise = 2× profBonus, Proficient = 1×, NoneProf = 0
      and profMultiplier(Expertise, profBonus) == profMultiplier(Proficient, profBonus) * 2
      and profMultiplier(NoneProf, profBonus) == 0
      // Attack rolls have no ProficiencyLevel parameter — weapon proficiency is a flat bonus only
      and attack.hits
      and not(attack.isCritical)
    )
  }
}
