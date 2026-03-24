// Source: https://rpg.stackexchange.com/q/162370
module _qa_9ca5c545ec3a1b8f {
  import dnd.* from "./dnd"

  // "How can I hit what I can't see?" — a freely chosen point in open air has NoCover and is always targetable; what lies beyond it is irrelevant
  run qa_point_in_space_is_targetable = {
    // The designated point is in open air — NoCover — so it can be targeted.
    // The mountain (or any obstacle) behind that point does not retroactively
    // impose cover on the point itself; only the point's own cover status matters.
    assert(canBeTargeted(NoCover) == true)
      and assert(canBeTargeted(HalfCover) == true)
      and assert(canBeTargeted(ThreeQuartersCover) == true)
      and assert(canBeTargeted(TotalCover) == false)
  }
}
