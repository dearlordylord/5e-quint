// Source: https://rpg.stackexchange.com/q/189306
module _qa_c77339d43c7be30c {
  import dnd.* from "./dnd"

  // Can you use the Telekinetic feat vertically? — direction is relative to caster, includes vertical
  run qa_telekinetic_vertical_movement = {
    // Telekinetic feat DC = 8 + profBonus + feat ability modifier
    val level = 5
    val pBonus = proficiencyBonus(level)          // (5-1)/4 + 2 = 3
    val featAbilityMod = abilityModifier(16)       // (16-10)/2 = +3
    val tkDC = 8 + pBonus + featAbilityMod         // DC 14
    // Flying creature directly above: STR 10 (+0), rolls 7 → total 7 < 14 → fails
    // "Toward you" when creature is overhead = downward; direction is relative to caster, not absolute
    val tgtMod = abilityModifier(10)               // 0
    assert(not(saveSucceeds(7, tgtMod, false, pBonus, 0, tkDC)))
  }
  
  // Can you use the Telekinetic feat vertically? — ally can willingly fail to be pulled toward caster (e.g., upward along a wall)
  run qa_telekinetic_ally_willing_fail = {
    val level = 5
    val pBonus = proficiencyBonus(level)           // 3
    val featAbilityMod = abilityModifier(16)        // +3
    val tkDC = 8 + pBonus + featAbilityMod          // DC 14
    // Ally with STR 18 (+4) would normally pass (roll 18 → 22 >= 14)
    val allyMod = abilityModifier(18)               // +4
    val wouldPass = saveSucceeds(18, allyMod, false, pBonus, 0, tkDC)
    // Willing failure: ally rolls 1 → total 5 < 14 → fails, gets moved 5ft toward caster (upward)
    val willFail = not(saveSucceeds(1, allyMod, false, pBonus, 0, tkDC))
    assert(wouldPass and willFail)
  }
}
