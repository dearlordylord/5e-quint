// Source: https://rpg.stackexchange.com/q/146993
module _qa_3c7795e5530ee528 {
  import dnd.* from "./dnd"

  // Does the Arcane Archer's Curving Shot require sight of the second target?
  // Accepted answer: no rule blocks attacking an unseen target; attacking unseen grants disadvantage but is not an auto-miss.
  run qa_unseen_target_attack_has_disadvantage_not_auto_miss = {
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
      attackerWithin5ft: false,
      targetDodging: false,
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: false,   // attacker cannot see the second target
      isRangedAttack: true,
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
    // PHB p.194: unseen target → disadvantage, but attack is not automatically impossible
    assert(mods.hasDisadvantage and not(mods.autoMiss))
  }
  
  // Does the Arcane Archer's Curving Shot require sight of the second target?
  // Accepted answer: only total cover (not lack of sight) prevents a creature from being targeted.
  run qa_unseen_target_targetability_depends_only_on_cover = {
    // canBeTargeted has no sight parameter — sight is not a targeting gate, only TotalCover is
    assert(
      canBeTargeted(NoCover)
      and canBeTargeted(HalfCover)
      and canBeTargeted(ThreeQuartersCover)
      and not(canBeTargeted(TotalCover))
    )
  }
}
