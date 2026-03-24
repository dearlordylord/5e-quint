// Source: https://rpg.stackexchange.com/q/123266
module _qa_6fc52a9c389d2633 {
  import dnd.* from "./dnd"

  // Power Word Kill -- Max HP or current HP?
  run qa_power_word_kill_threshold_is_current_hp = {
    // Tarrasque-scale creature: maxHp=686, after 587 damage currentHp=99
    // PWK kills if current HP <= 100; max HP > 100 is irrelevant to threshold
    val s0 = freshCreature(686)
    val s1 = pTakeDamage(s0, 587, Slashing, Set(), Set(), Set(), false)
    assert(
      s1.hp == 99 and
      s1.maxHp == 686 and
      s1.hp <= 100 and   // current HP within PWK kill threshold → spell kills
      s1.maxHp > 100     // max HP is above threshold — irrelevant per accepted answer
    )
  }
  
  // Power Word Kill -- Max HP or current HP? (above-threshold, no-effect case)
  run qa_power_word_kill_no_effect_above_threshold = {
    // Same creature at 101 current HP: PWK has no effect
    val s0 = freshCreature(686)
    val s1 = pTakeDamage(s0, 585, Slashing, Set(), Set(), Set(), false)
    assert(s1.hp == 101 and s1.hp > 100)  // above threshold → PWK does nothing
  }
}
