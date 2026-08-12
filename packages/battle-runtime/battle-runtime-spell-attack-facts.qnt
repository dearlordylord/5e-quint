// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SAVE_GATED_ATTACK_ROLL_ADVANTAGE
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.CHAINED_ATTACK_SEQUENCE
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-attack-roll-advantage-save

module battleRuntimeSpellAttackFacts {
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeSpellAttackBridge.* from "./battle-runtime-spell-attack-bridge"
  import battleRuntimeSpellIndependentSequenceBridge.* from "./battle-runtime-spell-independent-sequence-bridge"
  import battleRuntimeSpellLifecycleBridge.* from "./battle-runtime-spell-lifecycle-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSpellAttackRollAndVisibilityFacts.* from "./battle-runtime-spell-attack-roll-and-visibility-facts"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"
  import battleRuntimeDamageTypeAdjustment.* from "./battle-runtime-damage-type-adjustment"
  import battleRuntimeMarkedRiders.* from "./battle-runtime-marked-riders"
  import battleRuntimeAttackFacts.* from "./battle-runtime-attack-facts"
  import battleRuntimeHidden.* from "./battle-runtime-hidden"

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
}
