// Source: https://rpg.stackexchange.com/q/180600
module _qa_b4a2bb039f4db841 {
  import dnd.* from "./dnd"

  // Choosing the Ability for a Hex: Wis hex → disadvantage on Wis checks → passive Perception drops by exactly 5
  run qa_hex_wis_passive_perception_penalty = {
    val wisMod    = abilityModifier(14)   // Wis 14 → +2
    val profBonus = proficiencyBonus(5)   // level 5 → +3
    val normal = passiveCheck(wisMod, Proficient, profBonus, false, false)
    val hexed  = passiveCheck(wisMod, Proficient, profBonus, false, true)
    // Disadvantage on Wis: passive Perception drops by 5 (impedes hiding rogues)
    assert(normal - hexed == 5)
  }
  
  // Choosing the Ability for a Hex: Str hex forces lower d20 on Athletics (grapple); a roll that beats DC normally fails under the hexed lower roll
  run qa_hex_str_grapple_check_lower_roll_fails = {
    val strMod    = abilityModifier(16)  // Str 16 → +3
    val profBonus = proficiencyBonus(5)  // level 5 → +3
    val dc = 15
    // Without hex: high roll used → 12+3+3 = 18 ≥ 15
    val passesNormally      = checkSucceeds(12, strMod, Proficient, profBonus, 0, dc)
    // With Hex on Str: disadvantage forces lower roll → 5+3+3 = 11 < 15
    val failsOnHexedLowRoll = checkSucceeds(5,  strMod, Proficient, profBonus, 0, dc)
    assert(passesNormally and not(failsOnHexedLowRoll))
  }
}
