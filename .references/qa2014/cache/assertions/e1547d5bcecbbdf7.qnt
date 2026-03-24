// Source: https://rpg.stackexchange.com/q/210220
module _qa_e1547d5bcecbbdf7 {
  import dnd.* from "./dnd"

  // Q&A: Can you hold Plane Shift on an unwilling creature until they touch you to skip the melee spell attack?
  // Melee spell attack roll cannot be skipped: nat 1 always misses even with high bonus vs low AC
  run qa_readied_melee_spell_nat1_always_misses = {
    val result = resolveAttackRoll(1, 10, 6, 0)
    assert(not(result.hits) and not(result.isCritical))
  }
  
  // Q&A: Can you hold Plane Shift on an unwilling creature until they touch you to skip the melee spell attack?
  // Readied spell = concentration; dragon bite damage forces a CON save or spell is lost
  run qa_readied_spell_concentration_breaks_on_failed_con_save = {
    val ss = FRESH_SPELL_SLOTS.with("concentrationSpellId", "plane_shift")
    val damageTaken = 20
    val dc = pConcentrationDC(damageTaken)  // max(10, 20/2) = 10
    // roll 4 + CON mod 2 + prof 3 = 9 < 10: save fails
    val saveSucceeded = saveSucceeds(4, 2, true, 3, 0, dc)
    val ss1 = pConcentrationCheck(ss, saveSucceeded)
    assert(dc == 10 and not(saveSucceeded) and not(isConcentrating(ss1)))
  }
  
  // Q&A: Can you hold Plane Shift on an unwilling creature until they touch you to skip the melee spell attack?
  // Concentration survives if CON save succeeds despite taking damage
  run qa_readied_spell_concentration_survives_on_passed_con_save = {
    val ss = FRESH_SPELL_SLOTS.with("concentrationSpellId", "plane_shift")
    val damageTaken = 20
    val dc = pConcentrationDC(damageTaken)  // 10
    // roll 14 + CON mod 2 + prof 3 = 19 >= 10: save succeeds
    val saveSucceeded = saveSucceeds(14, 2, true, 3, 0, dc)
    val ss1 = pConcentrationCheck(ss, saveSucceeded)
    assert(saveSucceeded and isConcentrating(ss1) and ss1.concentrationSpellId == "plane_shift")
  }
  
  // Q&A: Can you hold Plane Shift on an unwilling creature until they touch you to skip the melee spell attack?
  // DM may grant advantage (not skip the roll) as reward for creative play; prone target within 5ft grants advantage
  run qa_creative_play_dm_grants_advantage_not_autohit = {
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      attackerExhaustion: 0,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false,
      targetProne: true,
      attackerWithin5ft: true,
      targetDodging: false, targetCanSeeAttacker: true, attackerCanSeeTarget: true,
      isRangedAttack: false, beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      squeezing: false, underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleeException: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    // Advantage is possible, but there is no auto-hit: roll is still required
    assert(mods.hasAdvantage and not(mods.hasDisadvantage) and not(mods.autoMiss))
  }
}
