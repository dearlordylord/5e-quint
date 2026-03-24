// Source: https://rpg.stackexchange.com/q/71977
module _qa_4e54a7d44674f1f9 {
  import dnd.* from "./dnd"

  // Does the Compulsion spell affect as many creatures as desired?
  run qa_compulsion_multi_target = {
    // Compulsion targets any number of creatures satisfying conditions;
    // each makes an independent WIS save — no cap on target count imposed by the spell.
    val dc = spellSaveDC(TEST_CONFIG)
    val pb = proficiencyBonus(TEST_CONFIG.level)
    // Three creatures with WIS mod 0, unproficient — each rolls independently against the same DC
    val c1Affected    = not(saveSucceeds(5,  0, false, pb, 0, dc))
    val c2Affected    = not(saveSucceeds(4,  0, false, pb, 0, dc))
    val c3NotAffected =     saveSucceeds(15, 0, false, pb, 0, dc)
    // All three can be simultaneously targeted; each outcome is determined solely by roll vs DC
    assert(c1Affected and c2Affected and c3NotAffected)
  }
}
