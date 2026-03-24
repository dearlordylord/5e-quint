// Source: https://rpg.stackexchange.com/q/119759
module _qa_f38a1d6cda0e7aeb {
  import dnd.* from "./dnd"

  // Can I ready an action to roll away from an attack or special attack?
  run qa_dodge_gives_disadvantage_ready_does_not = {
    val creature = freshCreature(20)
    // ADodge sets the dodging flag; AReady sets readiedAction but NOT dodging
    val tDodge = pUseAction(FRESH_TURN, creature, ADodge)
    val tReady = pUseAction(FRESH_TURN, creature, AReady)
    // Baseline attack context: no other modifiers, attacker visible to target
    val baseCtx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      attackerExhaustion: 0,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false,
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,
      isRangedAttack: false, beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      squeezing: false, underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleeException: false, isUnderwaterRangedException: false,
    }
    val modsDodge = pAggregateAttackMods(baseCtx.with("targetDodging", tDodge.dodging))
    val modsReady = pAggregateAttackMods(baseCtx.with("targetDodging", tReady.dodging))
    assert(
      // Dodge action activates the dodging flag — this is the correct evasion mechanic
      tDodge.dodging
      // Ready action does NOT activate dodging — readied reaction fires after trigger finishes,
      // so it cannot prevent the incoming attack from resolving
      and not(tReady.dodging)
      // Dodge → attack rolls against you have disadvantage (attacker visible to you)
      and modsDodge.hasDisadvantage
      // Ready → no such benefit; the attack already resolved before the reaction fires
      and not(modsReady.hasDisadvantage)
    )
  }
}
