// Source: https://rpg.stackexchange.com/q/214987
module _qa_25bc415791cdef4e {
  import dnd.* from "./dnd"

  // PHB p.182: Ice-covered ground is difficult terrain; per-foot movement cost is 2x
  run qa_ice_snow_difficult_terrain_movement_cost = {
    assert(pMovementCost(true, false, false, false, false) == 2)
  }
  
  // PHB p.182: Difficult terrain halves overland travel — normal pace 24 mi/day becomes 12
  run qa_difficult_terrain_halves_overland_travel = {
    assert(pDifficultTerrainTravel(pTravelMilesPerDay(PaceNormal)) == 12)
  }
  
  // IWD overland travel (snowshoes: ~4 mi/day at 0.5 mph × 8h) is far slower than standard PHB
  // difficult terrain (12 mi/day), confirming IWD speeds are their own separate rule on top of
  // the PHB difficult terrain halving — not merely the result of applying that rule
  run qa_iwd_travel_slower_than_standard_difficult_terrain = {
    val standardDtMilesPerDay = pDifficultTerrainTravel(pTravelMilesPerDay(PaceNormal)) // 12
    val iwdSnowshoeMilesPerDay = 4  // 0.5 mph * 8h per Rime of the Frostmaiden table
    assert(iwdSnowshoeMilesPerDay < standardDtMilesPerDay)
  }
}
