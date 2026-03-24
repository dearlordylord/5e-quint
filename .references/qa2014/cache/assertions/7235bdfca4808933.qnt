// Source: https://rpg.stackexchange.com/q/149159
module _qa_7235bdfca4808933 {
  import dnd.* from "./dnd"

  // Are there side effects from popping in and out into the Ethereal Plane for an extended time period?
  // Accepted answer: no mechanical side effects listed; Blink/ethereal only interacts via visibility rules.
  
  // Applying invisible (Blink/ethereal proxy) changes only that flag — no HP loss, no exhaustion, no extra conditions
  run qa_ethereal_invisible_no_side_effects = {
    val s = freshCreature(20)
    val s1 = pApplyCondition(s, CInvisible)
    assert(
      s1.invisible == true
      and s1.hp == s.hp
      and s1.exhaustion == s.exhaustion
      and s1.blinded == false
      and s1.prone == false
      and s1.poisoned == false
      and s1.stunned == false
      and s1.incapacitatedSources == Set()
    )
  }
  
  // Toggling in and out of ethereal (apply + remove invisible) leaves creature state identical to before
  run qa_ethereal_toggle_leaves_no_trace = {
    val s = freshCreature(20)
    val s1 = pApplyCondition(s, CInvisible)
    val s2 = pRemoveCondition(s1, CInvisible)
    assert(s2 == s)
  }
  
  // Ethereal (Blink) attacker is unseen by material target → attacker gets advantage, no disadvantage
  run qa_ethereal_blink_attacker_advantage = {
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
      targetCanSeeAttacker: false,  // material plane target cannot see ethereal attacker
      attackerCanSeeTarget: true,   // ethereal attacker can see material plane target
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
    assert(mods.hasAdvantage == true and mods.hasDisadvantage == false)
  }
  
  // Material plane attacker cannot see ethereal (Blink) target → attacker gets disadvantage, no advantage
  run qa_ethereal_material_attacker_disadvantage = {
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
      targetCanSeeAttacker: true,   // ethereal target can see material attacker
      attackerCanSeeTarget: false,  // material attacker cannot see ethereal target
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
    assert(mods.hasAdvantage == false and mods.hasDisadvantage == true)
  }
  
  // See Invisibility / True Sight lets material attacker see ethereal target → no visibility-based adv or disadv
  run qa_ethereal_see_invisibility_removes_penalty = {
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
      targetCanSeeAttacker: true,  // ethereal target can see material attacker
      attackerCanSeeTarget: true,  // see invisibility / true sight grants sight of ethereal creature
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
    assert(mods.hasAdvantage == false and mods.hasDisadvantage == false)
  }
}
