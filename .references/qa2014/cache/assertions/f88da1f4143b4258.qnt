// Source: https://rpg.stackexchange.com/q/130323
module _qa_f88da1f4143b4258 {
  import dnd.* from "./dnd"

  // How does Compelled Duel work with the saving throws?
  run qa_compelled_duel_initial_save_succeeds_no_effect = {
    // PHB p224: target makes an initial Wisdom save; success → spell has no effect at all
    // (no disadvantage on attacks, no movement restriction imposed)
    val dc = spellSaveDC(TEST_CONFIG) // 8 + wismod(1) + prof(3) = 12
    // target Wis mod +2, rolls 10 → 10 + 2 = 12 >= DC 12 → saves; spell fails to take hold
    assert(saveSucceeds(10, 2, false, 0, 0, dc) == true)
  }
  
  // How does Compelled Duel work with the saving throws?
  run qa_compelled_duel_initial_save_fails_spell_active = {
    // PHB: on failed initial save the target is compelled; disadvantage on attacks vs non-caster
    // and must make a Wisdom save each time it tries to move >30ft away
    val dc = spellSaveDC(TEST_CONFIG) // 12
    // target Wis mod +2, rolls 5 → 5 + 2 = 7 < DC 12 → fails; spell takes effect
    assert(saveSucceeds(5, 2, false, 0, 0, dc) == false)
  }
  
  // How does Compelled Duel work with the saving throws?
  run qa_compelled_duel_movement_save_per_turn_success = {
    // PHB: "must make a Wisdom saving throw each time it attempts to move >30ft away"
    // succeeding frees movement for that turn only — spell persists into next turns
    val dc = spellSaveDC(TEST_CONFIG) // 12
    // target Wis mod +2, rolls 12 → 12 + 2 = 14 >= DC 12 → free to move this turn
    assert(saveSucceeds(12, 2, false, 0, 0, dc) == true)
  }
  
  // How does Compelled Duel work with the saving throws?
  run qa_compelled_duel_movement_save_per_turn_failure = {
    // PHB: failing the per-turn movement save restricts movement beyond 30ft that turn;
    // next turn the target must save again if it tries to move >30ft
    val dc = spellSaveDC(TEST_CONFIG) // 12
    // target Wis mod +2, rolls 3 → 3 + 2 = 5 < DC 12 → restricted this turn
    assert(saveSucceeds(3, 2, false, 0, 0, dc) == false)
  }
}
