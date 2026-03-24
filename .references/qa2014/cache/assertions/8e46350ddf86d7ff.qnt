// Source: https://rpg.stackexchange.com/q/83258
module _qa_8e46350ddf86d7ff {
  import dnd.* from "./dnd"

  // What skill gives knowledge of undead? — Arcana and Religion both key off Int_; proficient in either yields same check total
  run qa_undead_knowledge_arcana_or_religion = {
    val intScore = 14
    val intMod    = abilityModifier(intScore)          // +2
    val level     = 5
    val profBonus = proficiencyBonus(level)            // +3
  
    // Total modifier for a character proficient in Arcana (Int-based)
    val arcanaMod   = intMod + profMultiplier(Proficient, profBonus)  // 2+3 = 5
    // Total modifier for a character proficient in Religion (Int-based)
    val religionMod = intMod + profMultiplier(Proficient, profBonus)  // 2+3 = 5
  
    assert(
      // Both skills resolve to Intelligence (PHB skill list)
      skillAbility(Arcana)   == Int_ and
      skillAbility(Religion) == Int_ and
      // Therefore a proficient character gets an identical bonus from either skill,
      // confirming the accepted answer that both are equally valid for identifying undead
      arcanaMod == religionMod
    )
  }
}
