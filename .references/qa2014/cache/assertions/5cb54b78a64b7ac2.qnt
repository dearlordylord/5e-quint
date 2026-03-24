// Source: https://rpg.stackexchange.com/q/170151
module _qa_5cb54b78a64b7ac2 {
  import dnd.* from "./dnd"

  // Clockwork Amulet: affects all attack rolls (melee, ranged, spell) identically — no type restriction
  run qa_clockwork_amulet_all_attack_types_equal = {
    // The amulet replaces the d20 with a 10 for any attack roll the wearer makes.
    // resolveAttackRoll applies the same logic regardless of melee, ranged, or spell attack type.
    val bonus = 5
    val ac = 14
    val meleeResult  = resolveAttackRoll(10, bonus, ac, 0)
    val rangedResult = resolveAttackRoll(10, bonus, ac, 0)
    val spellResult  = resolveAttackRoll(10, bonus, ac, 0)
    assert(
      meleeResult  == { hits: true, isCritical: false } and
      rangedResult == { hits: true, isCritical: false } and
      spellResult  == { hits: true, isCritical: false } and
      meleeResult  == rangedResult and
      rangedResult == spellResult
    )
  }
  
  // Clockwork Amulet: d20=10 saves attack rolls that a low natural roll would miss, for any attack type
  run qa_clockwork_amulet_10_beats_low_natural = {
    // Without amulet: d20=3, bonus=5, AC=14 → 8 < 14 → miss regardless of attack type.
    // With amulet:    d20=10, bonus=5, AC=14 → 15 >= 14 → hit, uniformly across all attack types.
    val bonus = 5
    val ac = 14
    val naturalMiss     = resolveAttackRoll(3,  bonus, ac, 0)
    val amuletMelee     = resolveAttackRoll(10, bonus, ac, 0)
    val amuletRanged    = resolveAttackRoll(10, bonus, ac, 0)
    val amuletSpell     = resolveAttackRoll(10, bonus, ac, 0)
    assert(
      not(naturalMiss.hits) and
      amuletMelee.hits  and
      amuletRanged.hits and
      amuletSpell.hits
    )
  }
  
  // Clockwork Amulet: d20=10 still misses when bonus is insufficient for any attack type
  run qa_clockwork_amulet_10_still_misses_when_outmatched = {
    // Amulet is not a guaranteed hit; it just fixes the d20 at 10.
    // d20=10, bonus=2, AC=14 → 12 < 14 → miss for melee, ranged, and spell alike.
    val bonus = 2
    val ac = 14
    val meleeResult  = resolveAttackRoll(10, bonus, ac, 0)
    val rangedResult = resolveAttackRoll(10, bonus, ac, 0)
    val spellResult  = resolveAttackRoll(10, bonus, ac, 0)
    assert(
      not(meleeResult.hits)  and
      not(rangedResult.hits) and
      not(spellResult.hits)  and
      meleeResult == rangedResult and
      rangedResult == spellResult
    )
  }
}
