// Source: https://rpg.stackexchange.com/q/69812
module _qa_ac2d61b10a15ff9b {
  import dnd.* from "./dnd"

  // Hidden attacker gets advantage on attack rolls (target cannot see the attacker)
  run qa_hidden_attacker_gets_advantage = {
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
          targetCanSeeAttacker: false,
          attackerCanSeeTarget: true,
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
      assert(mods.hasAdvantage and not(mods.hasDisadvantage))
  }
  
  // Hidden rogue with a hostile monster adjacent: ranged-in-melee disadvantage cancels hidden advantage
  run qa_hidden_attacker_hostile_adjacent_cancels_advantage = {
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
          targetCanSeeAttacker: false,
          attackerCanSeeTarget: true,
          isRangedAttack: true,
          beyondNormalRange: false,
          hostileWithin5ft: true,
          isHeavyWeapon: false,
          wielderSizeSmallOrTiny: false,
          squeezing: false,
          underwater: false,
          attackerHasSwimSpeed: false,
          isUnderwaterMeleeException: false,
          isUnderwaterRangedException: false,
      }
      val mods = pAggregateAttackMods(ctx)
      assert(not(mods.hasAdvantage) and not(mods.hasDisadvantage))
  }
  
  // After attacking the rogue is revealed (target can now see attacker): no advantage on follow-up
  run qa_revealed_attacker_loses_advantage = {
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
          attackerCanSeeTarget: true,
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
      assert(not(mods.hasAdvantage) and not(mods.hasDisadvantage))
  }
}
