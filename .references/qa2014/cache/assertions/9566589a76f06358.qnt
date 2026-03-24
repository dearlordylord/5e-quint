// Source: https://rpg.stackexchange.com/q/162513
module _qa_9566589a76f06358 {
  import dnd.* from "./dnd"

  // What counts as a sufficient heat source to survive Amber Temple?
  // DMG p.110: no protection (no cold gear, no heat source, no cold immunity) →
  // fail DC 10 CON save at end of each hour → gain 1 level of exhaustion.
  // Accepted answer confirms a torch provides no mechanical protection; creature saves normally.
  run qa_extreme_cold_failed_con_save_adds_exhaustion = {
    val conMod = 0        // CON 10, no modifier
    val profBonus = proficiencyBonus(3)
    val d20Roll = 8       // 8 + 0 = 8 < 10: fails DC 10
    val saveFails = not(saveSucceeds(d20Roll, conMod, false, profBonus, 0, 10))
    val creature = freshCreature(20)
    val afterHour = if (saveFails) pAddExhaustion(creature, 1) else creature
    assert(saveFails and afterHour.exhaustion == 1)
  }
}
