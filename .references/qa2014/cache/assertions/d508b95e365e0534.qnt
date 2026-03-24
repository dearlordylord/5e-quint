// Source: https://rpg.stackexchange.com/q/79814
module _qa_d508b95e365e0534 {
  import dnd.* from "./dnd"

  // What happens when allies occupy the same space? - ally space is difficult terrain (cost multiplier 2)
  run qa_ally_space_is_difficult_terrain = {
    // PHB p.191: "another creature's space is difficult terrain for you"
    // pMovementCost with isDifficultTerrain=true must return 2 (costs 1 extra foot per foot)
    val cost = pMovementCost(true, false, false, false, false)
    assert(cost == 2)
  }
  
  // What happens when allies occupy the same space? - entering ally space consumes double movement budget
  run qa_moving_through_ally_space_costs_double = {
    // Moving 5 feet through difficult terrain (ally's space) spends 10 feet from a 30-foot budget
    val t = pUseMovement(FRESH_TURN, 5, 2)
    assert(t.movementRemaining == 20)
  }
  
  // What happens when allies occupy the same space? - grappled creature gets speed 0, forced to stay
  run qa_grapple_arrests_creature_in_space = {
    // A readied grapple (AWins) applies CGrappled; grappled creatures have speed 0 on their turn
    // This models unwillingly ending a move in another creature's space
    val target = freshCreature(20)
    val result = pGrapple(Medium, Medium, target, AWins, true)
    val t = pStartTurn(TEST_CONFIG, result.targetState, Unarmored, false, 0, false, false)
    assert(result.success and result.targetState.grappled and t.movementRemaining == 0)
  }
  
  // What happens when allies occupy the same space? - grapple on ally (size-eligible) succeeds on AWins
  run qa_ally_grapple_succeeds_same_size = {
    // "You can grapple your ally, providing they're unwilling, as grapple is a contest"
    // Same-size grapple with a free hand and AWins result applies CGrappled
    val ally = freshCreature(20)
    val result = pGrapple(Medium, Medium, ally, AWins, true)
    assert(result.success and result.targetState.grappled)
  }
  
  // What happens when allies occupy the same space? - difficult terrain stacks with other penalties (crawling)
  run qa_ally_space_plus_crawling_costs_triple = {
    // Crawling through difficult terrain (ally's space while prone): 1 + 1 (difficult) + 1 (crawl) = 3
    val cost = pMovementCost(true, true, false, false, false)
    assert(cost == 3)
  }
}
