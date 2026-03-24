// Source: https://rpg.stackexchange.com/q/144874
module _qa_e541a0675ac73048 {
  import dnd.* from "./dnd"

  // Holy Weapon burst of radiance (errata XGtE 2020): failed CON save → full radiant damage and blinded
  run qa_holy_weapon_burst_failed_save = {
    val creature = freshCreature(50)
    val spellDC = 16
    val fullDamage = 24   // representative 4d8 roll
    val d20Roll = 5       // 5 + 0 = 5 < DC 16 → fail
    val conMod = 0
    val profBonus = 3
    val failed = not(saveSucceeds(d20Roll, conMod, false, profBonus, 0, spellDC))
    val afterDamage = pTakeDamage(creature, fullDamage, Radiant, Set(), Set(), Set(), false)
    val afterBlind = pApplyCondition(afterDamage, CBlinded)
    assert(
      failed and
      afterBlind.hp == 50 - fullDamage and
      afterBlind.blinded
    )
  }
  
  // Holy Weapon burst of radiance (errata XGtE 2020): successful CON save → half radiant damage, not blinded
  run qa_holy_weapon_burst_success_save = {
    val creature = freshCreature(50)
    val spellDC = 16
    val fullDamage = 24
    val halfDamage = fullDamage / 2  // = 12
    val d20Roll = 14      // 14 + 3 (conMod) + 3 (prof) = 20 >= DC 16 → succeed
    val conMod = 3
    val profBonus = 3
    val succeeded = saveSucceeds(d20Roll, conMod, true, profBonus, 0, spellDC)
    val afterDamage = pTakeDamage(creature, halfDamage, Radiant, Set(), Set(), Set(), false)
    assert(
      succeeded and
      afterDamage.hp == 50 - halfDamage and
      not(afterDamage.blinded)
    )
  }
}
