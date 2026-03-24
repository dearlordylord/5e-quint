// Source: https://rpg.stackexchange.com/q/77415
module _qa_cb7b238e7b24bf80 {
  import dnd.* from "./dnd"

  // Would Your Speed Be Reduced If You Drag A Grappled Opponent Through Difficult Terrain?
  run qa_grappled_creature_has_speed_zero = {
    // Grappled creature's speed becomes 0 (PHB conditions: Grappled)
    val creature = freshCreature(20).with("grappled", true)
    val t = pStartTurn(TEST_CONFIG, creature, Unarmored, false, 0, false, false)
    assert(t.effectiveSpeed == 0 and t.movementRemaining == 0)
  }
  
  // Would Your Speed Be Reduced If You Drag A Grappled Opponent Through Difficult Terrain?
  run qa_grappler_speed_halved_same_size_target = {
    // Grappler dragging a same-size creature: grappler's own speed is halved (30 -> 15)
    val grappler = freshCreature(20)
    val t = pStartTurn(TEST_CONFIG, grappler, Unarmored, false, 0, true, false)
    assert(t.effectiveSpeed == 15)
  }
  
  // Would Your Speed Be Reduced If You Drag A Grappled Opponent Through Difficult Terrain?
  run qa_grappler_speed_not_halved_two_sizes_smaller = {
    // Exception: grappled target 2+ sizes smaller -> grappler's speed NOT halved (PHB p.195)
    val grappler = freshCreature(20)
    val t = pStartTurn(TEST_CONFIG, grappler, Unarmored, false, 0, true, true)
    assert(t.effectiveSpeed == 30)
  }
  
  // Would Your Speed Be Reduced If You Drag A Grappled Opponent Through Difficult Terrain?
  run qa_grappler_movement_cost_ignores_grappled_creature_terrain = {
    // Grappler on easy terrain dragging target through difficult terrain:
    // pMovementCost only takes the grappler's own terrain; grappled creature's terrain
    // is not an input and cannot add extra cost. Cost = 1 (grappler on normal ground).
    val grapplerCost = pMovementCost(false, false, false, false, false)
    assert(grapplerCost == 1)
  }
}
