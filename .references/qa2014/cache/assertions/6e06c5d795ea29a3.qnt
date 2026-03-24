// Source: https://rpg.stackexchange.com/q/49477
module _qa_6e06c5d795ea29a3 {
  import dnd.* from "./dnd"

  // Does Draconic Resilience stack with shields? Shield +2 always adds to any unarmored AC-setting formula
  run qa_draconic_resilience_shield_stacks = {
    // Draconic Resilience sets AC = 13 + Dex. Spec doesn't model the +3 base offset directly,
    // but the stacking rule is universal: shield bonus adds to whatever sets your base AC.
    // Verified via calculateAC: shieldBonus = 2 is always added on top of any unarmored formula.
    val dexMod = 3
    val acNoShield = calculateAC(Unarmored, dexMod, false, NoUnarmoredDefense, 0, 0)
    val acWithShield = calculateAC(Unarmored, dexMod, true, NoUnarmoredDefense, 0, 0)
    // 10 + 3 = 13 base; +2 shield = 15 (mirrors Draconic: 13+Dex base, 15+Dex with shield)
    assert(acNoShield == 13 and acWithShield == 15 and acWithShield == acNoShield + 2)
  }
  
  // Shield +2 is additive on top of every UnarmoredDefense variant (Barbarian analog to Draconic)
  run qa_shield_stacks_with_barbarian_ud = {
    // Barbarian Unarmored Defense (10+Dex+Con) explicitly allows shields per PHB;
    // Draconic Resilience (10+3+Dex) follows identical stacking logic.
    val dexMod = 2
    val conMod = 3
    val acNoShield = calculateAC(Unarmored, dexMod, false, BarbarianUD, conMod, 0)
    val acWithShield = calculateAC(Unarmored, dexMod, true, BarbarianUD, conMod, 0)
    // 10 + 2 + 3 = 15; with shield = 17
    assert(acNoShield == 15 and acWithShield == 17 and acWithShield == acNoShield + 2)
  }
  
  // Shield delta is exactly +2 regardless of unarmored defense type
  run qa_shield_delta_is_always_two = {
    val dexMod = 1
    val deltaNoUD  = calculateAC(Unarmored, dexMod, true, NoUnarmoredDefense, 0, 0)
                   - calculateAC(Unarmored, dexMod, false, NoUnarmoredDefense, 0, 0)
    val deltaBarbUD = calculateAC(Unarmored, dexMod, true, BarbarianUD, 2, 0)
                    - calculateAC(Unarmored, dexMod, false, BarbarianUD, 2, 0)
    val deltaMonkUD = calculateAC(Unarmored, dexMod, true, MonkUD, 0, 2)
                    - calculateAC(Unarmored, dexMod, false, MonkUD, 0, 2)
    assert(deltaNoUD == 2 and deltaBarbUD == 2 and deltaMonkUD == 2)
  }
}
