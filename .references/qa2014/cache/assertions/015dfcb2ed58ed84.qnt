// Source: https://rpg.stackexchange.com/q/197414
module _qa_015dfcb2ed58ed84 {
  import dnd.* from "./dnd"

  // What happens if I roll a 1 on a death saving throw but the result is 10 or above?
  // Specific rule (nat 1 = two failures) overrides general rule (10+ = success), PHB p.197.
  run qa_nat1_death_save_always_two_failures = {
    // Creature at 0 HP, dying — even a hypothetical +9 bonus is irrelevant;
    // pDeathSave checks the raw d20 roll, so nat 1 must yield two failures.
    val dying = freshCreature(20)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
    val after = pDeathSave(dying, 1)
    assert(
      after.deathSaves.failures == 2
      and after.deathSaves.successes == 0
      and not(after.stable)
      and not(after.dead)
    )
  }
}
