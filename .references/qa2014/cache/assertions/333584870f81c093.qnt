// Source: https://rpg.stackexchange.com/q/151155
module _qa_333584870f81c093 {
  import dnd.* from "./dnd"

  // Cloaker Phantasms: attacker randomly targets a duplicate, real cloaker takes no damage
  run qa_cloaker_phantasm_hit_duplicate = {
    val cloaker = freshCreature(90)
    // 3 duplicates + 1 real = 1d4 target roll; 1=real, 2/3/4=duplicate (pre-resolved)
    val targetRoll = 3
    val hitsReal = targetRoll == 1
    val attackResult = resolveAttackRoll(15, 5, 13, 0)
    val damageAmount = normalDamage(8, 4)
    val cloakerAfter =
      if (attackResult.hits and hitsReal)
        pTakeDamage(cloaker, damageAmount, Piercing, Set(), Set(), Set(), false)
      else
        cloaker
    assert(not(hitsReal) and cloakerAfter.hp == cloaker.hp)
  }
  
  // Cloaker Phantasms: attacker randomly targets real cloaker, damage applies normally
  run qa_cloaker_phantasm_hit_real = {
    val cloaker = freshCreature(90)
    // targetRoll == 1 → real cloaker is targeted
    val targetRoll = 1
    val hitsReal = targetRoll == 1
    val attackResult = resolveAttackRoll(15, 5, 13, 0)
    val damageAmount = normalDamage(8, 4)
    val cloakerAfter =
      if (attackResult.hits and hitsReal)
        pTakeDamage(cloaker, damageAmount, Piercing, Set(), Set(), Set(), false)
      else
        cloaker
    assert(hitsReal and attackResult.hits and cloakerAfter.hp == cloaker.hp - damageAmount)
  }
  
  // Cloaker Phantasms: with no duplicates remaining, attack targets cloaker directly (no random roll)
  run qa_cloaker_phantasm_no_duplicates_direct_target = {
    val cloaker = freshCreature(90)
    val duplicatesRemaining = 0
    // When duplicatesRemaining == 0 the random-targeting clause does not apply;
    // a successful hit always damages the real cloaker.
    val attackResult = resolveAttackRoll(14, 5, 13, 0)
    val damageAmount = normalDamage(8, 4)
    val cloakerAfter =
      if (duplicatesRemaining == 0 and attackResult.hits)
        pTakeDamage(cloaker, damageAmount, Piercing, Set(), Set(), Set(), false)
      else
        cloaker
    assert(duplicatesRemaining == 0 and attackResult.hits and cloakerAfter.hp == cloaker.hp - damageAmount)
  }
}
