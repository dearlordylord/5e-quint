// Source: https://rpg.stackexchange.com/q/162945
module _qa_c9022a67a72a1444 {
  import dnd.* from "./dnd"

  // When substituting one ability for another on a skill check which kind of check does it qualify as?
  run qa_substituted_ability_check_retains_original_type = {
    // Monk/Barbarian: Arms of the Astral Self lets you use Wis mod on Strength checks;
    // Rage grants advantage on Strength checks.
    // Accepted answer: substituting the modifier does NOT reclassify the check.
    // It remains a Strength check, so Rage advantage still applies.
    val wisMod    = abilityModifier(16)      // Wis 16 → +3 (used in place of Str mod)
    val profBonus = proficiencyBonus(5)      // level 5 → +3
    val dc        = 12
  
    // Wrong interpretation: check is now a Wisdom check → Rage does not grant advantage
    val bareRoll = 8  // 8 + 3 = 11 < 12 → fails
    val failsWithoutAdvantage = not(checkSucceeds(bareRoll, wisMod, NoneProf, profBonus, 0, dc))
  
    // Correct interpretation: still a Strength check → Rage advantage applies → take higher of two d20s
    val advantageRoll = intMax(8, 9)  // 9; 9 + 3 = 12 >= 12 → succeeds
    val succeedsWithAdvantage = checkSucceeds(advantageRoll, wisMod, NoneProf, profBonus, 0, dc)
  
    // Rage advantage state: hasAdvantage=true on Strength checks, no countervailing disadvantage
    val rageAdv = resolveAdvantage({ hasAdvantage: true, hasDisadvantage: false })
  
    assert(failsWithoutAdvantage and succeedsWithAdvantage and rageAdv.hasAdvantage)
  }
}
