// Source: https://rpg.stackexchange.com/q/83817
module _qa_669814d90c4f3918 {
  import dnd.* from "./dnd"

  // How does Expertise work? — Expertise doubles only the proficiency bonus, not the full skill bonus
  run qa_expertise_doubles_proficiency_only = {
    val profBonus = 2   // level 1-4 proficiency bonus
    val wisMod    = 2   // Wisdom modifier (+2)
    val expertiseContribution = profMultiplier(Expertise,   profBonus) // 2*2 = 4
    val normalContribution    = profMultiplier(Proficient,  profBonus) // 1*2 = 2
    assert(
      // Expertise contribution is double the proficiency bonus only
      expertiseContribution == 4
      // Total Perception with Expertise = wisMod + doubled profBonus = 2 + 4 = 6
      and (wisMod + expertiseContribution) == 6
      // NOT the wrong answer: doubling the full bonus (wisMod + profBonus)*2 = 8
      and (wisMod + expertiseContribution) != (wisMod + normalContribution) * 2
    )
  }
}
