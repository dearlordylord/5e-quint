// Source: https://rpg.stackexchange.com/q/94412
module _qa_442f35d85db45dee {
  import dnd.* from "./dnd"

  // Could you use the Help action outside of combat?
  // PHB 175 "Working Together": outside combat a helper grants advantage on an ability check,
  // provided the helper could attempt the task independently.
  run qa_working_together_grants_advantage = {
    // Scenario: lead character has STR 12 (+1 mod), no proficiency, DC 15.
    // Alone they roll an 8 → total 9, fails.
    // With a helper (advantage) they take the higher of two rolls: 8 vs 14 → 14, total 15, succeeds.
    val abilityMod  = 1   // STR 12
    val profBonus   = 2
    val dc          = 15
    val rollLow     = 8   // what the lead character would roll without help
    val rollHigh    = 14  // second roll available under advantage
    // Advantage = take the higher die (pre-resolved by caller per spec convention)
    val advantageRoll = if (rollHigh > rollLow) rollHigh else rollLow
    val failsAlone    = not(checkSucceeds(rollLow,       abilityMod, NoneProf, profBonus, 0, dc))
    val succeedsHelped =    checkSucceeds(advantageRoll, abilityMod, NoneProf, profBonus, 0, dc)
    assert(failsAlone and succeedsHelped)
  }
}
