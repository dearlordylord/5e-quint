// Source: https://rpg.stackexchange.com/q/103329
module _qa_2f46d0cdf9274be3 {
  import dnd.* from "./dnd"

  // How can I get advantage on a lock-pick check? (Cat's Grace / magnifying glass / inspiration)
  run qa_advantage_lockpick_takes_higher_roll = {
    // Advantage (e.g. Cat's Grace Enhance Ability, magnifying glass) = roll twice, take higher.
    // Roll1=8 alone fails DC 15; roll2=15 alone succeeds; advantage uses the higher.
    val dexMod    = 3
    val profBonus = 2
    val dc        = 15
    val roll1     = 8   // 8 + 3 + 2 = 13 < 15 → fails
    val roll2     = 15  // 15 + 3 + 2 = 20 >= 15 → succeeds
    val higherRoll = intMax(roll1, roll2)
    val withoutAdvantage = checkSucceeds(roll1,       dexMod, Proficient, profBonus, 0, dc)
    val withAdvantage    = checkSucceeds(higherRoll,  dexMod, Proficient, profBonus, 0, dc)
    assert(not(withoutAdvantage) and withAdvantage)
  }
  
  // How can I get advantage on a lock-pick check? — advantage doesn't save a truly bad pair
  run qa_advantage_lockpick_both_fail_still_fails = {
    // Even with advantage from an item, if both rolls are insufficient the check still fails.
    val dexMod    = 1
    val profBonus = 2
    val dc        = 18
    val roll1     = 5   // 5 + 1 + 2 = 8  < 18
    val roll2     = 7   // 7 + 1 + 2 = 10 < 18
    val higherRoll = intMax(roll1, roll2)
    val withAdvantage = checkSucceeds(higherRoll, dexMod, Proficient, profBonus, 0, dc)
    assert(not(withAdvantage))
  }
  
  // How can I get advantage on a lock-pick check? — advantage strictly helps vs. no advantage
  run qa_advantage_lockpick_never_worse_than_no_advantage = {
    // Taking the higher of two rolls can only equal or exceed a single roll — never worse.
    val dexMod    = 2
    val profBonus = 3
    val dc        = 14
    val roll1     = 9   // sole roll without advantage: 9 + 2 + 3 = 14 → exactly meets DC
    val roll2     = 4   // second roll would have been worse
    val higherRoll = intMax(roll1, roll2)
    val withoutAdvantage = checkSucceeds(roll1,      dexMod, Proficient, profBonus, 0, dc)
    val withAdvantage    = checkSucceeds(higherRoll, dexMod, Proficient, profBonus, 0, dc)
    // advantage result is at least as good as the single roll
    assert(withoutAdvantage and withAdvantage)
  }
}
