// Source: https://rpg.stackexchange.com/q/195034
module _qa_a23057acdd1ed82f {
  import dnd.* from "./dnd"

  // Can I target someone who I can see in a mirror?
  // Accepted answer: seeing a target via mirror counts as seeing them; spell targeting requires only no total cover (clear path).
  run qa_mirror_sight_targeting = {
    // Illusory wall provides no actual cover — target is fully targetable.
    // Mirror view satisfies "see the target"; only TotalCover blocks spell targeting.
    assert(
      canBeTargeted(NoCover)             == true
      and canBeTargeted(HalfCover)       == true
      and canBeTargeted(ThreeQuartersCover) == true
      and canBeTargeted(TotalCover)      == false
    )
  }
}
