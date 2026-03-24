// Source: https://rpg.stackexchange.com/q/181352
module _qa_eea05397d7e8ee58 {
  import dnd.* from "./dnd"

  // Fire Genasi no cold resistance: cold damage is not halved (no resistance, no immunity)
  run qa_fire_genasi_no_cold_resistance = {
    val dmgNoResist = applyDamageModifiers(10, Cold, Set(), Set(), Set())
    val dmgWithResist = applyDamageModifiers(10, Cold, Set(), Set(Cold), Set())
    assert(dmgNoResist == 10 and dmgWithResist == 5)
  }
  
  // Fire Genasi +2 CON bonus turns borderline extreme-cold DC 10 save from fail to pass
  run qa_fire_genasi_con_bonus_extreme_cold_save = {
    // Roll 8, CON mod 0 (human baseline): 8 < 10 → fails
    val failsNoBonus = saveSucceeds(8, 0, false, 3, 0, 10)
    // Roll 8, CON mod +2 (Fire Genasi +2 CON): 8+2=10 >= 10 → passes
    val succeedsWithBonus = saveSucceeds(8, 2, false, 3, 0, 10)
    assert(not(failsNoBonus) and succeedsWithBonus)
  }
  
  // Failing the extreme cold DC 10 CON save causes exactly 1 level of exhaustion
  run qa_extreme_cold_fail_adds_one_exhaustion = {
    val s = freshCreature(20)
    val s1 = pAddExhaustion(s, 1)
    assert(s1.exhaustion == 1 and not(s1.dead))
  }
}
