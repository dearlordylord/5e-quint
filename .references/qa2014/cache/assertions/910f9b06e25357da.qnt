// Source: https://rpg.stackexchange.com/q/215018
module _qa_910f9b06e25357da {
  import dnd.* from "./dnd"

  // PHB: standard Lock requires DC 15 Dexterity (Sleight of Hand) check with Thieves' Tools
  run qa_lock_pick_sleight_of_hand_uses_dex = {
    assert(skillAbility(SleightOfHand) == Dex)
  }
  
  // PHB Lock DC 15: total exactly equal to DC succeeds (>= DC)
  run qa_lock_pick_dc15_exact_total_succeeds = {
    // dexMod +1, no proficiency: roll 14 + 1 + 0 = 15 >= DC 15
    assert(checkSucceeds(14, 1, NoneProf, 2, 0, 15))
  }
  
  // PHB Lock DC 15: total one below DC fails
  run qa_lock_pick_dc15_one_below_fails = {
    // dexMod +1, no proficiency: roll 13 + 1 + 0 = 14 < DC 15
    assert(not(checkSucceeds(13, 1, NoneProf, 2, 0, 15)))
  }
  
  // PHB Lock DC 15: proficient character with dexMod +2 needs roll >= 11 (11+2+2=15)
  run qa_lock_pick_dc15_proficient_threshold = {
    val profBonus = proficiencyBonus(5) // +3 at level 5
    assert(checkSucceeds(10, 2, Proficient, profBonus, 0, 15))  // 10+2+3=15 succeeds
    and assert(not(checkSucceeds(9, 2, Proficient, profBonus, 0, 15)))  // 9+2+3=14 fails
  }
  
  // DMG allows higher DCs for better locks; a DC 20 "quality" lock requires a higher roll
  run qa_lock_pick_dc20_quality_lock = {
    val dexMod = 3
    val profBonus = proficiencyBonus(5) // +3
    // total must be >= 20: roll 14 + 3 + 3 = 20 succeeds
    assert(checkSucceeds(14, dexMod, Proficient, profBonus, 0, 20))
    and assert(not(checkSucceeds(13, dexMod, Proficient, profBonus, 0, 20)))  // 13+3+3=19 fails
  }
}
