// Source: https://rpg.stackexchange.com/q/213150
module _qa_ea23235dfe65ede1 {
  import dnd.* from "./dnd"

  // Halfling Lucky: must use the rerolled die even if also a 1 — no re-rerolling permitted
  run qa_lucky_rerolled_nat1_attack_still_misses = {
    // Lucky triggers on original nat-1; reroll is also 1 → must use it → auto-miss, no further reroll
    val result = resolveAttackRoll(1, 10, 5, 0)
    assert(not(result.hits) and not(result.isCritical))
  }
  
  // Halfling Lucky: rerolled result replaces original in resolution (confirms reroll IS used)
  run qa_lucky_reroll_can_turn_nat1_into_hit = {
    // Original roll: 1 (auto-miss). Lucky reroll: 10, +5 bonus vs AC 14 → 15 >= 14 → hits
    val originalResult = resolveAttackRoll(1, 5, 14, 0)
    val rerollResult   = resolveAttackRoll(10, 5, 14, 0)
    assert(not(originalResult.hits) and rerollResult.hits)
  }
  
  // Halfling Lucky: rerolled nat-1 on saving throw uses value 1 in total — can still fail
  run qa_lucky_rerolled_nat1_save_uses_result = {
    // Reroll is 1, +4 mod, proficient with +2 profBonus: 1+4+2=7 < DC 8 → fails (must accept it)
    val result = saveSucceeds(1, 4, true, 2, 0, 8)
    assert(not(result))
  }
  
  // Halfling Lucky: rerolled nat-1 on ability check uses value 1 in total — can still fail
  run qa_lucky_rerolled_nat1_check_uses_result = {
    // Reroll is 1, +5 mod, Proficient at profBonus 3: 1+5+3=9 < DC 10 → fails (must accept it)
    val result = checkSucceeds(1, 5, Proficient, 3, 0, 10)
    assert(not(result))
  }
}
