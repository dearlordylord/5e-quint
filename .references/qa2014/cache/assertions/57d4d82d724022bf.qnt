// Source: https://rpg.stackexchange.com/q/191106
module _qa_57d4d82d724022bf {
  import dnd.* from "./dnd"

  // Can you get the benefits from tool proficiency to make ability checks, even if you don't have/own the tool?
  run qa_tool_proficiency_requires_possessing_tool = {
    // PHB p.154: "add your proficiency bonus to any ability check you make USING that tool"
    // Without the tool in hand, profLevel = NoneProf (no bonus).
    val profBonus = proficiencyBonus(5)  // level 5 -> +3
    val abilityMod = abilityModifier(14) // score 14 -> +2
    val dc = 15
    val roll = 12
    // Using the tool (proficient): 12 + 2 + 3 = 17 >= 15, succeeds
    val withTool = checkSucceeds(roll, abilityMod, Proficient, profBonus, 0, dc)
    // Not possessing the tool (no bonus applies): 12 + 2 + 0 = 14 < 15, fails
    val withoutTool = checkSucceeds(roll, abilityMod, NoneProf, profBonus, 0, dc)
    assert(withTool and not(withoutTool))
  }
}
