// Source: https://rpg.stackexchange.com/q/118719
module _qa_f99d1ac8c01d3eb7 {
  import dnd.* from "./dnd"

  // What monk features are disabled whilst wearing armor?
  run qa_monk_monkud_applies_only_when_unarmored = {
    // MonkUD (10+DEX+WIS) only active when Unarmored; armor overrides it entirely
    val dexMod = 3
    val wisMod = 2
    val conMod = 1
    // Unarmored: AC = 10 + DEX(3) + WIS(2) = 15
    val unarmoredAC = calculateAC(Unarmored, dexMod, false, MonkUD, conMod, wisMod)
    // WearingArmor(LEATHER): AC = 11 + DEX(3) = 14 — MonkUD clause never reached
    val armoredAC = calculateAC(WearingArmor(LEATHER), dexMod, false, MonkUD, conMod, wisMod)
    assert(unarmoredAC == 15 and armoredAC == 14)
  }
  
  // What monk features are disabled whilst wearing armor?
  run qa_monk_armored_monkud_vs_barbarian_ud = {
    // Confirm both MonkUD and BarbarianUD are suppressed identically when armored:
    // wearing armor collapses all UnarmoredDefense variants to the armor formula
    val dexMod = 2
    val conMod = 3
    val wisMod = 1
    val monkArmoredAC      = calculateAC(WearingArmor(CHAIN_SHIRT), dexMod, false, MonkUD, conMod, wisMod)
    val barbarianArmoredAC = calculateAC(WearingArmor(CHAIN_SHIRT), dexMod, false, BarbarianUD, conMod, wisMod)
    val noudArmoredAC      = calculateAC(WearingArmor(CHAIN_SHIRT), dexMod, false, NoUnarmoredDefense, conMod, wisMod)
    // All three must equal 13 + min(DEX,2) = 13 + 2 = 15
    assert(monkArmoredAC == 15 and barbarianArmoredAC == 15 and noudArmoredAC == 15)
  }
  
  // What monk features are disabled whilst wearing armor?
  run qa_monk_flurry_uses_basic_unarmed_when_armored = {
    // Accepted answer: Flurry of Blows when armored (no Martial Arts) uses basic
    // unarmed strike: 1 + STR mod bludgeoning — no Martial Arts die added
    val strMod = 3
    val basicDmg = unarmedDamage(strMod)
    // Martial Arts die would add on top; without it the result is just 1 + STR = 4
    assert(basicDmg == 4)
  }
  
  // What monk features are disabled whilst wearing armor?
  run qa_monk_negative_str_unarmed_floor = {
    // Edge: unarmedDamage floors at 0 even with very negative STR mod (min 0 rule)
    val strMod = -3
    val dmg = unarmedDamage(strMod)
    assert(dmg == 0)
  }
}
