// Source: https://rpg.stackexchange.com/q/92145
module _qa_2f10e242eccbb1c3 {
  import dnd.* from "./dnd"

  // War God's Blessing applies to Bigby's Hand attacks because the caster makes the roll using their own game statistics
  run qa_war_gods_blessing_bigby_hand = {
    // Scenario: caster's spell attack bonus = +5, target AC = 16, d20 = 5
    // Without blessing: 5 + 5 = 10 < 16 → miss
    val withoutBlessing = resolveAttackRoll(5, 5, 16, 0)
    // War God's Blessing: +10 to the caster's roll (caster within 30ft, hand's position irrelevant)
    // The caster is the one "making the attack roll" (PHB 218: "Make a melee spell attack … using your game statistics")
    // With blessing: 5 + (5 + 10) = 20 >= 16 → hit
    val withBlessing = resolveAttackRoll(5, 5 + 10, 16, 0)
    assert(
      not(withoutBlessing.hits) and
      withBlessing.hits and
      not(withBlessing.isCritical)
    )
  }
}
