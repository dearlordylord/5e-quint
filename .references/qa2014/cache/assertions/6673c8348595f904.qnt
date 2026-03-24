// Source: https://rpg.stackexchange.com/q/176482
module _qa_6673c8348595f904 {
  import dnd.* from "./dnd"

  // Total distance per day for different travel paces? (multiples of 6 for hex maps)
  run qa_travel_pace_daily_distances_are_multiples_of_6 = {
    // Daily values (30/24/18) are not simply hourly × 8; all are multiples of 6
    val fastDay    = pTravelMilesPerDay(PaceFast)
    val normalDay  = pTravelMilesPerDay(PaceNormal)
    val slowDay    = pTravelMilesPerDay(PaceSlow)
    val fastHour   = pTravelMilesPerHour(PaceFast)
    val normalHour = pTravelMilesPerHour(PaceNormal)
    val slowHour   = pTravelMilesPerHour(PaceSlow)
    assert(and {
      // PHB table values are exactly 30/24/18
      fastDay   == 30,
      normalDay == 24,
      slowDay   == 18,
      // All are multiples of 6 (5/4/3 hexes at 6 miles/hex)
      fastDay   % 6 == 0,
      normalDay % 6 == 0,
      slowDay   % 6 == 0,
      // Fast and Slow deliberately differ from hourly × 8
      fastDay  != fastHour   * 8,  // 30 ≠ 32
      slowDay  != slowHour   * 8,  // 18 ≠ 16
      // Normal coincidentally matches
      normalDay == normalHour * 8,
      // Fast is 2 miles less than naïve hourly calc; Slow is 2 miles more
      fastHour   * 8 - fastDay  == 2,
      slowDay    - slowHour * 8 == 2,
    })
  }
}
