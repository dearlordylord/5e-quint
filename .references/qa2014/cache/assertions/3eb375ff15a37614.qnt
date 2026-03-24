// Source: https://rpg.stackexchange.com/q/213303
module _qa_3eb375ff15a37614 {
  import dnd.* from "./dnd"

  // Does innate sorcery apply to every attack from storm sphere?
  run qa_multiple_advantage_sources_still_single_advantage = {
    // Multiple adv sources (Innate Sorcery + target in sphere) don't stack; still just one advantage roll
    val resolved = resolveAdvantage({ hasAdvantage: true, hasDisadvantage: false })
    assert(resolved.hasAdvantage and not(resolved.hasDisadvantage))
  }
  
  // Does innate sorcery apply to every attack from storm sphere?
  run qa_advantage_disadvantage_cancel_regardless_of_source_count = {
    // Any adv + any disadv cancel (e.g. Innate Sorcery adv + hostile-within-5ft disadv on ranged)
    val resolved = resolveAdvantage({ hasAdvantage: true, hasDisadvantage: true })
    assert(not(resolved.hasAdvantage) and not(resolved.hasDisadvantage))
  }
  
  // Does innate sorcery apply to every attack from storm sphere?
  run qa_innate_sorcery_advantage_redundant_when_sphere_already_grants_advantage = {
    // Target in sphere already gives advantage; adding Innate Sorcery adv gives identical result
    val ctx_sphere_only: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      attackerExhaustion: 0,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false,
      targetRestrained: true,   // proxy for "target in sphere" → advantage
      targetProne: false,
      attackerWithin5ft: false,
      targetDodging: false, targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,
      isRangedAttack: true, beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      squeezing: false, underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleeException: false, isUnderwaterRangedException: false,
    }
    // Add a second advantage source (Innate Sorcery modeled as target also blinded)
    val ctx_both_adv = ctx_sphere_only.with("targetBlinded", true)
    val mods_sphere = pAggregateAttackMods(ctx_sphere_only)
    val mods_both   = pAggregateAttackMods(ctx_both_adv)
    // Both contexts yield the same attack modifier outcome: advantage, no disadvantage
    assert(
      mods_sphere.hasAdvantage and not(mods_sphere.hasDisadvantage) and
      mods_both.hasAdvantage   and not(mods_both.hasDisadvantage)   and
      mods_sphere.hasAdvantage == mods_both.hasAdvantage
    )
  }
}
