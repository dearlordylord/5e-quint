// Source: https://rpg.stackexchange.com/q/78596
module _qa_279d6fd9dca1f971 {
  import dnd.* from "./dnd"

  // Do characters provoke opportunity attack when they leave another character's reach who is not facing them?
  run qa_oa_no_facing_rules = {
    // Atone moves away without Disengage → Dip can make OA regardless of facing;
    // 5e has no facing rules, reach is 360 degrees for all creatures
    val atone_turn = FRESH_TURN.with("disengaged", false)
    assert(pCanBeOpportunityAttacked(atone_turn))
  }
  
  // OA roll itself carries no facing-based penalty since 5e has no facing mechanic
  run qa_oa_no_facing_attack_mods = {
    // Dip attacks Atone who was "behind" him — AttackContext has no facing field;
    // attackerCanSeeTarget: true because there are no facing restrictions by default
    val ctx: AttackContext = {
      attackerBlinded: false,
      attackerProne: false,
      attackerRestrained: false,
      attackerPoisoned: false,
      attackerFrightened: false,
      attackerFrightSourceInLOS: false,
      attackerExhaustion: 0,
      targetBlinded: false,
      targetParalyzed: false,
      targetPetrified: false,
      targetStunned: false,
      targetUnconscious: false,
      targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false,
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,
      isRangedAttack: false,
      beyondNormalRange: false,
      hostileWithin5ft: false,
      isHeavyWeapon: false,
      wielderSizeSmallOrTiny: false,
      squeezing: false,
      underwater: false,
      attackerHasSwimSpeed: false,
      isUnderwaterMeleeException: false,
      isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    // No advantage, no disadvantage, no auto-miss: facing confers nothing
    assert(not(mods.hasAdvantage) and not(mods.hasDisadvantage) and not(mods.autoMiss))
  }
  
  // Disengage action is the only way to suppress the OA — not facing away
  run qa_oa_disengage_suppresses_not_facing = {
    // If Atone had taken Disengage, no OA regardless of any facing consideration
    val atone_disengaged = FRESH_TURN.with("disengaged", true)
    val atone_not_disengaged = FRESH_TURN.with("disengaged", false)
    assert(
      not(pCanBeOpportunityAttacked(atone_disengaged))
      and pCanBeOpportunityAttacked(atone_not_disengaged)
    )
  }
}
