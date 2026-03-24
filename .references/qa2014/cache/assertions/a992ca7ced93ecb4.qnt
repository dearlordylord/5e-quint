// Source: https://rpg.stackexchange.com/q/160006
module _qa_a992ca7ced93ecb4 {
  import dnd.* from "./dnd"

  // Does Mage Hand require line of sight to summon?
  run qa_mage_hand_total_cover_blocks_targeting = {
    // Accepted answer: clear path required — total cover (wall/door) blocks summoning
    assert(not(canBeTargeted(TotalCover)))
  }
  
  // Does Mage Hand require line of sight to summon?
  run qa_mage_hand_partial_cover_and_no_cover_allow_targeting = {
    // Accepted answer: line of sight NOT required — fog/blindfolded still targetable if no total cover
    assert(
      canBeTargeted(NoCover) and
      canBeTargeted(HalfCover) and
      canBeTargeted(ThreeQuartersCover)
    )
  }
}
