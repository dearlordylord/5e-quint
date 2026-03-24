// Source: https://rpg.stackexchange.com/q/161477
module _qa_17c61199bffdd4ab {
  import dnd.* from "./dnd"

  // How much movement does it take to stand up from prone when my speed is modified?
  // Standing up costs half your *current* (modified) speed; Slow halves speed to 15 → cost = 7 (floor), 8 ft left
  run qa_stand_from_prone_slowed_speed_15 = {
    val t = FRESH_TURN.with("effectiveSpeed", 15).with("movementRemaining", 15)
    val t1 = pStandFromProne(t)
    // 15 / 2 = 7 (floor), remaining = 15 - 7 = 8
    assert(t1.movementRemaining == 8)
  }
  
  // How much movement does it take to stand up from prone when my speed is modified?
  // Speed 5 (Slow + Ray of Frost): cost = 5/2 = 2 (floor), 3 ft left — can still stand
  run qa_stand_from_prone_speed_5 = {
    val t = FRESH_TURN.with("effectiveSpeed", 5).with("movementRemaining", 5)
    val t1 = pStandFromProne(t)
    // 5 / 2 = 2 (floor), remaining = 5 - 2 = 3
    assert(t1.movementRemaining == 3)
  }
  
  // How much movement does it take to stand up from prone when my speed is modified?
  // Speed 0 → cannot stand up at all (pSpendHalfSpeed returns unchanged state)
  run qa_stand_from_prone_speed_0_blocked = {
    val t = FRESH_TURN.with("effectiveSpeed", 0).with("movementRemaining", 0)
    val t1 = pStandFromProne(t)
    assert(t1 == t)
  }
  
  // How much movement does it take to stand up from prone when my speed is modified?
  // Baseline sanity: normal speed 30 → cost = 15, remaining = 15
  run qa_stand_from_prone_normal_speed_30 = {
    val t = FRESH_TURN.with("effectiveSpeed", 30).with("movementRemaining", 30)
    val t1 = pStandFromProne(t)
    assert(t1.movementRemaining == 15)
  }
}
