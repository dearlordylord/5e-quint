// Source: https://rpg.stackexchange.com/q/189182
module _qa_caa7b5d9e6b23540 {
  import dnd.* from "./dnd"

  // How does doubling tool proficiencies work?
  run qa_doubled_tool_proficiency_adds_2x_prof_bonus = {
    val level = 5
    val profBonus = proficiencyBonus(level) // (5-1)/4 + 2 = 3
    val abilityMod = 2
    val d20Roll = 10
    val dc = 18
    // Expertise: d20 + mod + 2*prof = 10 + 2 + 6 = 18 >= 18 → succeeds
    val withExpertise = checkSucceeds(d20Roll, abilityMod, Expertise, profBonus, 0, dc)
    // Normal proficiency: 10 + 2 + 3 = 15 < 18 → fails
    val withProficient = checkSucceeds(d20Roll, abilityMod, Proficient, profBonus, 0, dc)
    assert(withExpertise and not(withProficient))
  }
}
