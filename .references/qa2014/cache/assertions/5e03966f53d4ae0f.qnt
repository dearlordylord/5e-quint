// Source: https://rpg.stackexchange.com/q/101904
module _qa_5e03966f53d4ae0f {
  import dnd.* from "./dnd"

  // How high can a PC jump normally?
  run qa_high_jump_running_start = {
    // STR 16 (mod +3): 3 + 3 = 6 feet with ≥10 ft running start
    assert(pHighJumpHeight(16, true) == 6)
  }
  
  // How high can a PC jump normally?
  run qa_high_jump_standing = {
    // STR 16 (mod +3): half of 6 = 3 feet without running start
    assert(pHighJumpHeight(16, false) == 3)
  }
  
  // How high can a PC jump normally? — movement cost is foot-for-foot
  run qa_high_jump_costs_movement = {
    // Jumping 6 feet high costs exactly 6 feet of movement
    val jumpHeight = pHighJumpHeight(16, true)
    val t1 = pUseMovement(FRESH_TURN, jumpHeight, 1)
    assert(t1.movementRemaining == FRESH_TURN.movementRemaining - jumpHeight)
  }
  
  // How high can a PC jump normally? — minimum height is zero
  run qa_high_jump_min_zero = {
    // STR 1 (mod -5): max(0, 3 + (-5)) = 0 — height never negative
    assert(pHighJumpHeight(1, true) == 0)
  }
  
  // How high can a PC jump normally? — standing jump is half running jump
  run qa_high_jump_standing_half_of_running = {
    // For any STR score the standing height is floor(running / 2)
    val running = pHighJumpHeight(14, true)   // mod +2 → 5 ft
    val standing = pHighJumpHeight(14, false)  // 5 / 2 = 2 ft (integer division)
    assert(standing == running / 2)
  }
}
