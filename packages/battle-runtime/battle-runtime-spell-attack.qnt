// -*- mode: Bluespec; -*-

module battleRuntimeSpellAttack {
  import battleRuntimeSpellBridge.* from "./battle-runtime-spell-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeDamageAdjustments.* from "./battle-runtime-damage-adjustments"

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

  pure def battleRuntimeSpellAttackBeamSequenceProfileForInvocation(
    invocation: SpellAttackBeamSequenceInvocation
  ): BattleRuntimeSpellAttackBeamSequenceProfile =
    match invocation {
      | EldritchBlastBeamSequence => BattleRuntimeEldritchBlastBeamSequence
    }

  pure def spellAttackBeamSequenceDamageType(invocation: SpellAttackBeamSequenceInvocation): DamageType =
    damageTypeFromRuleDamageType(
      battleRuntimeSpellAttackBeamSequenceDamageType(
        battleRuntimeSpellAttackBeamSequenceProfileForInvocation(invocation),
      )
    )

  pure def eldritchBlastBeamCount(characterLevel: int): int =
    battleRuntimeSpellAttackBeamSequenceBeamCount(
      BattleRuntimeEldritchBlastBeamSequence,
      characterLevel,
    )

  pure def spellAttackBeamSequenceReplayHoles(
    invocation: SpellAttackBeamSequenceInvocation,
    canCastSpells: bool,
    beamCount: int,
    beamTargetsFilled: int,
    beamAttackRollsFilled: int,
    beamHits: int,
    beamDamageRollsFilled: int,
  ): Set[Hole] =
    match battleRuntimeSpellAttackBeamSequenceNextStep(
      battleRuntimeSpellAttackBeamSequenceProfileForInvocation(invocation),
      canCastSpells,
      beamCount,
      beamTargetsFilled,
      beamAttackRollsFilled,
      beamHits,
      beamDamageRollsFilled,
    ) {
      | BattleRuntimeBeamSequenceNeedsTargets => Set(TargetChoice, ObjectTargetChoice)
      | BattleRuntimeBeamSequenceNeedsAttackRoll => Set(AttackRoll)
      | BattleRuntimeBeamSequenceNeedsDamageRoll => Set(SpellDamageRoll)
      | _ => Set()
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

  pure def spellAttackBeamSequenceObjectDamageOutcome(
    invocation: SpellAttackBeamSequenceInvocation,
    object: ObjectTarget,
    damageRoll: int,
    disposition: ObjectDamageDisposition,
  ): ObjectDamageOutcome =
    match disposition {
      | ObjectTableResolved =>
          ObjectTableResolvedDamage({
            object: object,
            damageType: spellAttackBeamSequenceDamageType(invocation),
            rolledDamage: damageRoll,
          })
      | ObjectHitPoints(fill) =>
          objectHitPointDamageOutcome(
            object,
            spellAttackBeamSequenceDamageType(invocation),
            damageRoll,
            fill.hitPoints,
            0,
          )
      | ObjectHitPointsWithDamageThreshold(fill) =>
          objectHitPointDamageOutcome(
            object,
            spellAttackBeamSequenceDamageType(invocation),
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

  pure def spellAttackRollModeFromActiveEffects(
    attackerEffects: Set[ActiveEffect],
    targetEffects: Set[ActiveEffect],
    attackerCanSeeTarget: bool,
  ): SpellAttackRollMode =
    if ((attackerEffects.contains(ViciousMockeryNextAttackDisadvantage) or attackerEffects.exists(effect => match effect { | WeaponMasterySapNextAttackDisadvantage(_) => true | _ => false })) and (targetEffects.contains(GuidingBoltNextAttackAdvantage) or (attackerCanSeeTarget and targetEffects.contains(FaerieFireOutline))))
      NormalSpellAttackRoll
    else if (targetEffects.contains(GuidingBoltNextAttackAdvantage) or (attackerCanSeeTarget and targetEffects.contains(FaerieFireOutline)))
      AdvantageSpellAttackRoll
    else if (attackerEffects.contains(ViciousMockeryNextAttackDisadvantage) or attackerEffects.exists(effect => match effect { | WeaponMasterySapNextAttackDisadvantage(_) => true | _ => false }))
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
    if ((attackerEffects.contains(ViciousMockeryNextAttackDisadvantage) or attackerEffects.exists(effect => match effect { | WeaponMasterySapNextAttackDisadvantage(_) => true | _ => false })) and objectOutlinesGrantAttackRollAdvantage(objectOutlines, objectTarget, attackerCanSeeObject))
      NormalSpellAttackRoll
    else if (objectOutlinesGrantAttackRollAdvantage(objectOutlines, objectTarget, attackerCanSeeObject))
      AdvantageSpellAttackRoll
    else if (attackerEffects.contains(ViciousMockeryNextAttackDisadvantage) or attackerEffects.exists(effect => match effect { | WeaponMasterySapNextAttackDisadvantage(_) => true | _ => false }))
      DisadvantageSpellAttackRoll
    else
      NormalSpellAttackRoll

  pure def activeEffectsDenyInvisibleBenefit(effects: Set[ActiveEffect]): bool =
    effects.contains(FaerieFireOutline) or effects.exists(effect => match effect {
      | StarryWispInvisibleBenefitDenied(_) => true
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
}
