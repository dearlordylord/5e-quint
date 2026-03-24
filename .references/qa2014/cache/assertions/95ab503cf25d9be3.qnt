// Source: https://rpg.stackexchange.com/q/171085
module _qa_95ab503cf25d9be3 {
  import dnd.* from "./dnd"

  // What does the spell Compelled Duel actually do? — failed WIS save (DM ruling): movement >30 ft blocked that turn
  run qa_compelled_duel_failed_save_blocks_movement = {
    val wisMod = abilityModifier(14)          // score 14 → mod +2
    val profBonus = proficiencyBonus(5)       // level 5 → +3
    val saveFailed = not(saveSucceeds(4, wisMod, false, profBonus, 0, 14))
    // DM ruling: failed save means no movement away from caster (model: movementRemaining = 0)
    val t = FRESH_TURN.with("movementRemaining", 0)
    val tAfter = pUseMovement(t, 5, 1)
    assert(saveFailed and tAfter.movementRemaining == 0)
  }
  
  // What does the spell Compelled Duel actually do? — successful WIS save: movement unrestricted for that turn
  run qa_compelled_duel_success_save_allows_movement = {
    val wisMod = abilityModifier(14)          // score 14 → mod +2
    val profBonus = proficiencyBonus(5)       // level 5 → +3
    val saveSucceeded = saveSucceeds(15, wisMod, false, profBonus, 0, 14)
    // DM ruling: on success the spell does not restrict movement for that turn
    val t = FRESH_TURN                        // 30 ft remaining
    val tAfter = pUseMovement(t, 10, 1)
    assert(saveSucceeded and tAfter.movementRemaining == 20)
  }
}
