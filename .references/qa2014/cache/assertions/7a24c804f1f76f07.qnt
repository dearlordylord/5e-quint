// Source: https://rpg.stackexchange.com/q/164146
module _qa_7a24c804f1f76f07 {
  import dnd.* from "./dnd"

  // How do Plant Growth and Slow interact with each other?
  run qa_slow_plus_plant_growth_stacks = {
      // Slow halves speed (30 -> 15); Plant Growth costs 4 feet of movement per 1 foot traveled.
      // Combined: creature can move at most 3 feet (15 / 4 = 3), i.e. 1 foot per 8 feet of normal speed.
      val normalSpeed = 30
      val slowedSpeed = normalSpeed / 2       // Slow: speed halved -> 15
      val plantGrowthCost = 4                 // Plant Growth: 4 ft movement per 1 ft moved
  
      val slowedTurn = FRESH_TURN
          .with("movementRemaining", slowedSpeed)
          .with("effectiveSpeed",    slowedSpeed)
  
      // Moving 3 feet costs 3 * 4 = 12 out of 15 -> succeeds
      val afterMove3 = pUseMovement(slowedTurn, 3, plantGrowthCost)
      // Moving 4 feet would cost 4 * 4 = 16 > 15 -> no-op (insufficient movement)
      val afterMove4 = pUseMovement(slowedTurn, 4, plantGrowthCost)
  
      assert(
          // 3-foot move succeeds: 15 - 12 = 3 remaining
          afterMove3.movementRemaining == slowedSpeed - 3 * plantGrowthCost
          // 4-foot move is blocked (no-op)
          and afterMove4.movementRemaining == slowedSpeed
          // After moving 3 feet, remaining (3) is less than one more foot's cost (4) —
          // confirming the creature effectively moves 1 ft per 8 ft of base speed
          and afterMove3.movementRemaining < plantGrowthCost
      )
  }
}
