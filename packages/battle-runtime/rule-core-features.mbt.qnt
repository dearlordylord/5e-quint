// -*- mode: Bluespec; -*-

module ruleCoreFeaturesMbt {
  import ruleCoreComponentRoute.* from "./rule-core-component-route"
  import actionTurnProcedures.* from "../shared-algebras/proofs/rule-core/action-turn-procedures"
  import attackDamageComposition.* from "../shared-algebras/proofs/rule-core/attack-damage-composition"
  import damageComponentAdjustments.* from "../shared-algebras/proofs/rule-core/damage-component-adjustments"
  import hitPointDamage.* from "../shared-algebras/proofs/rule-core/hit-point-damage"
  import hitPointRecovery.* from "../shared-algebras/proofs/rule-core/hit-point-recovery"
  import reactionsContinuationsConcentration.* from "../shared-algebras/proofs/rule-core/reactions-continuations-concentration"
  import unitFeaturePoolCostCore.* from "../shared-algebras/proofs/rule-core/unit-feature-pool-cost-core"
  import unitFeatureActionCountCore.* from "../shared-algebras/proofs/rule-core/unit-feature-action-count-core"
  import unitFeatureRageRecklessCore.* from "../shared-algebras/proofs/rule-core/unit-feature-rage-reckless-core"
  import unitFeatureAttackRiderCore.* from "../shared-algebras/proofs/rule-core/unit-feature-attack-rider-core"
  import unitFeatureSaveDamageCore.* from "../shared-algebras/proofs/rule-core/unit-feature-save-damage-core"
  import unitFeatureReactionReductionCore.* from "../shared-algebras/proofs/rule-core/unit-feature-reaction-reduction-core"
  import unitFeaturePassiveMovementDefenseCore.* from "../shared-algebras/proofs/rule-core/unit-feature-passive-movement-defense-core"
  import unitFeatureZeroHitPointCore.* from "../shared-algebras/proofs/rule-core/unit-feature-zero-hit-point-core"
  import zeroHitPointLifecycle.* from "../shared-algebras/proofs/rule-core/zero-hit-point-lifecycle"
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  // Fixture bounds:
  // - one acting character and one target unless the reaction fixture makes the
  //   target a feature reactor;
  // - feature pools are projected as scalar remaining uses;
  // - attacks use fixed hit/damage rolls; spell breadth is limited to one
  //   Dexterity half-damage cantrip fixture for Evasion-style replacement.

  var qActionAvailable: bool
  var qBonusActionAvailable: bool
  var qReactionAvailable: bool
  var qFeatureUsesRemaining: int
  var qActionSurgeGrant: ActionSurgeActionGrant
  var qActorHp: int
  var qTargetHp: int
  var qDashBonusFeet: int
  var qDisengaged: bool
  var qHidden: bool
  var qRageActive: bool
  var qRecklessActive: bool
  var qIncomingAttackAdvantage: bool
  var qSneakAttackUsedThisTurn: bool
  var qLastDamageAmount: int
  var qAbilityCheckBoostedTotal: int
  var qAbilityCheckBoostedSucceeded: bool
  var qActorArmorClass: int
  var qCritical: bool
  var qProtocol: WitnessProtocol[str]
  var qPendingReaction: bool
  var qComponentRoute: List[RuleCoreComponentRouteEvent]

  pure def openHoles: Set[str] = qProtocol.holes

  pure def componentRouteEvidence: List[RuleCoreComponentRouteEvent] =
    ruleCoreComponentRoute(RuleCoreFeatureProfileSemanticsOwner)

  pure def witnessProtocolForProjection(
    holes: Set[str],
    result: WitnessResult,
  ): WitnessProtocol[str] =
    witnessProtocolFromResult(holes, "DamageRoll", result)

  pure def qTurn: TurnProcedureState =
    initialTurnProcedureState
      .with("actionQuota", if (qActionAvailable) ActionAvailable else ActionSpent)
      .with("bonusActionAvailable", qBonusActionAvailable)
      .with("reactionAvailable", qReactionAvailable)
      .with("dashMovementBonusFeet", qDashBonusFeet)
      .with("disengaged", qDisengaged)
      .with("hidden", qHidden)

  pure def qFeaturePool: FeatureUsePool = {
    usesRemaining: qFeatureUsesRemaining,
    maximumUses: 1,
  }

  pure def qActionSurgeState: ActionSurgeState = {
    pool: qFeaturePool,
    actionGrant: qActionSurgeGrant,
  }

  pure def qRageState: RageState = {
    turn: qTurn,
    pool: qFeaturePool,
    occurrence: if (qRageActive) RageUntilEndOfNextTurn else NoRageOccurrence,
    concentration: { interruptedActor: NoConcentration, reactor: NoConcentration },
  }

  pure def qRecklessState: RecklessAttackState = {
    occurrence: if (qRecklessActive) RecklessAttackUntilStartOfTurn else NoRecklessAttackOccurrence,
    attackRollMadeThisTurn: qRecklessActive,
  }

  pure def featureMbtBaselineArmorClass: int = 10

  action recordBaseProjection(
    actionAvailable: bool,
    bonusActionAvailable: bool,
    reactionAvailable: bool,
    featureUsesRemaining: int,
    actionSurgeGrant: ActionSurgeActionGrant,
    actorHp: int,
    targetHp: int,
    dashBonusFeet: int,
    disengaged: bool,
    hidden: bool,
    rageActive: bool,
    recklessActive: bool,
    incomingAttackAdvantage: bool,
    sneakAttackUsedThisTurn: bool,
    lastDamageAmount: int,
    critical: bool,
    actorArmorClass: int,
    holes: Set[str],
    pendingReaction: bool,
    result: WitnessResult,
  ): bool = all {
    qActionAvailable' = actionAvailable,
    qBonusActionAvailable' = bonusActionAvailable,
    qReactionAvailable' = reactionAvailable,
    qFeatureUsesRemaining' = featureUsesRemaining,
    qActionSurgeGrant' = actionSurgeGrant,
    qActorHp' = actorHp,
    qTargetHp' = targetHp,
    qDashBonusFeet' = dashBonusFeet,
    qDisengaged' = disengaged,
    qHidden' = hidden,
    qRageActive' = rageActive,
    qRecklessActive' = recklessActive,
    qIncomingAttackAdvantage' = incomingAttackAdvantage,
    qSneakAttackUsedThisTurn' = sneakAttackUsedThisTurn,
    qLastDamageAmount' = lastDamageAmount,
    qCritical' = critical,
    qActorArmorClass' = actorArmorClass,
    qProtocol' = witnessProtocolForProjection(holes, result),
    qPendingReaction' = pendingReaction,
    qComponentRoute' = componentRouteEvidence,
  }

  action recordProjection(
    actionAvailable: bool,
    bonusActionAvailable: bool,
    reactionAvailable: bool,
    featureUsesRemaining: int,
    actionSurgeGrant: ActionSurgeActionGrant,
    actorHp: int,
    targetHp: int,
    dashBonusFeet: int,
    disengaged: bool,
    hidden: bool,
    rageActive: bool,
    recklessActive: bool,
    incomingAttackAdvantage: bool,
    sneakAttackUsedThisTurn: bool,
    lastDamageAmount: int,
    critical: bool,
    actorArmorClass: int,
    holes: Set[str],
    pendingReaction: bool,
    result: WitnessResult,
  ): bool = all {
    recordBaseProjection(
      actionAvailable, bonusActionAvailable, reactionAvailable,
      featureUsesRemaining, actionSurgeGrant, actorHp, targetHp,
      dashBonusFeet, disengaged, hidden, rageActive, recklessActive,
      incomingAttackAdvantage, sneakAttackUsedThisTurn, lastDamageAmount,
      critical, actorArmorClass, holes, pendingReaction, result
    ),
    qAbilityCheckBoostedTotal' = 0,
    qAbilityCheckBoostedSucceeded' = false,
  }

  action recordAbilityCheckBoostProjection(
    actionAvailable: bool,
    bonusActionAvailable: bool,
    reactionAvailable: bool,
    featureUsesRemaining: int,
    actionSurgeGrant: ActionSurgeActionGrant,
    actorHp: int,
    targetHp: int,
    dashBonusFeet: int,
    disengaged: bool,
    hidden: bool,
    rageActive: bool,
    recklessActive: bool,
    incomingAttackAdvantage: bool,
    sneakAttackUsedThisTurn: bool,
    lastDamageAmount: int,
    abilityCheckBoostedTotal: int,
    abilityCheckBoostedSucceeded: bool,
    critical: bool,
    actorArmorClass: int,
    holes: Set[str],
    pendingReaction: bool,
    result: WitnessResult,
  ): bool = all {
    recordBaseProjection(
      actionAvailable, bonusActionAvailable, reactionAvailable,
      featureUsesRemaining, actionSurgeGrant, actorHp, targetHp,
      dashBonusFeet, disengaged, hidden, rageActive, recklessActive,
      incomingAttackAdvantage, sneakAttackUsedThisTurn, lastDamageAmount,
      critical, actorArmorClass, holes, pendingReaction, result
    ),
    qAbilityCheckBoostedTotal' = abilityCheckBoostedTotal,
    qAbilityCheckBoostedSucceeded' = abilityCheckBoostedSucceeded,
  }

  action init = recordProjection(
    true, true, true, 1, NoActionSurgeActionGrant, 12, 12, 0, false, false,
    false, false, false, false, 0, false, featureMbtBaselineArmorClass, Set(), false, WInit
  )

  action doActionSurgeActivate = {
    val surged = activateActionSurge(initialActionSurgeState({ usesRemaining: 1, maximumUses: 1 }), true)
    all {
      openHoles == Set(),
      recordProjection(
        true, true, true, surged.pool.usesRemaining, surged.actionGrant,
        12, 12, 0, false, false, false, false, false, false, 0, false, featureMbtBaselineArmorClass, Set(), false, WResolved
      ),
    }
  }

  action doActionSurgeSpendAttack = {
    val spent = spendActionSurgeAction(qActionSurgeState, AttackAction)
    all {
      qActionSurgeGrant == ActionSurgeActionAvailable,
      openHoles == Set(),
      recordProjection(
        false, qBonusActionAvailable, qReactionAvailable,
        spent.actionSurge.pool.usesRemaining, spent.actionSurge.actionGrant,
        qActorHp, 5, qDashBonusFeet, qDisengaged, qHidden, qRageActive,
        qRecklessActive, qIncomingAttackAdvantage, qSneakAttackUsedThisTurn,
        7, false, featureMbtBaselineArmorClass, Set(), false, WResolved
      ),
    }
  }

  action doActionSurgeRejectTwice = all {
    qActionSurgeGrant == ActionSurgeActionAvailable,
    openHoles == Set(),
    recordProjection(
      qActionAvailable, qBonusActionAvailable, qReactionAvailable,
      qFeatureUsesRemaining, qActionSurgeGrant, qActorHp, qTargetHp,
      qDashBonusFeet, qDisengaged, qHidden, qRageActive, qRecklessActive,
      qIncomingAttackAdvantage, qSneakAttackUsedThisTurn, qLastDamageAmount,
      qCritical, qActorArmorClass, Set(), false, WInvalid(WStaleSubject)
    ),
  }

  action doDiscoverSecondWind = all {
    openHoles == Set(),
    recordProjection(
      true, true, true, 1, NoActionSurgeActionGrant, 4, 12, 0, false, false,
      false, false, false, false, 0, false, featureMbtBaselineArmorClass, Set("DamageRoll"), false,
      WNeedsHoles
    ),
  }

  action doResolveSecondWindLow = {
    val result = resolveSecondWind(
      initialTurnProcedureState,
      { usesRemaining: 1, maximumUses: 1 },
      {
        kind: PlayerCharacter,
        hitPoints: 4,
        hitPointMaximum: 12,
        temporaryHitPoints: 0,
        dead: false,
        unconscious: false,
      },
      resetDeathSavingThrowLifecycle,
      NoPositiveHitPointUnconsciousRecovery,
      { healingRoll: 1, fighterLevel: 2 }
    )
    all {
      openHoles == Set("DamageRoll"),
      recordProjection(
        true, result.turn.bonusActionAvailable, true, result.pool.usesRemaining,
        NoActionSurgeActionGrant, result.recovery.vitals.hitPoints, 12, 0,
        false, false, false, false, false, false,
        result.recovery.hitPointsRegained, false, featureMbtBaselineArmorClass, Set(), false, WResolved
      ),
    }
  }

  action doResolveSecondWindHigh = {
    val result = resolveSecondWind(
      initialTurnProcedureState,
      { usesRemaining: 1, maximumUses: 1 },
      {
        kind: PlayerCharacter,
        hitPoints: 4,
        hitPointMaximum: 12,
        temporaryHitPoints: 0,
        dead: false,
        unconscious: false,
      },
      resetDeathSavingThrowLifecycle,
      NoPositiveHitPointUnconsciousRecovery,
      { healingRoll: 8, fighterLevel: 2 }
    )
    all {
      openHoles == Set("DamageRoll"),
      recordProjection(
        true, result.turn.bonusActionAvailable, true, result.pool.usesRemaining,
        NoActionSurgeActionGrant, result.recovery.vitals.hitPoints, 12, 0,
        false, false, false, false, false, false,
        result.recovery.hitPointsRegained, false, featureMbtBaselineArmorClass, Set(), false, WResolved
      ),
    }
  }

  action doTacticalMindConvertedSuccess = {
    val result = resolveFailedAbilityCheckResourceBoost(
      { usesRemaining: 1, maximumUses: 1 },
      { originalTotal: 13, dc: 15, boostRoll: 3 }
    )
    all {
      openHoles == Set(),
      recordAbilityCheckBoostProjection(
        true, true, true, result.pool.usesRemaining, NoActionSurgeActionGrant,
        12, 12, 0, false, false, false, false, false, false, 0,
        result.boostedTotal, result.boostedSucceeded, false,
        featureMbtBaselineArmorClass, Set(), false, WResolved
      ),
    }
  }

  action doTacticalMindStillFailed = {
    val result = resolveFailedAbilityCheckResourceBoost(
      { usesRemaining: 1, maximumUses: 1 },
      { originalTotal: 10, dc: 15, boostRoll: 4 }
    )
    all {
      openHoles == Set(),
      recordAbilityCheckBoostProjection(
        true, true, true, result.pool.usesRemaining, NoActionSurgeActionGrant,
        12, 12, 0, false, false, false, false, false, false, 0,
        result.boostedTotal, result.boostedSucceeded, false,
        featureMbtBaselineArmorClass, Set(), false, WResolved
      ),
    }
  }

  action doCunningDash = {
    val turn = resolveCunningAction(initialTurnProcedureState, {
      choice: CunningDash,
      speedFeet: 30,
      hideFacts: { prerequisiteSatisfied: true, checkTotal: 16, dc: 15 },
    })
    all {
      openHoles == Set(),
      recordProjection(
        true, turn.bonusActionAvailable, true, 1, NoActionSurgeActionGrant,
        12, 12, turn.dashMovementBonusFeet, turn.disengaged, turn.hidden,
        false, false, false, false, 0, false, featureMbtBaselineArmorClass, Set(), false, WResolved
      ),
    }
  }

  action doCunningDisengage = {
    val turn = resolveCunningAction(initialTurnProcedureState, {
      choice: CunningDisengage,
      speedFeet: 30,
      hideFacts: { prerequisiteSatisfied: true, checkTotal: 16, dc: 15 },
    })
    all {
      openHoles == Set(),
      recordProjection(
        true, turn.bonusActionAvailable, true, 1, NoActionSurgeActionGrant,
        12, 12, turn.dashMovementBonusFeet, turn.disengaged, turn.hidden,
        false, false, false, false, 0, false, featureMbtBaselineArmorClass, Set(), false, WResolved
      ),
    }
  }

  action doCunningHide = {
    val turn = resolveCunningAction(initialTurnProcedureState, {
      choice: CunningHide,
      speedFeet: 30,
      hideFacts: { prerequisiteSatisfied: true, checkTotal: 16, dc: 15 },
    })
    all {
      openHoles == Set(),
      recordProjection(
        true, turn.bonusActionAvailable, true, 1, NoActionSurgeActionGrant,
        12, 12, turn.dashMovementBonusFeet, turn.disengaged, turn.hidden,
        false, false, false, false, 0, false, featureMbtBaselineArmorClass, Set(), false, WResolved
      ),
    }
  }

  action doMyceliumStepDash = {
    val turn = resolveDash(initialTurnProcedureState, 30, BonusActionCost)
    all {
      openHoles == Set(),
      recordProjection(
        true, turn.bonusActionAvailable, true, 1, NoActionSurgeActionGrant,
        12, 12, turn.dashMovementBonusFeet, turn.disengaged, turn.hidden,
        false, false, false, false, 0, false, featureMbtBaselineArmorClass, Set(), false, WResolved
      ),
    }
  }

  action doRageActivateAndDamage = {
    val rage = startRage({
      turn: initialTurnProcedureState.with("bonusActionAvailable", true),
      pool: { usesRemaining: 1, maximumUses: 1 },
      occurrence: NoRageOccurrence,
      concentration: { interruptedActor: NoConcentration, reactor: NoConcentration },
    }, { wearingHeavyArmor: false, incapacitated: false, persistentRage: false })
    val damage = applyRageDamageBonus(rage, {
      usesStrength: true,
      dealsDamage: true,
      attackForm: RageWeaponAttack,
    }, 9, 4)
    all {
      openHoles == Set(),
      recordProjection(
        false, rage.turn.bonusActionAvailable, true, rage.pool.usesRemaining,
        NoActionSurgeActionGrant, 12, 12 - damage, 0, false, false,
        rage.occurrence != NoRageOccurrence, false, false, false, damage,
        false, featureMbtBaselineArmorClass, Set(), false, WResolved
      ),
    }
  }

  action doRecklessAttack = {
    val reckless = activateRecklessAttackOnFirstAttackRoll(
      { occurrence: NoRecklessAttackOccurrence, attackRollMadeThisTurn: false },
      { choosesRecklessAttack: true, strengthAttackRoll: true }
    )
    all {
      openHoles == Set(),
      recordProjection(
        false, true, true, 1, NoActionSurgeActionGrant, 12, 5, 0, false, false,
        false, reckless.occurrence == RecklessAttackUntilStartOfTurn,
        recklessAttackGrantsIncomingAttackAdvantage(reckless), false, 7,
        false, featureMbtBaselineArmorClass, Set(), false, WResolved
      ),
    }
  }

  action doSneakAttack = {
    val result = resolveSneakAttack({
      hitWithAttackRoll: true,
      weaponKind: FinesseWeapon,
      hasAdvantage: true,
      hasDisadvantage: false,
      allyWithinFiveFeet: false,
      allyIncapacitated: false,
      usedThisTurn: false,
      rogueLevel: 1,
      weaponDamageType: SlashingDamage,
    })
    all {
      openHoles == Set(),
      recordProjection(
        false, true, true, 1, NoActionSurgeActionGrant, 12, 12 - 10, 0,
        false, false, false, false, false, result.usedThisTurn,
        result.damageDice, false, featureMbtBaselineArmorClass, Set(), false, WResolved
      ),
    }
  }

  action doFrenzy = {
    val result = resolveFrenzy(
      initialFrenzyState(
        qRageState.with("occurrence", RageUntilEndOfNextTurn),
        qRecklessState.with("occurrence", RecklessAttackUntilStartOfTurn),
        true
      ),
      {
        hitWithAttackRoll: true,
        strengthBasedAttack: true,
        attackForm: RageWeaponAttack,
        barbarianLevel: 3,
        attackDamageType: SlashingDamage,
      }
    )
    all {
      openHoles == Set(),
      recordProjection(
        false, false, true, 0, NoActionSurgeActionGrant, 12, 7, 0,
        false, false, true, true, true, false, result.damageDice, false,
        featureMbtBaselineArmorClass, Set(), false, WResolved
      ),
    }
  }

  action doImprovedCritical = {
    val outcome = resolveAttackRoll({
      naturalD20: 19,
      total: 19,
      armorClass: 30,
      criticalThreshold: attackCriticalThreshold(ChampionImprovedCriticalThresholdProfile({
        attackForm: ChampionWeaponAttack,
      })),
    })
    all {
      openHoles == Set(),
      recordProjection(
        false, true, true, 1, NoActionSurgeActionGrant, 12, 4, 0,
        false, false, false, false, false, false, 8, outcome.critical,
        featureMbtBaselineArmorClass, Set(), false, WResolved
      ),
    }
  }

  action doSavageAttackerDamage = {
    val result = resolveWeaponDamageDiceRollChoice({
      hitWithWeapon: true,
      criticalHit: false,
      usedThisTurn: false,
      choosesFeature: true,
      weaponDamageDice: 1,
      weaponDamageDieSize: 8,
      firstCandidateTotal: 2,
      secondCandidateTotal: 8,
      chooseSecondCandidate: true,
      damageModifier: 0,
    }, 2)
    all {
      openHoles == Set(),
      recordProjection(
        false, true, true, 1, NoActionSurgeActionGrant, 12,
        12 - result.effectiveDamage, 0, false, false, false, false, false,
        false, result.effectiveDamage, false, featureMbtBaselineArmorClass,
        Set(), false, WResolved
      ),
    }
  }

  action doZeroHitPointReplacement = {
    val result = resolveZeroHitPointReplacement(
      {
        kind: PlayerCharacter,
        hitPoints: 3,
        hitPointMaximum: 12,
        temporaryHitPoints: 0,
        dead: false,
        unconscious: false,
      },
      resetDeathSavingThrowLifecycle,
      { usesRemaining: 1, maximumUses: 1 },
      { incomingDamage: 4, choosesFeature: true }
    )
    all {
      openHoles == Set(),
      recordProjection(
        false, true, true, result.pool.usesRemaining, NoActionSurgeActionGrant, 12,
        result.vitals.hitPoints, 0, false, false, false, false, false,
        false, result.vitals.hitPoints, false,
        featureMbtBaselineArmorClass, Set(), false, WResolved
      ),
    }
  }

  action doEvasionSuccess = {
    val damage = saveDamageAfterSuccessToZeroFailureToHalfReplacement({
      savingThrowAbility: DexteritySavingThrowFact,
      normalSuccessfulSavingThrowDamage: HalfDamageOnSuccessfulSavingThrow,
      savingThrowSucceeded: true,
      incapacitated: false,
    }, 6)
    all {
      openHoles == Set(),
      recordProjection(
        false, true, true, 1, NoActionSurgeActionGrant, 12, 12, 0,
        false, false, false, false, false, false, damage, false, featureMbtBaselineArmorClass, Set(), false, WResolved
      ),
    }
  }

  action doEvasionFailure = {
    val damage = saveDamageAfterSuccessToZeroFailureToHalfReplacement({
      savingThrowAbility: DexteritySavingThrowFact,
      normalSuccessfulSavingThrowDamage: HalfDamageOnSuccessfulSavingThrow,
      savingThrowSucceeded: false,
      incapacitated: false,
    }, 6)
    all {
      openHoles == Set(),
      recordProjection(
        false, true, true, 1, NoActionSurgeActionGrant, 12 - damage, 12, 0,
        false, false, false, false, false, false, damage, false, featureMbtBaselineArmorClass, Set(), false, WResolved
      ),
    }
  }

  action doCuttingWordsDamage = {
    val reduced = resolveCuttingWordsDamageReaction(
      initialTurnProcedureState,
      { usesRemaining: 1, maximumUses: 1 },
      {
        trigger: { creatureSeen: true, creatureWithinSixtyFeet: true },
        damageRoll: 6,
        bardicDieRoll: 4,
      }
    )
    all {
      openHoles == Set(),
      recordProjection(
        false, true, reduced.turn.reactionAvailable, reduced.pool.usesRemaining,
        NoActionSurgeActionGrant, 12 - reduced.reducedAmount, 12, 0,
        false, false, false, false, false, false, reduced.reducedAmount,
        false, featureMbtBaselineArmorClass, Set(), false, WResolved
      ),
    }
  }

  action doDeflectAttacksDamageReduction = {
    val reduced = resolveDeflectAttacksReductionReaction(
      initialTurnProcedureState,
      {
        incomingDamage: 6,
        damageIncludesBludgeoningPiercingOrSlashing: true,
        deflectRoll: 1,
        dexterityModifier: 0,
        monkLevel: 3,
      }
    )
    all {
      openHoles == Set(),
      recordProjection(
        false, true, reduced.turn.reactionAvailable, 1,
        NoActionSurgeActionGrant, 12 - reduced.reducedAmount, 12, 0, false,
        false, false, false, false, false, reduced.reducedAmount, false,
        featureMbtBaselineArmorClass, Set(), false, WResolved
      ),
    }
  }

  action doUncannyDodge = {
    val reduced = resolveUncannyDodgeReaction(
      initialTurnProcedureState,
      { attackerSeen: true, hitWithAttackRoll: true, incomingDamage: 6 }
    )
    all {
      openHoles == Set(),
      recordProjection(
        false, true, reduced.turn.reactionAvailable, 1, NoActionSurgeActionGrant,
        12 - reduced.reducedAmount, 12, 0, false, false, false, false,
        false, false, reduced.reducedAmount, false, featureMbtBaselineArmorClass, Set(), false,
        WResolved
      ),
    }
  }

  action doDefenseArmorClass = {
    val armorClass = defenseArmorClass(16, {
      armorWorn: LightArmorWorn,
    })
    all {
      openHoles == Set(),
      recordProjection(
        true, true, true, 1, NoActionSurgeActionGrant, 12, 12, 0, false, false,
        false, false, false, false, 0, false, armorClass, Set(), false,
        WResolved
      ),
    }
  }

  action doArcheryAttackRollBonus = {
    val result = resolveArcheryAttackRoll({
      weaponKind: RangedWeapon,
      baseAttackRollTotal: 7,
      targetArmorClass: 10,
      naturalD20: 10,
    })
    all {
      openHoles == Set(),
      recordProjection(
        false, true, true, 1, NoActionSurgeActionGrant, 12, 12, 0, false, false,
        false, false, false, false, result.bonus, result.hits,
        result.effectiveAttackRollTotal, Set(), false, WResolved
      ),
    }
  }

  action doCombatProwessMissToHit = {
    val result = resolveAttackRollMissToHitReplacement({
      naturalD20: 2,
      total: 1,
      armorClass: 10,
      usedSinceTurnStart: false,
      choosesFeature: true,
    })
    all {
      openHoles == Set(),
      recordProjection(
        false, true, true, if (result.usedSinceTurnStart) 0 else 1,
        NoActionSurgeActionGrant, 12,
        if (result.effectiveHits) 8 else 12, 0, false, false, false, false,
        false, false, if (result.effectiveHits) 4 else 0, result.critical,
        featureMbtBaselineArmorClass, Set(), false, WResolved
      ),
    }
  }

  action step = any {
    doActionSurgeActivate,
    doActionSurgeSpendAttack,
    doActionSurgeRejectTwice,
    doDiscoverSecondWind,
    doResolveSecondWindLow,
    doResolveSecondWindHigh,
    doTacticalMindConvertedSuccess,
    doTacticalMindStillFailed,
    doCunningDash,
    doCunningDisengage,
    doCunningHide,
    doMyceliumStepDash,
    doRageActivateAndDamage,
    doRecklessAttack,
    doSneakAttack,
    doFrenzy,
    doImprovedCritical,
    doEvasionSuccess,
    doEvasionFailure,
    doCuttingWordsDamage,
    doDeflectAttacksDamageReduction,
    doUncannyDodge,
    doDefenseArmorClass,
    doArcheryAttackRollBonus,
    doCombatProwessMissToHit,
    doSavageAttackerDamage,
    doZeroHitPointReplacement,
  }
}
