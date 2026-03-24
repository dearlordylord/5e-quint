// Source: https://rpg.stackexchange.com/q/145379
module _qa_f573ceab75ad01c5 {
  import dnd.* from "./dnd"

  // When the Haste spell ends on a creature, do attackers have advantage against that creature?
  // Haste end: speed=0, actions locked — but NO condition applied, so no attacker advantage.
  run qa_haste_end_no_attacker_advantage = {
    // Model the post-Haste creature: healthy, no conditions applied
    // (Haste's lethargy is speed=0 + action lockout, not Paralyzed/Stunned/etc.)
    val c = freshCreature(30)
    val defModsClose = pDefenseModifiers(c, true)   // attacker within 5 ft
    val defModsFar   = pDefenseModifiers(c, false)  // attacker beyond 5 ft
    assert(
      not(defModsClose.attackerAdvantage) and
      not(defModsClose.autoCrit) and
      not(defModsFar.attackerAdvantage) and
      not(defModsFar.autoCrit)
    )
  }
  
  // When the Haste spell ends on a creature, do attackers have advantage against that creature?
  // STR and DEX saves work normally during Haste lethargy — no auto-fail, no disadvantage.
  run qa_haste_end_saves_unaffected = {
    val c = freshCreature(30)
    val strMods = pSaveModifiers(c, Str)
    val dexMods = pSaveModifiers(c, Dex)
    assert(
      not(strMods.autoFail) and
      not(strMods.hasDisadvantage) and
      not(dexMods.autoFail) and
      not(dexMods.hasDisadvantage)
    )
  }
  
  // When the Haste spell ends on a creature, do attackers have advantage against that creature?
  // Contrast: applying Paralyzed (an actual condition) DOES grant attacker advantage + auto-crit.
  // This confirms Haste's end effect is NOT equivalent to any incapacitating condition.
  run qa_haste_end_not_equivalent_to_paralyzed = {
    val c         = freshCreature(30)
    val cParalyzed = pApplyCondition(c, CParalyzed)
    val noCondMods = pDefenseModifiers(c, true)
    val paraMods   = pDefenseModifiers(cParalyzed, true)
    assert(
      not(noCondMods.attackerAdvantage) and
      paraMods.attackerAdvantage and
      paraMods.autoCrit
    )
  }
}
