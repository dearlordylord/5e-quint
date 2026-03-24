// Source: https://rpg.stackexchange.com/q/46623
module _qa_9dabe78e0a5f9c04 {
  import dnd.* from "./dnd"

  // Long rest regains half hit dice - round up or down?
  run qa_long_rest_hd_level1_minimum_one = {
    // Level 1: floor(1/2)=0 but minimum of 1 always applies — character recovers their sole HD
    val recovery = pHitDiceRecovery(1, 0)
    assert(recovery == 1)
  }
  
  // Long rest regains half hit dice - round up or down?
  run qa_long_rest_hd_rounds_down_odd = {
    // Level 5: floor(5/2)=2, not 3 — general rule is round down
    val recovery = pHitDiceRecovery(5, 0)
    assert(recovery == 2)
  }
  
  // Long rest regains half hit dice - round up or down?
  run qa_long_rest_hd_rounds_down_even = {
    // Level 4: floor(4/2)=2, exact half, no rounding ambiguity
    val recovery = pHitDiceRecovery(4, 0)
    assert(recovery == 2)
  }
  
  // Long rest regains half hit dice - round up or down?
  run qa_long_rest_hd_caps_at_spent = {
    // Level 5, only 1 HD spent: can't recover more than was spent even if quota allows 2
    val recovery = pHitDiceRecovery(5, 4)
    assert(recovery == 1)
  }
  
  // Long rest regains half hit dice - round up or down?
  run qa_long_rest_hd_nothing_spent_no_recovery = {
    // All HD intact: recover 0 (nothing was spent)
    val recovery = pHitDiceRecovery(5, 5)
    assert(recovery == 0)
  }
  
  // Long rest regains half hit dice - round up or down?
  run qa_long_rest_integration_level1 = {
    // Full pLongRest integration: level 1 char with 0 HD remaining gets back exactly 1
    val c = freshCreature(8).with("hitDiceRemaining", 0)
    val after = pLongRest(c, 1, true)
    assert(after.hitDiceRemaining == 1)
  }
  
  // Long rest regains half hit dice - round up or down?
  run qa_long_rest_integration_level5_rounds_down = {
    // Full pLongRest integration: level 5 char recovers 2 HD, not 3 (floor division)
    val c = freshCreature(40).with("hitDiceRemaining", 0)
    val after = pLongRest(c, 5, true)
    assert(after.hitDiceRemaining == 2)
  }
}
