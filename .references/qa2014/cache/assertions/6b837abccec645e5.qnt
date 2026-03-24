// Source: https://rpg.stackexchange.com/q/213482
module _qa_6b837abccec645e5 {
  import dnd.* from "./dnd"

  // What happens when you hide from a creature with Truesight? - heavy obscurement imposes Blinded, blocking sight-based checks
  run qa_truesight_blinded_auto_fails_sight_check = {
    // A Truesight creature blocked by a solid obstacle (heavily obscured target) is
    // effectively Blinded against that creature and auto-fails all sight-required checks.
    val viewer = pApplyCondition(freshCreature(20), CBlinded)
    val mods = pCheckModifiers(viewer, true, false, false) // requiresSight=true
    assert(mods.autoFail)
  }
  
  // What happens when you hide from a creature with Truesight? - Invisible creature behind cover retains condition benefits even vs Truesight
  run qa_truesight_invisible_behind_cover_no_adv = {
    // Truesight creature (attacker) is Blinded by heavy obscurement (rock between them)
    // and cannot see through the obstacle to the invisible/hidden creature (target).
    // The target also cannot see the attacker through the rock.
    // Result: the "unseen attacker" advantage cancels with "blinded attacker" disadvantage
    // → no advantage for Truesight; invisible creature retains its condition's protection.
    val ctx: AttackContext = {
      attackerBlinded: true,             // heavy obscurement = Blinded against that creature
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
      targetCanSeeAttacker: false,       // hidden creature can't see Truesight creature through rock
      attackerCanSeeTarget: false,       // Truesight can't see through solid obstacle
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
    // adv_unseenAttacker (target can't see attacker) + disadv_attackerBlinded + disadv_cantSeeTarget
    // → advantage and disadvantage both present → resolveAdvantage cancels to neither
    // Truesight grants NO advantage against the invisible creature behind cover.
    assert(not(mods.hasAdvantage) and not(mods.hasDisadvantage))
  }
}
