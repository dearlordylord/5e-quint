// Source: https://rpg.stackexchange.com/q/41911
module _qa_bad227c1c4e9b830 {
  import dnd.* from "./dnd"

  // Does a hit to a stabilized character count as a death saving failure?
  run qa_stable_creature_damage_causes_death_save_failure = {
    val maxHp = 20
    val stableCreature = freshCreature(maxHp)
      .with("hp", 0)
      .with("stable", true)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
      .with("deathSaves", DEATH_SAVES_RESET)
    val afterDamage = pTakeDamage(stableCreature, 5, Slashing, Set(), Set(), Set(), false)
    assert(
      afterDamage.stable == false and
      afterDamage.deathSaves.failures == 1
    )
  }
  
  // Does a hit to a stabilized character count as a death saving failure? (crit = two failures)
  run qa_stable_creature_crit_causes_two_death_save_failures = {
    val maxHp = 20
    val stableCreature = freshCreature(maxHp)
      .with("hp", 0)
      .with("stable", true)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
      .with("deathSaves", DEATH_SAVES_RESET)
    val afterDamage = pTakeDamage(stableCreature, 5, Slashing, Set(), Set(), Set(), true)
    assert(
      afterDamage.stable == false and
      afterDamage.deathSaves.failures == 2
    )
  }
  
  // Does a hit to a stabilized character count as a death saving failure? (damage >= maxHp = instant death)
  run qa_stable_creature_max_hp_damage_causes_instant_death = {
    val maxHp = 20
    val stableCreature = freshCreature(maxHp)
      .with("hp", 0)
      .with("stable", true)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
      .with("deathSaves", DEATH_SAVES_RESET)
    val afterDamage = pTakeDamage(stableCreature, 20, Slashing, Set(), Set(), Set(), false)
    assert(afterDamage.dead == true)
  }
}
