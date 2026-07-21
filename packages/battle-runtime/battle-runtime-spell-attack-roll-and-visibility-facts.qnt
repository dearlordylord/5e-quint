// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SAVE_GATED_ATTACK_ROLL_ADVANTAGE

module battleRuntimeSpellAttackRollAndVisibilityFacts {
  import battleRuntimeModel.* from "./battle-runtime-model"

  pure def activeEffectsGrantAttackRollAdvantage(
    targetEffects: Set[ActiveEffect],
    attackerCanSeeTarget: bool,
  ): bool =
    targetEffects.contains(GuidingBoltNextAttackAdvantage)
      or targetEffects.exists(effect => match effect {
        | ShiningSmiteIllumination(_) => true
        | _ => false
      })
      or (
        attackerCanSeeTarget
          and targetEffects.contains(FaerieFireOutline)
      )
  pure def spellAttackRollModeFromActiveEffects(
    attackerEffects: Set[ActiveEffect],
    targetEffects: Set[ActiveEffect],
    attackerCanSeeTarget: bool,
  ): SpellAttackRollMode =
    attackRollModeFromFlags(
      activeEffectsGrantAttackRollAdvantage(targetEffects, attackerCanSeeTarget),
      activeEffectsGrantAttackRollDisadvantage(attackerEffects),
    )
  pure def spellAttackRollModeFromBlurredActiveEffects(
    attackerEffects: Set[ActiveEffect],
    targetEffects: Set[ActiveEffect],
    attackerCanSeeTarget: bool,
    attackerPerceivesBlurredTargetWithBlindsightOrTruesight: bool,
  ): SpellAttackRollMode =
    attackRollModeFromFlags(
      activeEffectsGrantAttackRollAdvantage(targetEffects, attackerCanSeeTarget),
      activeEffectsGrantAttackRollDisadvantage(attackerEffects) or (
        targetEffects.contains(Blurred)
        and not(attackerPerceivesBlurredTargetWithBlindsightOrTruesight)
      ),
    )
  pure def activeEffectsGrantAttackRollDisadvantage(attackerEffects: Set[ActiveEffect]): bool =
    activeEffectsGrantSelfAttackRollDisadvantage(attackerEffects)
  pure def activeEffectsGrantSelfAttackRollDisadvantage(attackerEffects: Set[ActiveEffect]): bool =
    attackerEffects.contains(ViciousMockeryNextAttackDisadvantage)
    or attackerEffects.exists(effect => match effect {
      | RayOfEnfeeblementNextAttackDisadvantage(_) => true
      | WeaponMasterySapNextAttackDisadvantage(_) => true
      | HeatMetalHoldingWearingPenalty(_) => true
      | _ => false
    })
  pure def attackRollModeFromFlags(hasAdvantage: bool, hasDisadvantage: bool): SpellAttackRollMode =
    if (hasAdvantage and not(hasDisadvantage))
      AdvantageSpellAttackRoll
    else if (hasDisadvantage and not(hasAdvantage))
      DisadvantageSpellAttackRoll
    else
      NormalSpellAttackRoll
  pure def objectOutlinesGrantAttackRollAdvantage(
    outlines: Set[ObjectOutline],
    objectTarget: ObjectTarget,
    attackerCanSeeObject: bool,
  ): bool =
    attackerCanSeeObject and outlines.exists(outline => match outline {
      | FaerieFireObjectOutline(data) => data.object == objectTarget
    })
  pure def spellObjectAttackRollModeFromActiveEffects(
    attackerEffects: Set[ActiveEffect],
    objectOutlines: Set[ObjectOutline],
    objectTarget: ObjectTarget,
    attackerCanSeeObject: bool,
  ): SpellAttackRollMode =
    if (activeEffectsGrantSelfAttackRollDisadvantage(attackerEffects) and objectOutlinesGrantAttackRollAdvantage(objectOutlines, objectTarget, attackerCanSeeObject))
      NormalSpellAttackRoll
    else if (objectOutlinesGrantAttackRollAdvantage(objectOutlines, objectTarget, attackerCanSeeObject))
      AdvantageSpellAttackRoll
    else if (activeEffectsGrantSelfAttackRollDisadvantage(attackerEffects))
      DisadvantageSpellAttackRoll
    else
      NormalSpellAttackRoll
  pure def activeEffectsDenyInvisibleBenefit(effects: Set[ActiveEffect]): bool =
    effects.contains(FaerieFireOutline) or effects.exists(effect => match effect {
      | StarryWispInvisibleBenefitDenied(_) => true
      | ShiningSmiteIllumination(_) => true
      | _ => false
    })
  pure def objectOutlinesDenyInvisibleBenefit(outlines: Set[ObjectOutline], objectTarget: ObjectTarget): bool =
    outlines.exists(outline => match outline {
      | FaerieFireObjectOutline(data) => data.object == objectTarget
    })
  pure def objectLightEmitterDeniesInvisibleBenefit(emitter: LightEmitter, objectTarget: ObjectTarget): bool =
    match emitter {
      | SpellLightEmitter(_) => false
      | ObjectInvisibleRevealLightEmitter(data) => data.object == objectTarget
    }
  pure def objectInvisibleBenefitDenied(state: BattleState, objectTarget: ObjectTarget): bool =
    objectOutlinesDenyInvisibleBenefit(state.objectOutlines, objectTarget)
    or state.lightEmitters.exists(emitter =>
      objectLightEmitterDeniesInvisibleBenefit(emitter, objectTarget)
    )
}
