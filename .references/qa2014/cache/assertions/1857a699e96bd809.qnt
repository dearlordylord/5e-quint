// Source: https://rpg.stackexchange.com/q/158863
module _qa_1857a699e96bd809 {
  import dnd.* from "./dnd"

  // Does Silent Image require line of sight? No — only an unobstructed path (no total cover) matters.
  run qa_silent_image_no_los_partial_cover_targetable = {
    // Spells without "that you can see" text can target through fog, dim light, or behind
    // half/three-quarters cover — only total cover (blocked path) disallows targeting.
    assert(
      canBeTargeted(NoCover) and
      canBeTargeted(HalfCover) and
      canBeTargeted(ThreeQuartersCover)
    )
  }
  
  // Silent Image behind a wall (total cover) — path is blocked, cannot target.
  run qa_silent_image_total_cover_blocks_targeting = {
    assert(not(canBeTargeted(TotalCover)))
  }
}
