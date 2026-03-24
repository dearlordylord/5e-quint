// Source: https://rpg.stackexchange.com/q/201781
module _qa_84b3aac3cff9c4ac {
  import dnd.* from "./dnd"

  // Is disadvantage resolved before or after the bonus is applied from the Reborn lineage's Knowledge from a Past Life trait?
  run qa_disadvantage_resolves_before_modifiers = {
    // Two d20s under disadvantage: 11 and 14; d6 bonus (Knowledge from a Past Life): 5; DC 15
    // Correct: pick lower d20 first (11), then add bonus → 11 + 5 = 16 ≥ 15 → succeeds
    // Wrong:   add bonus to lower roll first → {16, 14}, pick lower → 14 < 15 → fails
    val d20a = 11
    val d20b = 14
    val d6Bonus = 5
    val dc = 15
  
    // Spec design: caller resolves advantage/disadvantage before passing d20Roll to checkSucceeds;
    // miscBonus carries the d6 addition applied after roll selection.
    val resolvedRoll = if (d20a < d20b) d20a else d20b   // disadvantage → lower = 11
  
    // Correct method: resolve disadvantage first, then add d6 as miscBonus
    val correctResult = checkSucceeds(resolvedRoll, 0, NoneProf, 0, d6Bonus, dc)  // 11+5=16 ≥ 15
  
    // Wrong method: add d6 to the smaller roll first, then pick lower of the two resulting values
    val wrongLower = if ((d20a + d6Bonus) < d20b) (d20a + d6Bonus) else d20b     // min(16,14) = 14
    val wrongResult = wrongLower >= dc                                              // 14 ≥ 15 → false
  
    assert(correctResult and not(wrongResult))
  }
}
