// Source: https://rpg.stackexchange.com/q/208605
module _qa_5f2f7ece94b0503f {
  import dnd.* from "./dnd"

  // Does Halfling's Brave trait grant advantage on Bodak's Death Gaze?
  run qa_brave_not_apply_death_gaze = {
    // Brave grants advantage on saves against being frightened.
    // Death Gaze is a DC 13 CON save that does NOT impose the frightened condition → Brave does not apply.
    val deathGazeImposesfrightened = false
    val braveApplies = deathGazeImposesfrightened // false: Brave only triggers on frightened-imposing saves
    val advState = resolveAdvantage({ hasAdvantage: braveApplies, hasDisadvantage: false })
    assert(not(advState.hasAdvantage) and not(advState.hasDisadvantage))
  }
  
  // Brave trait grants advantage only when the saving throw would impose the frightened condition (contrast case)
  run qa_brave_applies_only_when_frightened_imposed = {
    // A save that DOES impose frightened (e.g. a fear spell) → Brave applies → advantage
    val saveImposesfrightened = true
    val braveApplies = saveImposesfrightened // true
    val advState = resolveAdvantage({ hasAdvantage: braveApplies, hasDisadvantage: false })
    assert(advState.hasAdvantage and not(advState.hasDisadvantage))
  }
  
  // Death Gaze save outcome is identical for halfling and non-halfling: Brave confers no benefit
  run qa_brave_no_benefit_on_death_gaze_outcome = {
    val deathGazeDC = 13
    val conMod = 1       // e.g. CON 12 halfling
    val isProficient = false
    val profBonus = 2
    val roll = 11        // 11 + 1 = 12 < 13: fails without advantage
  
    // Brave would grant advantage only if frightened were being imposed — it is not
    val deathGazeImposesfrightened = false
    val braveApplies = deathGazeImposesfrightened // false → no reroll available
  
    // With no advantage, the halfling resolves the save at face value
    val saveResult = saveSucceeds(roll, conMod, isProficient, profBonus, 0, deathGazeDC)
    assert(not(saveResult) and not(braveApplies))
  }
}
