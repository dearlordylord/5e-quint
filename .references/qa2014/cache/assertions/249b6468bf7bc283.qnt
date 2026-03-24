module _qa_249b6468bf7bc283 {
  import dnd.* from "./dnd"

  // Does the Scout's Ambush Master feature require a successful attack to activate it?
  run qa_ambush_master_requires_hit = {
    val attackBonus = 3
    val targetAC   = 15
    // First attack misses (5+3=8 < 15): no "first creature you hit" yet, Ambush Master inactive
    val firstMissed     = resolveAttackRoll(5,  attackBonus, targetAC, 0)
    // First attack hits (13+3=16 >= 15): Ambush Master activates for the rest of the round
    val firstHit        = resolveAttackRoll(13, attackBonus, targetAC, 0)
    // Subsequent attack WITHOUT Ambush Master advantage (miss didn't trigger it):
    // single d20=11 → 14 < 15, misses
    val subsequentNoAdv = resolveAttackRoll(11, attackBonus, targetAC, 0)
    // Subsequent attack WITH Ambush Master advantage (hit triggered it):
    // take max(11,12)=12 → 12+3=15 >= 15, hits
    val advDie           = intMax(11, 12)
    val subsequentAdv   = resolveAttackRoll(advDie, attackBonus, targetAC, 0)
    assert(
      not(firstMissed.hits)   and   // miss does NOT constitute a hit; feature stays inactive
      firstHit.hits           and   // successful attack triggers Ambush Master
      not(subsequentNoAdv.hits) and // borderline follow-up fails with no advantage (miss trigger)
      subsequentAdv.hits            // same borderline follow-up succeeds with advantage (hit trigger)
    )
  }
}
