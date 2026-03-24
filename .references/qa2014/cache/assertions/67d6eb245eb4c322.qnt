// Source: https://rpg.stackexchange.com/q/137529
module _qa_67d6eb245eb4c322 {
  import dnd.* from "./dnd"

  // What skills are Drow proficient in? — Drow racial features grant only Perception (from Elf ancestry), no other skill proficiencies
  run qa_drow_no_skill_proficiencies = {
    val wisMod   = abilityModifier(11)    // WIS 11 → +0
    val profBonus = proficiencyBonus(1)   // level 1 → +2
  
    // Drow receives only Perception (Elf trait); no other skills from race
    val drowSkillProficiencies: Set[Skill] = Set(Perception)
  
    val perceptionProfLevel = if (drowSkillProficiencies.contains(Perception)) Proficient else NoneProf
    val arcanaProfLevel     = if (drowSkillProficiencies.contains(Arcana))     Proficient else NoneProf
    val stealthProfLevel    = if (drowSkillProficiencies.contains(Stealth))    Proficient else NoneProf
  
    // DC 17, roll 15, WIS +0:
    //   Proficient:  15 + 0 + 2 = 17 >= 17 → succeeds
    //   NoneProf:    15 + 0 + 0 = 15 < 17  → fails
    val roll = 15
    val dc   = 17
  
    assert(
      perceptionProfLevel == Proficient
      and arcanaProfLevel  == NoneProf
      and stealthProfLevel == NoneProf
      and     checkSucceeds(roll, wisMod, perceptionProfLevel, profBonus, 0, dc)
      and not(checkSucceeds(roll, wisMod, arcanaProfLevel,     profBonus, 0, dc))
      and not(checkSucceeds(roll, wisMod, stealthProfLevel,    profBonus, 0, dc))
    )
  }
}
