// Source: https://rpg.stackexchange.com/q/204494
module _qa_50f837ad7b60da33 {
  import dnd.* from "./dnd"

  // Beast Barbarian: claws add Str+Rage bonus to each attack—two attacks double the modifier contribution vs one greatsword attack
  run qa_beast_barbarian_claw_modifier_doubles = {
    val strRageMod = 6  // Str 18 (+4) + rage bonus (+2)
    // Greatsword: one attack, 2d6 average = 7, modifier added once
    val greatswordDmg = normalDamage(7, strRageMod)     // 13
    // Claws: two attacks, 1d6 average = 3 each, modifier added twice
    val clawTotal = normalDamage(3, strRageMod) + normalDamage(3, strRageMod)  // 18
    assert(clawTotal > greatswordDmg)
  }
  
  // Beast Barbarian: two claw hits each independently trigger a concentration save; failing the second breaks concentration even after passing the first
  run qa_beast_barbarian_claws_force_two_concentration_saves = {
    val ss0 = FRESH_SPELL_SLOTS.with("concentrationSpellId", "hold_person")
    // First claw hit: spellcaster passes concentration save → still concentrating
    val ss1 = pConcentrationCheck(ss0, true)
    // Second claw hit: spellcaster fails concentration save → concentration broken
    val ss2 = pConcentrationCheck(ss1, false)
    assert(isConcentrating(ss1) and not(isConcentrating(ss2)))
  }
  
  // Beast Barbarian: natural weapons free a hand for a shield, granting +2 AC the Barbarian couldn't get with a two-handed weapon
  run qa_beast_barbarian_shield_ac_bonus_from_natural_weapons = {
    val dexMod = 2  // Dex 14
    val conMod = 3  // Con 16
    val wisMod = 0  // unused for Barbarian UD
    val acNoShield  = calculateAC(Unarmored, dexMod, false, BarbarianUD, conMod, wisMod)  // 10+2+3 = 15
    val acWithShield = calculateAC(Unarmored, dexMod, true,  BarbarianUD, conMod, wisMod)  // 17
    assert(acWithShield == acNoShield + 2)
  }
}
