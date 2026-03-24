// Source: https://rpg.stackexchange.com/q/179682
module _qa_13d98d4990644d60 {
  import dnd.* from "./dnd"

  // Enhance Ability: Cat's Grace does not revert initiative roll when concentration ends
  run qa_advantage_roll_result_is_fixed = {
    // Initiative is a DEX check (PHB Ch9). Cat's Grace (Enhance Ability) grants advantage.
    // Once the higher die is chosen, ending concentration mid-combat does NOT revert
    // the result to the lower die — the check was already resolved.
    val roll1 = 13  // lower die
    val roll2 = 16  // higher die (selected under advantage)
    val dexMod = 0
    val dc    = 16  // roll16 hits exactly; roll13 does not
  
    // Cat's Grace is active: resolve advantage state
    val advActive = resolveAdvantage({ hasAdvantage: true, hasDisadvantage: false })
    // Advantage → take the higher of the two dice
    val chosenRoll = if (advActive.hasAdvantage) intMax(roll1, roll2) else roll1
  
    // Initiative check is resolved; result is locked in at this value
    val initiativeCheck = checkSucceeds(chosenRoll, dexMod, NoneProf, 2, 0, dc)
  
    // Mid-combat: caster drops concentration on Enhance Ability
    val advAfterSpellEnd = resolveAdvantage({ hasAdvantage: false, hasDisadvantage: false })
    // Re-evaluating with the already-chosen roll — spell ending changes nothing
    val initiativeAfterEnd = checkSucceeds(chosenRoll, dexMod, NoneProf, 2, 0, dc)
  
    assert(
      // Advantage correctly selected the higher die (16, not 13)
      chosenRoll == 16
      // The locked-in check result is stable across spell ending
      and initiativeCheck == initiativeAfterEnd
      // 16 passes dc=16; confirms the kept roll is meaningful
      and initiativeCheck == true
      // 13 would fail dc=16 — demonstrating we did NOT revert to the lower roll
      and checkSucceeds(roll1, dexMod, NoneProf, 2, 0, dc) == false
      // Spell ended: no advantage going forward (but past check is already resolved)
      and not(advAfterSpellEnd.hasAdvantage)
      and not(advAfterSpellEnd.hasDisadvantage)
    )
  }
}
