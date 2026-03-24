// Source: https://rpg.stackexchange.com/q/197904
module _qa_441969e0e0b84c05 {
  import dnd.* from "./dnd"

  // Blood Hunter's Aether Walk with Mobile feat interaction
  run qa_aether_walk_mobile_dash_negates_difficult_terrain = {
    // Aether Walk: move through objects/creatures as difficult terrain (cost x2 per foot).
    // Mobile feat + Dash action: difficult terrain costs no extra movement.
    // Result: Mobile negates Aether Walk's extra movement cost on Dash turns.
    val creature = freshCreature(20)
    val t0 = FRESH_TURN
    // Use Dash action: movement becomes 30 + 30 = 60 feet
    val tAfterDash = pUseAction(t0, creature, ADash)
  
    // Without Mobile: Aether Walk terrain = difficult terrain, cost multiplier = 2
    val costWithoutMobile = pMovementCost(true, false, false, false, false)
    // With Mobile + Dash: difficult terrain costs no extra, pass isDifficultTerrain=false
    val costWithMobile = pMovementCost(false, false, false, false, false)
  
    // Move 10 feet through Aether Walk terrain without Mobile benefit
    val tNoMobile = pUseMovement(tAfterDash, 10, costWithoutMobile)
    // Move 10 feet through Aether Walk terrain with Mobile + Dash (no extra cost)
    val tMobile = pUseMovement(tAfterDash, 10, costWithMobile)
  
    assert(
      // Without Mobile: 10ft through difficult terrain costs 20 movement (60 - 20 = 40)
      costWithoutMobile == 2 and
      tNoMobile.movementRemaining == 40 and
      // With Mobile + Dash: 10ft through Aether Walk costs only 10 movement (60 - 10 = 50)
      costWithMobile == 1 and
      tMobile.movementRemaining == 50 and
      // Mobile saves exactly 10 feet of movement versus no-Mobile baseline
      tMobile.movementRemaining - tNoMobile.movementRemaining == 10
    )
  }
}
