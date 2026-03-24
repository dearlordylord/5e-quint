// Source: https://rpg.stackexchange.com/q/53937
module _qa_09a3cd414af07b2e {
  import dnd.* from "./dnd"

  // How is throwing distance computed in 5e? — improvised thrown weapon has normal range 20 ft, long range 60 ft (PHB 148)
  run qa_improvised_thrown_weapon_range_values = {
    val impWeapon: Weapon = {
      name: "oil flask",
      damageDie: 4,
      versatileDie: 0,
      damageType: Fire,
      properties: Set(Thrown),
      isMelee: false,
      normalRange: 20,
      longRange: 60,
    }
    assert(impWeapon.normalRange == 20 and impWeapon.longRange == 60)
  }
  
  // How is throwing distance computed in 5e? — beyond normal range (>20 ft, up to 60 ft) imposes disadvantage on the ranged attack roll (PHB 148)
  run qa_improvised_thrown_beyond_normal_range_gives_disadvantage = {
    val baseCtx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      attackerExhaustion: 0,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false, targetProne: false,
      attackerWithin5ft: false,
      targetDodging: false, targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,
      isRangedAttack: true,
      beyondNormalRange: false,
      hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      squeezing: false, underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleeException: false, isUnderwaterRangedException: false,
    }
    val modsWithin = pAggregateAttackMods(baseCtx)
    val modsLong   = pAggregateAttackMods(baseCtx.with("beyondNormalRange", true))
    assert(
      not(modsWithin.hasDisadvantage) and
      not(modsWithin.hasAdvantage) and
      modsLong.hasDisadvantage
    )
  }
}
