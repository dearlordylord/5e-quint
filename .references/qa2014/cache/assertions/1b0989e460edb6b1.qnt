// Source: https://rpg.stackexchange.com/q/91269
module _qa_1b0989e460edb6b1 {
  import dnd.* from "./dnd"

  // Natural Explorer: Rangers contribute passive Perception while doing travel activities (unlike other characters)
  run qa_natural_explorer_passive_perception = {
    val profBonus = proficiencyBonus(5) // level 5 → +3
  
    // Alert non-Ranger: Wis 10 (+0), Perception proficient → passive 13; doing nothing else, contributes normally
    val nonRangerPassive = passiveCheck(abilityModifier(10), Proficient, profBonus, false, false) // 13
  
    // Ranger with Natural Explorer: Wis 16 (+3), Perception proficient → passive 16; distracted (foraging)
    // Natural Explorer: still contributes passive Perception despite being distracted
    val rangerPassive = passiveCheck(abilityModifier(16), Proficient, profBonus, false, false) // 16
  
    val threatDC = 15 // enemy stealth total
  
    val nonRangerDetects = nonRangerPassive >= threatDC // 13 >= 15 = false
    val rangerDetects    = rangerPassive    >= threatDC // 16 >= 15 = true
  
    // With Natural Explorer: Ranger (distracted) still counts → 1 success out of 2 contributors → group succeeds
    val withNaturalExplorer = groupCheckSucceeds(
      (if (nonRangerDetects) 1 else 0) + (if (rangerDetects) 1 else 0), // 0 + 1 = 1
      2
    )
  
    // Without Natural Explorer: distracted Ranger excluded → 0 successes out of 1 contributor → group fails
    val withoutNaturalExplorer = groupCheckSucceeds(
      if (nonRangerDetects) 1 else 0, // 0
      1
    )
  
    assert(
      nonRangerPassive == 13        and
      rangerPassive    == 16        and
      not(nonRangerDetects)         and
      rangerDetects                 and
      withNaturalExplorer           and // Ranger's Natural Explorer turns a group fail into a group success
      not(withoutNaturalExplorer)       // without it, the distracted Ranger's passive is simply excluded
    )
  }
}
