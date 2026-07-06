// -*- mode: Bluespec; -*-

module ruleCoreFeatureActionEconomyMbt {
  import ruleCoreComponentRoute.* from "./rule-core-component-route"
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  // Literal projection witness for QCORE9 feature action economy:
  // Action Surge, Second Wind, Tactical Mind, Cunning Action, and a synthetic
  // bonus-action Dash feature.

  type ActionSurgeActionGrant =
    | NoActionSurgeActionGrant
    | ActionSurgeActionAvailable
    | ActionSurgeActionSpent

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

  action doActionSurgeActivate = all {
    openHoles == Set(),
    recordProjection(
      true, true, true, 0, ActionSurgeActionAvailable,
      12, 12, 0, false, false, false, false, false, false, 0, false,
      featureMbtBaselineArmorClass, Set(), false, WResolved
    ),
  }

  action doActionSurgeSpendAttack = all {
    qActionSurgeGrant == ActionSurgeActionAvailable,
    openHoles == Set(),
    recordProjection(
      false, qBonusActionAvailable, qReactionAvailable,
      0, ActionSurgeActionSpent, qActorHp, 5, qDashBonusFeet, qDisengaged,
      qHidden, qRageActive, qRecklessActive, qIncomingAttackAdvantage,
      qSneakAttackUsedThisTurn, 7, false, featureMbtBaselineArmorClass, Set(),
      false, WResolved
    ),
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

  action doResolveSecondWindLow = all {
    openHoles == Set("DamageRoll"),
    recordProjection(
      true, false, true, 0, NoActionSurgeActionGrant, 7, 12, 0,
      false, false, false, false, false, false, 3, false,
      featureMbtBaselineArmorClass, Set(), false, WResolved
    ),
  }

  action doResolveSecondWindHigh = all {
    openHoles == Set("DamageRoll"),
    recordProjection(
      true, false, true, 0, NoActionSurgeActionGrant, 12, 12, 0,
      false, false, false, false, false, false, 8, false,
      featureMbtBaselineArmorClass, Set(), false, WResolved
    ),
  }

  action doTacticalMindConvertedSuccess = all {
    openHoles == Set(),
    recordAbilityCheckBoostProjection(
      true, true, true, 0, NoActionSurgeActionGrant,
      12, 12, 0, false, false, false, false, false, false, 0,
      16, true, false, featureMbtBaselineArmorClass, Set(), false, WResolved
    ),
  }

  action doTacticalMindStillFailed = all {
    openHoles == Set(),
    recordAbilityCheckBoostProjection(
      true, true, true, 1, NoActionSurgeActionGrant,
      12, 12, 0, false, false, false, false, false, false, 0,
      14, false, false, featureMbtBaselineArmorClass, Set(), false, WResolved
    ),
  }

  action doCunningDash = all {
    openHoles == Set(),
    recordProjection(
      true, false, true, 1, NoActionSurgeActionGrant,
      12, 12, 30, false, false, false, false, false, false, 0, false,
      featureMbtBaselineArmorClass, Set(), false, WResolved
    ),
  }

  action doCunningDisengage = all {
    openHoles == Set(),
    recordProjection(
      true, false, true, 1, NoActionSurgeActionGrant,
      12, 12, 0, true, false, false, false, false, false, 0, false,
      featureMbtBaselineArmorClass, Set(), false, WResolved
    ),
  }

  action doCunningHide = all {
    openHoles == Set(),
    recordProjection(
      true, false, true, 1, NoActionSurgeActionGrant,
      12, 12, 0, false, true, false, false, false, false, 0, false,
      featureMbtBaselineArmorClass, Set(), false, WResolved
    ),
  }

  action doMyceliumStepDash = all {
    openHoles == Set(),
    recordProjection(
      true, false, true, 1, NoActionSurgeActionGrant,
      12, 12, 30, false, false, false, false, false, false, 0, false,
      featureMbtBaselineArmorClass, Set(), false, WResolved
    ),
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
  }
}
