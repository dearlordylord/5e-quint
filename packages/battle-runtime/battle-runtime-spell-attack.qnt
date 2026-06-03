// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.CHAINED_ATTACK_SEQUENCE BATTLE.SPELL.INDEPENDENT_ATTACK_SEQUENCE BATTLE.SPELL.SAVE_GATED_ATTACK_ROLL_ADVANTAGE BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_D20_LIFECYCLE
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-independent-attack-sequence

// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-ray-of-enfeeblement-d20-lifecycle

module battleRuntimeSpellAttack {
  import battleRuntimeSpellBridge.* from "./battle-runtime-spell-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeArmorClass.* from "./battle-runtime-armor-class"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeDamageAdjustments.* from "./battle-runtime-damage-adjustments"
  import battleRuntimeMarkedRiders.* from "./battle-runtime-marked-riders"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeAttackFacts.* from "./battle-runtime-attack-facts"
  import battleRuntimeHidden.* from "./battle-runtime-hidden"
  import battleRuntimeMirrorImage.* from "./battle-runtime-mirror-image"

  pure def battleRuntimeSpellAttackDamageProfileForInvocation(
    invocation: FixedSpellAttackDamageInvocation
  ): BattleRuntimeSpellAttackDamageProfile =
    match invocation {
      | RayOfFrostFixedSpellAttack => BattleRuntimeRayOfFrostSpellAttack
      | PoisonSprayFixedSpellAttack => BattleRuntimePoisonSpraySpellAttack
      | ChillTouchFixedSpellAttack => BattleRuntimeChillTouchSpellAttack
      | StarryWispFixedSpellAttack => BattleRuntimeStarryWispSpellAttack
      | FireBoltFixedSpellAttack => BattleRuntimeFireBoltSpellAttack
      | ShockingGraspFixedSpellAttack => BattleRuntimeShockingGraspSpellAttack
      | GuidingBoltFixedSpellAttack => BattleRuntimeGuidingBoltSpellAttack
      | RayOfSicknessFixedSpellAttack => BattleRuntimeRayOfSicknessSpellAttack
      | ProduceFlameHurlFixedSpellAttack => BattleRuntimeProduceFlameHurlSpellAttack
    }

  pure def spellAttackDamageType(invocation: SpellAttackDamageInvocation): DamageType =
    match invocation {
      | RayOfFrostSpellAttack => Cold
      | PoisonSpraySpellAttack => Poison
      | ChillTouchSpellAttack => Necrotic
      | StarryWispSpellAttack => Radiant
      | FireBoltSpellAttack => Fire
      | ShockingGraspSpellAttack => Lightning
      | GuidingBoltSpellAttack => Radiant
      | RayOfSicknessSpellAttack => Poison
      | ProduceFlameHurlSpellAttack => Fire
      | SorcerousBurstSpellAttack(fill) =>
          damageTypeFromRuleDamageType(
            battleRuntimeSorcerousBurstDamageType(fill.damageTypeChoice)
          )
    }

  pure def spellAttackDamageActiveEffectForHitEffect(
    effect: BattleRuntimeSpellAttackDamageHitEffect
  ): ActiveEffect =
    match effect {
      | BattleRuntimeRayOfFrostSpeedReductionHitEffect => RayOfFrostSpeedDelta
      | BattleRuntimeChillTouchHitPointRegainPreventionHitEffect => ChillTouchHitPointRegainPrevented({ source: Fighter, expiresAtRound: 0 })
      | BattleRuntimeStarryWispInvisibleBenefitDeniedHitEffect => StarryWispInvisibleBenefitDenied({ source: Fighter, expiresAtRound: 0 })
      | BattleRuntimeShockingGraspOpportunityAttackDeniedHitEffect => ShockingGraspOpportunityAttackDenied
      | BattleRuntimeGuidingBoltNextAttackAdvantageHitEffect => GuidingBoltNextAttackAdvantage
      | BattleRuntimeRayOfSicknessPoisonedHitEffect => RayOfSicknessPoisoned
    }

  pure def spellAttackDamageActiveEffects(invocation: SpellAttackDamageInvocation): Set[ActiveEffect] =
    match invocation {
      | RayOfFrostSpellAttack => Set(RayOfFrostSpeedDelta)
      | PoisonSpraySpellAttack => Set()
      | ChillTouchSpellAttack => Set(ChillTouchHitPointRegainPrevented({ source: Fighter, expiresAtRound: 0 }))
      | StarryWispSpellAttack => Set(StarryWispInvisibleBenefitDenied({ source: Fighter, expiresAtRound: 0 }))
      | FireBoltSpellAttack => Set()
      | ShockingGraspSpellAttack => Set(ShockingGraspOpportunityAttackDenied)
      | GuidingBoltSpellAttack => Set(GuidingBoltNextAttackAdvantage)
      | RayOfSicknessSpellAttack => Set(RayOfSicknessPoisoned)
      | ProduceFlameHurlSpellAttack => Set()
      | SorcerousBurstSpellAttack(_) => Set()
    }

  pure def spellAttackDamageSupportsObjectTarget(invocation: SpellAttackDamageInvocation): bool =
    match invocation {
      | RayOfFrostSpellAttack => false
      | PoisonSpraySpellAttack => false
      | ChillTouchSpellAttack => true
      | StarryWispSpellAttack => true
      | FireBoltSpellAttack => true
      | ShockingGraspSpellAttack => false
      | GuidingBoltSpellAttack => false
      | RayOfSicknessSpellAttack => false
      | ProduceFlameHurlSpellAttack => true
      | SorcerousBurstSpellAttack(_) => true
    }

  pure def battleRuntimeSpellAttackSequenceProfileForInvocation(
    invocation: SpellAttackSequenceInvocation
  ): BattleRuntimeSpellAttackSequenceProfile =
    match invocation {
      | EldritchBlastBeamSequence => BattleRuntimeEldritchBlastBeamSequence
      | ScorchingRaySequence => BattleRuntimeScorchingRaySequence
    }

  pure def spellAttackSequenceDamageType(invocation: SpellAttackSequenceInvocation): DamageType =
    damageTypeFromRuleDamageType(
      battleRuntimeSpellAttackSequenceDamageType(
        battleRuntimeSpellAttackSequenceProfileForInvocation(invocation),
      )
    )

  pure def eldritchBlastBeamCount(characterLevel: int): int =
    battleRuntimeSpellAttackSequenceAttackCount(
      BattleRuntimeEldritchBlastBeamSequence,
      characterLevel,
    )

  pure def scorchingRayRayCount(slotLevel: int): int =
    battleRuntimeSpellAttackSequenceAttackCount(
      BattleRuntimeScorchingRaySequence,
      slotLevel,
    )

  pure def spellAttackSequenceReplayHoles(
    invocation: SpellAttackSequenceInvocation,
    canCastSpells: bool,
    attackCount: int,
    targetsFilled: int,
    attackRollsFilled: int,
    hits: int,
    damageRollsFilled: int,
  ): Set[Hole] = {
    val profile = battleRuntimeSpellAttackSequenceProfileForInvocation(invocation)
    match battleRuntimeSpellAttackSequenceNextStep(
      profile,
      canCastSpells,
      attackCount,
      targetsFilled,
      attackRollsFilled,
      hits,
      damageRollsFilled,
    ) {
      | BattleRuntimeSpellAttackSequenceNeedsTargets =>
          if (battleRuntimeSpellAttackSequenceSupportsObjectTargets(profile))
            Set(TargetChoice, ObjectTargetChoice)
          else
            Set(TargetChoice)
      | BattleRuntimeSpellAttackSequenceNeedsAttackRoll => Set(AttackRoll)
      | BattleRuntimeSpellAttackSequenceNeedsDamageRoll => Set(SpellDamageRoll)
      | _ => Set()
    }
  }

  pure def objectHitPointDamageOutcome(
    object: ObjectTarget,
    damageType: DamageType,
    rolledDamage: int,
    priorHitPoints: int,
    damageThreshold: int,
  ): ObjectDamageOutcome = {
    val result = battleRuntimeObjectHitPointDamageResult(
      ruleDamageType(damageType),
      rolledDamage,
      priorHitPoints,
      damageThreshold,
    )

    ObjectHitPointDamage({
      object: object,
      damageType: damageType,
      rolledDamage: rolledDamage,
      effectiveDamage: result.effectiveDamage,
      priorHitPoints: result.priorHitPoints,
      nextHitPoints: result.nextHitPoints,
      destroyed: result.destroyed,
    })
  }

  pure def spellObjectDamageOutcome(
    invocation: SpellAttackDamageInvocation,
    object: ObjectTarget,
    damageRoll: int,
    disposition: ObjectDamageDisposition,
  ): ObjectDamageOutcome =
    match disposition {
      | ObjectTableResolved =>
          ObjectTableResolvedDamage({
            object: object,
            damageType: spellAttackDamageType(invocation),
            rolledDamage: damageRoll,
          })
      | ObjectHitPoints(fill) =>
          objectHitPointDamageOutcome(
            object,
            spellAttackDamageType(invocation),
            damageRoll,
            fill.hitPoints,
            0,
          )
      | ObjectHitPointsWithDamageThreshold(fill) =>
          objectHitPointDamageOutcome(
            object,
            spellAttackDamageType(invocation),
            damageRoll,
            fill.hitPoints,
            fill.damageThreshold,
          )
    }

  pure def spellAttackDamageSpellInvocation(invocation: SpellAttackDamageInvocation): SpellInvocation =
    match invocation {
      | RayOfFrostSpellAttack => RayOfFrost
      | PoisonSpraySpellAttack => PoisonSpray
      | ChillTouchSpellAttack => ChillTouch
      | StarryWispSpellAttack => StarryWisp
      | FireBoltSpellAttack => FireBolt
      | ShockingGraspSpellAttack => ShockingGrasp
      | GuidingBoltSpellAttack => GuidingBolt
      | RayOfSicknessSpellAttack => RayOfSickness
      | ProduceFlameHurlSpellAttack => ProduceFlame
      | SorcerousBurstSpellAttack(_) => SorcerousBurst
    }

  pure def spellObjectIgnitionOutcomes(
    invocation: SpellAttackDamageInvocation,
    object: ObjectTarget,
    source: Actor,
    disposition: ObjectIgnitionDisposition,
  ): Set[ObjectIgnitionOutcome] =
    if (invocation == FireBoltSpellAttack and disposition == ObjectFlammableUnattended)
      Set(ObjectStartsBurning({
        object: object,
        source: source,
        sourceSpell: spellAttackDamageSpellInvocation(invocation),
      }))
    else
      Set()

  pure def spellAttackSequenceObjectDamageOutcome(
    invocation: SpellAttackSequenceInvocation,
    object: ObjectTarget,
    damageRoll: int,
    disposition: ObjectDamageDisposition,
  ): ObjectDamageOutcome =
    match disposition {
      | ObjectTableResolved =>
          ObjectTableResolvedDamage({
            object: object,
            damageType: spellAttackSequenceDamageType(invocation),
            rolledDamage: damageRoll,
          })
      | ObjectHitPoints(fill) =>
          objectHitPointDamageOutcome(
            object,
            spellAttackSequenceDamageType(invocation),
            damageRoll,
            fill.hitPoints,
            0,
          )
      | ObjectHitPointsWithDamageThreshold(fill) =>
          objectHitPointDamageOutcome(
            object,
            spellAttackSequenceDamageType(invocation),
            damageRoll,
            fill.hitPoints,
            fill.damageThreshold,
          )
    }

  pure def spellAttackDamageObjectReplayHoles(
    invocation: SpellAttackDamageInvocation,
    canCastSpells: bool,
    objectTargetFilled: bool,
    attackRollFilled: bool,
    attackHitsObject: bool,
    damageRollFilled: bool,
  ): Set[Hole] =
    if (not(canCastSpells) or not(spellAttackDamageSupportsObjectTarget(invocation)))
      Set()
    else if (not(objectTargetFilled))
      Set(ObjectTargetChoice)
    else if (not(attackRollFilled))
      Set(AttackRoll)
    else if (attackHitsObject and not(damageRollFilled))
      Set(SpellDamageRoll)
    else
      Set()

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

  pure def rayOfFrostSpeedEffectActive(
    hit: bool,
    currentActor: Actor,
    caster: Actor,
  ): bool =
    hit and currentActor != caster

  pure def fighterSpellAttackMirrorImageRedirects(
    state: BattleState,
    mirrorImageDuplicateHighestRoll: int,
    attackerPerceivesTargetWithBlindsightOrTruesight: bool,
  ): bool =
    mirrorImageRedirectsAttackRollHit(
      state.fighter.activeEffects,
      state.goblin.activeEffects,
      attackerPerceivesTargetWithBlindsightOrTruesight,
      mirrorImageDuplicateHighestRoll,
    )

  pure def recordFighterSpellAttackMirrorImageDuplicateHit(
    state: BattleState,
    mirrorImageDuplicateHighestRoll: int,
    attackerPerceivesTargetWithBlindsightOrTruesight: bool,
  ): BattleState = {
    val rolled = recordFighterAttackRoll(revealFighterHidden(state))
    {
      ...rolled,
      goblin: combatantAfterMirrorImageAttackRollHit(
        rolled.fighter.activeEffects,
        rolled.goblin,
        attackerPerceivesTargetWithBlindsightOrTruesight,
        mirrorImageDuplicateHighestRoll,
      ),
      actionAvailable: false,
    }
  }

  pure def resolveRayOfFrost(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    resolveRayOfFrostWithMirrorImageDuplicateRoll(state, attackTotal, naturalD20, damageRoll, concentrationSaveSucceeded, 0, false)

  pure def resolveRayOfFrostWithMirrorImageDuplicateRoll(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
    mirrorImageDuplicateHighestRoll: int,
    attackerPerceivesTargetWithBlindsightOrTruesight: bool,
  ): BattleState =
    resolveRayOfFrostWithDamageRollAndMirrorImageDuplicateRoll(
      state,
      attackTotal,
      naturalD20,
      fighterSpellAttackDamageRoll(damageRoll),
      concentrationSaveSucceeded,
      mirrorImageDuplicateHighestRoll,
      attackerPerceivesTargetWithBlindsightOrTruesight,
    )

  pure def resolveRayOfFrostWithDamageRoll(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: FighterSpellAttackDamageRoll,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    resolveRayOfFrostWithDamageRollAndMirrorImageDuplicateRoll(
      state,
      attackTotal,
      naturalD20,
      damageRoll,
      concentrationSaveSucceeded,
      0,
      false,
    )

  pure def resolveRayOfFrostWithDamageRollAndMirrorImageDuplicateRoll(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: FighterSpellAttackDamageRoll,
    concentrationSaveSucceeded: bool,
    mirrorImageDuplicateHighestRoll: int,
    attackerPerceivesTargetWithBlindsightOrTruesight: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state))
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), 20))) {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      { ...rolled, actionAvailable: false }
    }
    else if (fighterSpellAttackMirrorImageRedirects(state, mirrorImageDuplicateHighestRoll, attackerPerceivesTargetWithBlindsightOrTruesight))
      recordFighterSpellAttackMirrorImageDuplicateHit(state, mirrorImageDuplicateHighestRoll, attackerPerceivesTargetWithBlindsightOrTruesight)
    else if (state.goblin.reactionAvailable and not(state.goblin.activeEffects.contains(ShieldArmorClassBonus))) {
      openReactionWindow(recordFighterAttackRoll(revealFighterHidden(state)), {
        trigger: AttackHit,
        procedure: ShieldReactionProcedure,
        eligibleReactors: Set(Goblin),
        offeredReactors: Set(),
        continuation: ResumeRayOfFrost,
      })
    }
    else {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      val huntersMarkDamage = fighterHuntersMarkDamage(damageRoll.huntersMarkDamageRoll, rolled.fighter.activeEffects, Goblin)
      val damaged = applyDamageFromSource(state.goblin, damageRoll.spellDamageRoll + huntersMarkDamage, if (attackIsCritical(naturalD20, 20)) 2 else 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter)
      { ...rolled, goblin: { ...damaged, activeEffects: damaged.activeEffects.union(Set(RayOfFrostSpeedDelta)) }, actionAvailable: false }
    }

  pure def resolvePoisonSpray(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    resolvePoisonSprayWithMirrorImageDuplicateRoll(
      state,
      attackTotal,
      naturalD20,
      damageRoll,
      concentrationSaveSucceeded,
      0,
      false,
    )

  pure def resolvePoisonSprayWithMirrorImageDuplicateRoll(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
    mirrorImageDuplicateHighestRoll: int,
    attackerPerceivesTargetWithBlindsightOrTruesight: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state))
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), 20))) {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      { ...rolled, actionAvailable: false }
    }
    else if (fighterSpellAttackMirrorImageRedirects(state, mirrorImageDuplicateHighestRoll, attackerPerceivesTargetWithBlindsightOrTruesight))
      recordFighterSpellAttackMirrorImageDuplicateHit(state, mirrorImageDuplicateHighestRoll, attackerPerceivesTargetWithBlindsightOrTruesight)
    else if (state.goblin.reactionAvailable and not(state.goblin.activeEffects.contains(ShieldArmorClassBonus))) {
      openReactionWindow(recordFighterAttackRoll(revealFighterHidden(state)), {
        trigger: AttackHit,
        procedure: ShieldReactionProcedure,
        eligibleReactors: Set(Goblin),
        offeredReactors: Set(),
        continuation: ResumePoisonSpray,
      })
    }
    else {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      val adjustedDamage = damageAfterAdjustments(damageRoll, Poison, Set(), Set(), Set())
      val damaged = applyDamageFromSource(state.goblin, adjustedDamage, if (attackIsCritical(naturalD20, 20)) 2 else 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter)
      { ...rolled, goblin: damaged, actionAvailable: false }
    }

  pure def resolveChillTouch(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    resolveChillTouchWithMirrorImageDuplicateRoll(
      state,
      attackTotal,
      naturalD20,
      damageRoll,
      concentrationSaveSucceeded,
      0,
      false,
    )

  pure def resolveChillTouchWithMirrorImageDuplicateRoll(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
    mirrorImageDuplicateHighestRoll: int,
    attackerPerceivesTargetWithBlindsightOrTruesight: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state))
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), 20))) {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      { ...rolled, actionAvailable: false }
    }
    else if (fighterSpellAttackMirrorImageRedirects(state, mirrorImageDuplicateHighestRoll, attackerPerceivesTargetWithBlindsightOrTruesight))
      recordFighterSpellAttackMirrorImageDuplicateHit(state, mirrorImageDuplicateHighestRoll, attackerPerceivesTargetWithBlindsightOrTruesight)
    else if (state.goblin.reactionAvailable and not(state.goblin.activeEffects.contains(ShieldArmorClassBonus))) {
      openReactionWindow(recordFighterAttackRoll(revealFighterHidden(state)), {
        trigger: AttackHit,
        procedure: ShieldReactionProcedure,
        eligibleReactors: Set(Goblin),
        offeredReactors: Set(),
        continuation: ResumeChillTouch,
      })
    }
    else {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      val adjustedDamage = damageAfterAdjustments(damageRoll, Necrotic, Set(), Set(), Set())
      val damaged = applyDamageFromSource(state.goblin, adjustedDamage, if (attackIsCritical(naturalD20, 20)) 2 else 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter)
      { ...rolled, goblin: applyChillTouchHitPointRegainPrevention(state, damaged, Fighter), actionAvailable: false }
    }

  pure def starryWispDimLightEmitter(
    state: BattleState,
    source: Actor,
    attachment: LightEmitterAttachment,
  ): LightEmitter =
    match attachment {
      | CombatantLightEmitter(_) => SpellLightEmitter({
          source: source,
          sourceSpell: StarryWisp,
          attachment: attachment,
          emission: DimLightEmission({ radiusFeet: 10 }),
          opaqueCoverInteraction: LightEmitterDoesNotBlockOpaqueCover,
          ongoingSpellTracking: UntrackedSpellLightEmitter,
          expiresAt: EndOfTurnLightEmitterExpiration({
            actor: source,
            round: endOfCasterNextTurnExpiresAtRound(state, source),
          }),
        })
      | ObjectLightEmitter(data) => ObjectInvisibleRevealLightEmitter({
          source: source,
          sourceSpell: StarryWisp,
          object: data.object,
          dimLightRadiusFeet: 10,
          expiresAtActor: source,
          expiresAtRound: endOfCasterNextTurnExpiresAtRound(state, source),
        })
      | DancingLightEmitter(_) => SpellLightEmitter({
          source: source,
          sourceSpell: DancingLightsSpell,
          attachment: attachment,
          emission: DimLightEmission({ radiusFeet: 10 }),
          opaqueCoverInteraction: LightEmitterDoesNotBlockOpaqueCover,
          ongoingSpellTracking: UntrackedSpellLightEmitter,
          expiresAt: ConcentrationLightEmitterExpiration({ actor: source }),
        })
    }

  pure def applyStarryWispDimLightEmitter(
    state: BattleState,
    source: Actor,
    attachment: LightEmitterAttachment,
  ): BattleState = {
    val emitter = starryWispDimLightEmitter(state, source, attachment)
    { ...state,
      lightEmitters: state.lightEmitters
        .filter(candidate => match candidate {
          | SpellLightEmitter(data) =>
              data.source != source
                or data.sourceSpell != StarryWisp
                or data.attachment != attachment
          | ObjectInvisibleRevealLightEmitter(data) =>
              data.source != source
                or data.sourceSpell != StarryWisp
                or match attachment {
                  | CombatantLightEmitter(_) => true
                  | ObjectLightEmitter(objectAttachment) => data.object != objectAttachment.object
                  | DancingLightEmitter(_) => true
                }
        })
        .union(Set(emitter)),
    }
  }

  pure def applyChillTouchHitPointRegainPrevention(state: BattleState, target: Combatant, source: Actor): Combatant =
    { ...target,
      activeEffects: target.activeEffects
        .filter(effect => match effect {
          | ChillTouchHitPointRegainPrevented(data) => data.source != source
          | _ => true
        })
        .union(Set(ChillTouchHitPointRegainPrevented({
          source: source,
          expiresAtRound: endOfCasterNextTurnExpiresAtRound(state, source),
        }))),
    }

  pure def applyStarryWispInvisibleBenefitDenied(state: BattleState, target: Combatant, source: Actor): Combatant =
    { ...target,
      activeEffects: target.activeEffects
        .filter(effect => match effect {
          | StarryWispInvisibleBenefitDenied(data) => data.source != source
          | _ => true
        })
        .union(Set(StarryWispInvisibleBenefitDenied({
          source: source,
          expiresAtRound: endOfCasterNextTurnExpiresAtRound(state, source),
        }))),
    }

  pure def resolveEldritchBlastBeamAgainstGoblin(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    resolveEldritchBlastBeamAgainstGoblinWithMirrorImageDuplicateRoll(
      state,
      attackTotal,
      naturalD20,
      damageRoll,
      concentrationSaveSucceeded,
      0,
      false,
    )

  pure def resolveEldritchBlastBeamAgainstGoblinWithMirrorImageDuplicateRoll(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
    mirrorImageDuplicateHighestRoll: int,
    attackerPerceivesTargetWithBlindsightOrTruesight: bool,
  ): BattleState =
    if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), 20)))
      recordFighterAttackRoll(state)
    else if (
      mirrorImageRedirectsAttackRollHit(
        state.fighter.activeEffects,
        state.goblin.activeEffects,
        attackerPerceivesTargetWithBlindsightOrTruesight,
        mirrorImageDuplicateHighestRoll,
      )
    )
      {
        ...recordFighterAttackRoll(state),
        goblin: combatantAfterMirrorImageAttackRollHit(
          state.fighter.activeEffects,
          state.goblin,
          attackerPerceivesTargetWithBlindsightOrTruesight,
          mirrorImageDuplicateHighestRoll,
        ),
      }
    else {
      val adjustedDamage = damageAfterAdjustments(damageRoll, Force, Set(), Set(), Set())
      val damaged = applyDamageFromSource(state.goblin, adjustedDamage, if (attackIsCritical(naturalD20, 20)) 2 else 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter)
      { ...recordFighterAttackRoll(state), goblin: damaged }
    }

  pure def resolveEldritchBlastTwoBeams(
    state: BattleState,
    firstAttackTotal: int,
    firstNaturalD20: int,
    firstDamageRoll: int,
    firstConcentrationSaveSucceeded: bool,
    secondAttackTotal: int,
    secondNaturalD20: int,
    secondDamageRoll: int,
    secondConcentrationSaveSucceeded: bool,
  ): BattleState =
    resolveEldritchBlastTwoBeamsWithMirrorImageDuplicateRolls(
      state,
      firstAttackTotal,
      firstNaturalD20,
      firstDamageRoll,
      firstConcentrationSaveSucceeded,
      0,
      false,
      secondAttackTotal,
      secondNaturalD20,
      secondDamageRoll,
      secondConcentrationSaveSucceeded,
      0,
      false,
    )

  pure def resolveEldritchBlastTwoBeamsWithMirrorImageDuplicateRolls(
    state: BattleState,
    firstAttackTotal: int,
    firstNaturalD20: int,
    firstDamageRoll: int,
    firstConcentrationSaveSucceeded: bool,
    firstMirrorImageDuplicateHighestRoll: int,
    firstAttackerPerceivesTargetWithBlindsightOrTruesight: bool,
    secondAttackTotal: int,
    secondNaturalD20: int,
    secondDamageRoll: int,
    secondConcentrationSaveSucceeded: bool,
    secondMirrorImageDuplicateHighestRoll: int,
    secondAttackerPerceivesTargetWithBlindsightOrTruesight: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state))
      state
    else {
      val firstResolved = resolveEldritchBlastBeamAgainstGoblinWithMirrorImageDuplicateRoll(
        revealFighterHidden(state),
        firstAttackTotal,
        firstNaturalD20,
        firstDamageRoll,
        firstConcentrationSaveSucceeded,
        firstMirrorImageDuplicateHighestRoll,
        firstAttackerPerceivesTargetWithBlindsightOrTruesight,
      )
      val secondResolved = resolveEldritchBlastBeamAgainstGoblinWithMirrorImageDuplicateRoll(
        firstResolved,
        secondAttackTotal,
        secondNaturalD20,
        secondDamageRoll,
        secondConcentrationSaveSucceeded,
        secondMirrorImageDuplicateHighestRoll,
        secondAttackerPerceivesTargetWithBlindsightOrTruesight,
      )
      { ...secondResolved, actionAvailable: false }
    }

}
