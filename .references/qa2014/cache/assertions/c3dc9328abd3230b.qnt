// Source: https://rpg.stackexchange.com/q/166650
module _qa_c3dc9328abd3230b {
  import dnd.* from "./dnd"

  // Does Immovable Object spell allow an impenetrable shield? No — at best half cover per cover rules.
  run qa_immovable_object_umbrella_half_cover = {
    // Small object (umbrella) blocks at least half the body → half cover, not total cover
    // Half cover: +2 AC bonus, still targetable; total cover: untargetable (can't be targeted at all)
    val attackNoCover   = resolveAttackRoll(12, 5, 16, coverBonus(NoCover))
    val attackHalfCover = resolveAttackRoll(12, 5, 16, coverBonus(HalfCover))
    assert(
      // Half cover grants only +2 AC — not a full shield
      coverBonus(HalfCover) == 2
      // Target behind half cover is still targetable (foes can walk around or shoot through)
      and canBeTargeted(HalfCover) == true
      // Only total cover truly prevents targeting — which an umbrella does NOT provide
      and canBeTargeted(TotalCover) == false
      // Attack that hits without cover (12+5=17 >= AC 16) misses with half cover (17 < 16+2=18)
      and attackNoCover.hits == true
      and attackHalfCover.hits == false
    )
  }
}
