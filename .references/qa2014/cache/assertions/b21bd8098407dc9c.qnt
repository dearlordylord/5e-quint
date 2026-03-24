module _qa_b21bd8098407dc9c {
  import dnd.* from "./dnd"

  // Can we use Tiers of DMG for 3 Pillars Experience System?
  run qa_phb_tiers_match_level_ranges = {
    // Accepted answer: tiers are Tier1=1-4, Tier2=5-10, Tier3=11-16, Tier4=17-20 (PHB p.15)
    // Encode by asserting each tier boundary and tier-max level maps to the correct XP threshold.
    assert(and {
      pXpForLevel(1)  == 0,      // tier 1 floor
      pXpForLevel(4)  == 2700,   // tier 1 ceiling
      pXpForLevel(5)  == 6500,   // tier 2 starts here
      pXpForLevel(10) == 64000,  // tier 2 ceiling
      pXpForLevel(11) == 85000,  // tier 3 starts here
      pXpForLevel(16) == 195000, // tier 3 ceiling
      pXpForLevel(17) == 225000, // tier 4 starts here
      pXpForLevel(20) == 355000, // tier 4 ceiling / level cap
      // pLevelForXp is consistent with pXpForLevel across all 20 levels
      1.to(20).forall(l => pLevelForXp(pXpForLevel(l)) == l),
    })
  }
}
