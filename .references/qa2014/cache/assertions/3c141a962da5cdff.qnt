// Source: https://rpg.stackexchange.com/q/217928
module _qa_3c141a962da5cdff {
  import dnd.* from "./dnd"

  // Can teleporting remove stirges? — grappled (stirge-attached) creature has speed 0; only explicit removal (teleport) frees it
  
  // Test 1: attachment modeled as CGrappled → speed becomes 0, movement cannot escape
  run qa_teleport_removes_stirge_grappled_speed_zero = {
    val naal_attached = pApplyCondition(freshCreature(20), CGrappled)
    val t = pStartTurn(TEST_CONFIG, naal_attached, Unarmored, false, 0, false, false)
    // Even trying to spend movement changes nothing: speed is already 0
    val t2 = pUseMovement(t, 30, 1)
    assert(
      naal_attached.grappled == true
      and t.effectiveSpeed == 0
      and t.movementRemaining == 0
      and t2.movementRemaining == 0  // movement didn't help — stirge still "on" Naal
    )
  }
  
  // Test 2: Misty Step teleportation ≠ movement; leaves stirge behind → remove CGrappled, speed restored
  run qa_teleport_removes_stirge_condition_cleared = {
    val naal_attached = pApplyCondition(freshCreature(20), CGrappled)
    // Teleport: not movement, so stirge is left behind → CGrappled ends
    val naal_free = pRemoveCondition(naal_attached, CGrappled)
    val t_free = pStartTurn(TEST_CONFIG, naal_free, Unarmored, false, 0, false, false)
    assert(
      naal_attached.grappled == true
      and naal_free.grappled == false
      and t_free.effectiveSpeed == 30   // full speed restored once stirge left behind
      and t_free.movementRemaining == 30
    )
  }
}
