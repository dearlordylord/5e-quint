// Source: https://rpg.stackexchange.com/q/177003
module _qa_0e10b0a295506251 {
  import dnd.* from "./dnd"

  // What happens if you get over 20 on a death save?
  run qa_death_save_natural_20_regains_hp = {
    val dying = freshCreature(10)
                  .with("hp", 0)
                  .with("unconscious", true)
                  .with("prone", true)
                  .with("incapacitatedSources", Set(ISUnconscious))
    // Only a natural 20 on the d20 itself triggers regain 1 HP + wake up
    val result = pDeathSave(dying, 20)
    assert(result.hp == 1 and not(result.unconscious))
  }
  
  // What happens if you get over 20 on a death save? (Bless modifier scenario)
  run qa_death_save_bless_modified_total_not_natural_20 = {
    val dying = freshCreature(10)
                  .with("hp", 0)
                  .with("unconscious", true)
                  .with("prone", true)
                  .with("incapacitatedSources", Set(ISUnconscious))
    // Bless adds a d4; if d20=19 and Bless adds 1+, total is 20+ but NOT a natural 20.
    // pDeathSave checks d20Roll == 20 (the raw die), not the modified total.
    // Result: ordinary success (>= 10), creature stays at 0 HP.
    val result = pDeathSave(dying, 19)
    assert(result.hp == 0 and result.deathSaves.successes == 1)
  }
}
