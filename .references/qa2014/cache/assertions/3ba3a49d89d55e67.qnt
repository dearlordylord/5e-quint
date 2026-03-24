// Source: https://rpg.stackexchange.com/q/205777
module _qa_3ba3a49d89d55e67 {
  import dnd.* from "./dnd"

  // Does Chain Lightning deal damage to its original target first?
  run qa_chain_lightning_primary_takes_damage_first = {
    // Primary target concentrates on "bless"; takes Chain Lightning damage first
    val primarySS = FRESH_SPELL_SLOTS.with("concentrationSpellId", "bless")
    val damageAmount = 20
    val concDC = pConcentrationDC(damageAmount) // intMax(20/2, 10) = 10
  
    // Primary rolls CON save: 5 + 2 mod = 7, fails DC 10 → bless ends
    val primarySaveOk = saveSucceeds(5, 2, false, 0, 0, concDC) // 7 >= 10 → false
    val primarySSAfter = pConcentrationCheck(primarySS, primarySaveOk)
    val blessNowGone = not(isConcentrating(primarySSAfter))
  
    // Secondary target concentrates on "haste"; now takes damage WITHOUT bless
    val secondarySS = FRESH_SPELL_SLOTS.with("concentrationSpellId", "haste")
    val blessBonus = 2 // the d4 bless bonus that would have applied
    // Roll 7 + 2 CON mod = 9 < DC 10 → fails without bless
    val saveWithoutBless = saveSucceeds(7, 2, false, 0, 0, concDC)         // 9 >= 10 → false
    // Roll 7 + 2 CON mod + 2 bless = 11 >= DC 10 → would have passed with bless
    val saveWithBless    = saveSucceeds(7, 2, false, 0, blessBonus, concDC) // 11 >= 10 → true
    val secondarySSAfter = pConcentrationCheck(secondarySS, saveWithoutBless)
  
    assert(
      // Primary target took damage first and lost bless concentration
      blessNowGone
      // Secondary target's save fails without bless...
      and not(saveWithoutBless)
      // ...but would have succeeded if bless were still active
      and saveWithBless
      // Consequently haste concentration is broken
      and not(isConcentrating(secondarySSAfter))
    )
  }
}
