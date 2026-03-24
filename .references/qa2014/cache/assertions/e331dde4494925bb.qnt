// Source: https://rpg.stackexchange.com/q/90919
module _qa_e331dde4494925bb {
  import dnd.* from "./dnd"

  // Is skill check always against a DC or why is stealth an exception?
  
  // Persuasion: ability check vs DM-set DC (not a contest, not passive)
  run qa_persuasion_check_vs_dm_dc = {
    val chaMod = abilityModifier(14)       // Cha 14 → +2
    val profBonus = proficiencyBonus(3)    // level 3 → +2
    assert(
      checkSucceeds(14, chaMod, Proficient, profBonus, 0, 15) // 14+2+2=18 >= 15 succeeds
      and not(checkSucceeds(9, chaMod, Proficient, profBonus, 0, 15)) // 9+2+2=13 < 15 fails
    )
  }
  
  // Stealth vs passive perception: goblin stealth roll checked against static passive score
  run qa_stealth_vs_passive_perception = {
    val goblinDexMod = abilityModifier(14)  // Dex 14 → +2, goblin not proficient in Stealth
    val pcWisMod    = abilityModifier(14)   // Wis 14 → +2
    val pcProfBonus = proficiencyBonus(3)   // level 3 → +2
    val passivePerc = passiveCheck(pcWisMod, Proficient, pcProfBonus, false, false) // 10+2+2=14
    assert(
      checkSucceeds(12, goblinDexMod, NoneProf, 2, 0, passivePerc)       // 12+2=14 >= 14 hides
      and not(checkSucceeds(8, goblinDexMod, NoneProf, 2, 0, passivePerc)) // 8+2=10 < 14 spotted
    )
  }
  
  // Full contest (both roll): stealth vs active perception — higher wins; tie = no change (goblin fails)
  run qa_stealth_vs_active_perception_contest = {
    val goblinDexMod = abilityModifier(12) // Dex 12 → +1
    val pcWisMod     = abilityModifier(14) // Wis 14 → +2
    val pcProfBonus  = proficiencyBonus(3) // +2
    val goblinTotal  = 15 + goblinDexMod   // 16
    val pcTotal      = 14 + pcWisMod + pcProfBonus // 18 (PC actively perceiving)
    assert(
      contestWinner(goblinTotal, pcTotal) == BWins // PC wins → goblin detected
      and contestWinner(14, 14) == Tie             // Tie = status quo, goblin fails to sneak past
    )
  }
}
