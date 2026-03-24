// Source: https://rpg.stackexchange.com/q/86613
module _qa_ef8c5044c7ab0b3d {
  import dnd.* from "./dnd"

  // what is considered a "fast pace" for flying creatures?
  run qa_travel_pace_fast_slow_one_third_of_normal = {
    // Accepted answer: no RAW table for flying; calculate as Normal ± 1/3.
    // Standard table (30ft base): Normal=300, Fast=400, Slow=200 ft/min.
    // Same ±1/3 formula scales to any base speed (e.g. 50ft fly → Normal=500, Fast=666, Slow=333).
    val normalFpm = pTravelFeetPerMinute(PaceNormal)
    val fastFpm   = pTravelFeetPerMinute(PaceFast)
    val slowFpm   = pTravelFeetPerMinute(PaceSlow)
    // For 50ft fly speed: scale proportionally from 30ft walk base
    val flySpeed   = 50
    val walkSpeed  = 30
    val flyNormal  = normalFpm * flySpeed / walkSpeed  // 500 ft/min
    val flyFast    = flyNormal + flyNormal / 3          // 666 ft/min
    val flySlow    = flyNormal - flyNormal / 3          // 333 ft/min
    assert(and {
      // PHB table values satisfy the ±1/3 relationship exactly (integer division)
      fastFpm == normalFpm + normalFpm / 3,
      slowFpm == normalFpm - normalFpm / 3,
      // Fast pace imposes -5 passive Perception regardless of travel medium
      pTravelPerceptionPenalty(PaceFast) == -5,
      pTravelPerceptionPenalty(PaceNormal) == 0,
      pTravelPerceptionPenalty(PaceSlow) == 0,
      // Stealth only available at slow pace
      pCanStealthWhileTraveling(PaceSlow),
      not(pCanStealthWhileTraveling(PaceNormal)),
      not(pCanStealthWhileTraveling(PaceFast)),
      // Scaled values for 50ft fly speed
      flyNormal == 500,
      flyFast   == 666,
      flySlow   == 334,
    })
  }
}
