// Source: https://rpg.stackexchange.com/q/102534
module _qa_c702f93045cc102b {
  import dnd.* from "./dnd"

  // Is the UA Warforged considered to naturally be wearing armor?
  run qa_warforged_composite_plating_stacks_with_heavy_armor = {
    // Composite Plating is a flat +1 bonus, not armor — stacks with worn armor unchanged
    val warforgedBonus = 1
    val dexMod = 0 // DEX 10, irrelevant for heavy armor
    val baseAC = calculateAC(WearingArmor(CHAIN_MAIL), dexMod, false, NoUnarmoredDefense, 0, 0)
    // Chain mail base 16; heavy armor ignores DEX; warforged +1 is purely additive
    assert(baseAC + warforgedBonus == 17)
  }
  
  // Is the UA Warforged considered to naturally be wearing armor?
  run qa_warforged_composite_plating_stacks_with_barbarian_ud = {
    // Composite Plating doesn't count as armor, so BarbarianUD (unarmored defense) still applies
    val warforgedBonus = 1
    val dexMod = 2 // DEX 14
    val conMod = 3 // CON 16
    val baseAC = calculateAC(Unarmored, dexMod, false, BarbarianUD, conMod, 0)
    // BarbarianUD = 10 + dex + con = 15; +1 racial = 16
    assert(baseAC + warforgedBonus == 16)
  }
  
  // Is the UA Warforged considered to naturally be wearing armor?
  run qa_warforged_composite_plating_stacks_with_monk_ud = {
    // Composite Plating doesn't count as armor, so MonkUD still applies
    val warforgedBonus = 1
    val dexMod = 3 // DEX 16
    val wisMod = 2 // WIS 14
    val baseAC = calculateAC(Unarmored, dexMod, false, MonkUD, 0, wisMod)
    // MonkUD = 10 + dex + wis = 15; +1 racial = 16
    assert(baseAC + warforgedBonus == 16)
  }
  
  // Is the UA Warforged considered to naturally be wearing armor?
  run qa_warforged_composite_plating_stacks_with_light_armor_and_shield = {
    // Composite Plating bonus stacks with light armor + shield (it prohibits nothing)
    val warforgedBonus = 1
    val dexMod = 3 // DEX 16
    val baseAC = calculateAC(WearingArmor(STUDDED_LEATHER), dexMod, true, NoUnarmoredDefense, 0, 0)
    // Studded leather 12 + dex 3 + shield 2 = 17; +1 racial = 18
    assert(baseAC + warforgedBonus == 18)
  }
}
