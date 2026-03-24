// Source: https://rpg.stackexchange.com/q/185578
module _qa_63bce441325f26cb {
  import dnd.* from "./dnd"

  // Tale of the Renowned Duelist: melee spell attack uses feature's 30 ft range, not caster's 5 ft reach
  run qa_tale_renowned_duelist_range = {
    // Clean attacker/target state: no conditions, no special modifiers
    val ctxAt5ft: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      attackerExhaustion: 0,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false, targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false, targetCanSeeAttacker: true, attackerCanSeeTarget: true,
      isRangedAttack: false, // melee spell attack — not classified as ranged
      beyondNormalRange: false,
      hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false, squeezing: false,
      underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleeException: false, isUnderwaterRangedException: false,
    }
    // Same attack but attacker is 30 ft away (outside normal 5 ft melee reach)
    val ctxAt30ft = ctxAt5ft.with("attackerWithin5ft", false)
    val modsAt5ft  = pAggregateAttackMods(ctxAt5ft)
    val modsAt30ft = pAggregateAttackMods(ctxAt30ft)
    // isRangedAttack=false => disadv_rangedBeyondNormal and disadv_rangedCloseQuarters never fire,
    // so being outside 5 ft reach adds no disadvantage — the feature's 30 ft range governs validity
    assert(
      not(modsAt30ft.hasDisadvantage) and
      not(modsAt30ft.autoMiss)        and
      modsAt5ft == modsAt30ft         // identical resolution at 5 ft vs 30 ft within feature range
    )
  }
}
