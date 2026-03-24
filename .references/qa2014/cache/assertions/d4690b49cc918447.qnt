// Source: https://rpg.stackexchange.com/q/190639
module _qa_d4690b49cc918447 {
  import dnd.* from "./dnd"

  // "How is suffering failed death saves from damage at 0 HP affected by save reroll features like Indomitable or Diamond Soul?"
  // Accepted: no d20 is rolled when taking damage at 0 HP — failures are automatic,
  // so reroll features (Indomitable, Diamond Soul) that require an actual save roll cannot be used.
  run qa_damage_at_0hp_auto_fails_no_roll = {
    // Dying creature: 0 HP, unconscious, not yet dead or stable
    val dying = freshCreature(20)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
  
    // Normal damage at 0 HP → 1 automatic failure injected by pTakeDamage (no d20)
    val afterNormal = pTakeDamage(dying, 5, Slashing, Set(), Set(), Set(), false)
    // Critical damage at 0 HP → 2 automatic failures injected by pTakeDamage (no d20)
    val afterCrit = pTakeDamage(dying, 5, Slashing, Set(), Set(), Set(), true)
  
    // Contrast: pDeathSave *does* take a d20Roll argument — that is the roll
    // reroll features like Indomitable / Diamond Soul would attach to.
    // pTakeDamage at 0 HP calls pAddDeathFailures directly, bypassing pDeathSave entirely.
    val actualRollSucceeds = pDeathSave(dying, 15)
  
    assert(
      // automatic failure path: 1 failure, no successes, no d20 needed
      afterNormal.deathSaves.failures == 1
      and afterNormal.deathSaves.successes == 0
      // automatic failure path: 2 failures on a crit, no d20 needed
      and afterCrit.deathSaves.failures == 2
      and afterCrit.deathSaves.successes == 0
      // real save path (roll 15 >= 10): 1 success, 0 failures — this is what reroll features would modify
      and actualRollSucceeds.deathSaves.successes == 1
      and actualRollSucceeds.deathSaves.failures == 0
    )
  }
}
