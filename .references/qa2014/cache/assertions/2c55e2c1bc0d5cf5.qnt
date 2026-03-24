// Source: https://rpg.stackexchange.com/q/214789
module _qa_2c55e2c1bc0d5cf5 {
  import dnd.* from "./dnd"

  // Is there an error in the new Carrion Crawler stat block? (Paralyzed auto-fails Str/Dex saves, not Con)
  run qa_paralyzed_dex_save_autofails_but_con_does_not = {
    val paralyzedState = pApplyCondition(freshCreature(20), CParalyzed)
    assert(
      // Original erroneous Dex save: paralyzed creature auto-fails → can never escape the effect
      pSaveModifiers(paralyzedState, Dex).autoFail == true
      // Errata-corrected Con save: paralyzed creature does NOT auto-fail → can still escape
      and pSaveModifiers(paralyzedState, Con).autoFail == false
    )
  }
}
