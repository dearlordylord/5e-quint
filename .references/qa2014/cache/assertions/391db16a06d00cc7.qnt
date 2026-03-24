// Source: https://rpg.stackexchange.com/q/108129
module _qa_391db16a06d00cc7 {
  import dnd.* from "./dnd"

  // Defensive Duelist x Medium Armor Master: attack total 20 hits MAM (AC 20) but DD reaction (AC 22) blocks it
  run qa_dd_reaction_blocks_attack_that_hits_mam = {
    // d20=15, atk+5 → total 20: exactly meets MAM's constant AC 20, but falls short of DD+reaction AC 22
    val mamResult     = resolveAttackRoll(15, 5, 20, 0)
    val ddReactResult = resolveAttackRoll(15, 5, 22, 0)
    assert(mamResult.hits == true and ddReactResult.hits == false)
  }
  
  // Defensive Duelist x Medium Armor Master: attack total 19 hits DD base AC (19) but misses MAM AC (20)
  run qa_dd_base_ac_lower_than_mam = {
    // d20=14, atk+5 → total 19: DD without reaction has weaker baseline than MAM
    val ddBase = resolveAttackRoll(14, 5, 19, 0)
    val mam    = resolveAttackRoll(14, 5, 20, 0)
    assert(ddBase.hits == true and mam.hits == false)
  }
  
  // Defensive Duelist x Medium Armor Master: attack total 22 overcomes DD reaction AC (22) and trivially hits MAM (20)
  run qa_attack_total_22_hits_both = {
    // d20=17, atk+5 → total 22: both options are hit at this roll, reaction provides no benefit
    val ddReact = resolveAttackRoll(17, 5, 22, 0)
    val mam     = resolveAttackRoll(17, 5, 20, 0)
    assert(ddReact.hits == true and mam.hits == true)
  }
  
  // Defensive Duelist x Medium Armor Master: DD reaction is consumed when used, blocking opportunity attacks that turn
  run qa_dd_reaction_cost_blocks_oa = {
    // Using the reaction to invoke Defensive Duelist sets reactionAvailable = false
    val t1 = pUseReaction(FRESH_TURN)
    assert(t1.reactionAvailable == false)
  }
}
