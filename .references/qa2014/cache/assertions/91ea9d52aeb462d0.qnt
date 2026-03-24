// Source: https://rpg.stackexchange.com/q/152419
module _qa_91ea9d52aeb462d0 {
  import dnd.* from "./dnd"

  // If an attack causes additional damage after a saving throw, is it counted as a separate source of damage for the purpose of failed death saves?
  run qa_compound_attack_separate_death_save_sources = {
    // Creature at 0 HP, unconscious+prone (wyvern within 5 ft → auto-crit applies)
    val c0 = freshCreature(20)
               .with("hp", 0)
               .with("unconscious", true)
               .with("prone", true)
               .with("incapacitatedSources", Set(ISUnconscious))
               .with("stable", false)
    // Step 1: Critical-hit piercing damage (2d6+4 = 11) at 0 HP → 2 death save failures
    val c1 = pTakeDamage(c0, 11, Piercing, Set(), Set(), Set(), true)
    // Step 2: Separate poison damage (7d6 = 17) from the failed Con save → 1 more failure
    val c2 = pTakeDamage(c1, 17, Poison, Set(), Set(), Set(), false)
    assert(
      // First source: critical hit adds exactly 2 failures, not yet dead
      c1.deathSaves.failures == 2 and
      not(c1.dead) and
      // Second source: independent pTakeDamage accumulates a third failure → dead
      c2.deathSaves.failures == 3 and
      c2.dead
    )
  }
}
