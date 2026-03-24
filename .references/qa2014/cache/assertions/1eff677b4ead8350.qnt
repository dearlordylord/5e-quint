// Source: https://rpg.stackexchange.com/q/178465
module _qa_1eff677b4ead8350 {
  import dnd.* from "./dnd"

  // Does Natural Explorer's double proficiency apply to perception checks while keeping watch?
  run qa_natural_explorer_doubled_perception = {
      val level = 5
      val profBonus = proficiencyBonus(level)   // 3
      val wisMod = abilityModifier(13)           // +1
      val roll = 10
      val dc = 15
      // Normal proficiency: 10 + 1 + 3 = 14 < 15 — fails
      val normalFails = not(checkSucceeds(roll, wisMod, Proficient, profBonus, 0, dc))
      // Natural Explorer in favored terrain doubles proficiency (Expertise): 10 + 1 + 6 = 17 >= 15 — succeeds
      val doubledSucceeds = checkSucceeds(roll, wisMod, Expertise, profBonus, 0, dc)
      // Passive Perception (keeping watch) with doubled proficiency exceeds normal by exactly profBonus
      val passiveNormal  = passiveCheck(wisMod, Proficient, profBonus, false, false)
      val passiveDoubled = passiveCheck(wisMod, Expertise,  profBonus, false, false)
      assert(normalFails and doubledSucceeds and passiveDoubled == passiveNormal + profBonus)
  }
}
