// Source: https://rpg.stackexchange.com/q/210010
module _qa_df120478b9e8cc52 {
  import dnd.* from "./dnd"

  // How does cover interact with a Pact of the Chain Warlock with the Voice of the Chain Master Invocation?
  
  // Targets inside a room are behind total cover from outside caster — cannot be targeted at all
  run qa_total_cover_blocks_targeting = {
    assert(canBeTargeted(TotalCover) == false)
  }
  
  // Partial cover still permits targeting (Eldritch Blast can reach half/three-quarters cover targets)
  run qa_partial_cover_permits_targeting = {
    assert(
      canBeTargeted(NoCover) == true and
      canBeTargeted(HalfCover) == true and
      canBeTargeted(ThreeQuartersCover) == true
    )
  }
  
  // Half cover (+2 AC) and three-quarters cover (+5 AC) raise the attack threshold
  run qa_cover_ac_bonus_affects_attack = {
    // roll 14 + bonus 5 = 19 vs base AC 15
    val atk_no_cover    = resolveAttackRoll(14, 5, 15, coverBonus(NoCover))           // 19 >= 15 → hits
    val atk_half_cover  = resolveAttackRoll(14, 5, 15, coverBonus(HalfCover))         // 19 >= 17 → hits
    val atk_3q_cover    = resolveAttackRoll(14, 5, 15, coverBonus(ThreeQuartersCover))// 19 >= 20 → misses
    assert(
      atk_no_cover.hits   == true  and
      atk_half_cover.hits == true  and
      atk_3q_cover.hits   == false
    )
  }
  
  // Total cover yields no AC bonus — irrelevant because the target can't be selected in the first place
  run qa_total_cover_bonus_is_zero = {
    assert(coverBonus(TotalCover) == 0)
  }
}
