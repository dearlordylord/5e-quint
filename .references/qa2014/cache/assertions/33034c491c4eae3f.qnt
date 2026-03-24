// Source: https://rpg.stackexchange.com/q/165891
module _qa_33034c491c4eae3f {
  import dnd.* from "./dnd"

  // Are there any spells that can damage a creature in another creatures stomach?
  // A creature inside another creature's stomach is behind TotalCover and cannot be directly targeted (PHB targeting rules).
  run qa_total_cover_blocks_direct_spell_targeting = {
    // Inner creature (e.g. parasite in stomach) is effectively TotalCover — cannot be targeted directly.
    // Workarounds like Glyph of Warding target an object (the paper), not the creature,
    // but the spec encodes the foundational rule: TotalCover blocks direct targeting.
    assert(
      not(canBeTargeted(TotalCover))
      and canBeTargeted(NoCover)
      and canBeTargeted(HalfCover)
      and canBeTargeted(ThreeQuartersCover)
    )
  }
}
