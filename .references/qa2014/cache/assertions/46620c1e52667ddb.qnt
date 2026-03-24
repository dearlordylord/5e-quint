// Source: https://rpg.stackexchange.com/q/185106
module _qa_46620c1e52667ddb {
  import dnd.* from "./dnd"

  // Can beholders swim? — creatures use any speed (e.g. fly speed) for swimming; 1 extra foot per foot without swim speed
  run qa_swim_cost_multiplier_without_swim_speed = {
    val swimCost = pMovementCost(false, false, true, false, false)
    assert(swimCost == 2)
  }
  
  // Can beholders swim? — fly speed 20 allows exactly 10 feet of swimming (20 / cost-2 = 10)
  run qa_swim_10ft_with_20ft_fly_speed = {
    val t = FRESH_TURN.with("movementRemaining", 20).with("effectiveSpeed", 20)
    val swimCost = pMovementCost(false, false, true, false, false)
    val t1 = pUseMovement(t, 10, swimCost)
    assert(t1.movementRemaining == 0)
  }
  
  // Can beholders swim? — fly speed 20 is insufficient for 11 feet of swimming (11*2=22 > 20)
  run qa_swim_11ft_with_20ft_fly_speed_blocked = {
    val t = FRESH_TURN.with("movementRemaining", 20).with("effectiveSpeed", 20)
    val swimCost = pMovementCost(false, false, true, false, false)
    val t1 = pUseMovement(t, 11, swimCost)
    assert(t1.movementRemaining == 20)
  }
}
