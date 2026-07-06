// -*- mode: Bluespec; -*-

module ruleCoreFeatureSaveReactionsMbt {
  import ruleCoreComponentRoute.* from "./rule-core-component-route"
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  // Literal projection witness for QCORE9 save-damage replacement and
  // reaction damage-reduction feature families.

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
    qAbilityCheckBoostedTotal' = 0,
    qAbilityCheckBoostedSucceeded' = false,
    qCritical' = critical,
    qActorArmorClass' = actorArmorClass,
    qProtocol' = witnessProtocolForProjection(holes, result),
    qPendingReaction' = pendingReaction,
    qComponentRoute' = componentRouteEvidence,
  }

  action init = recordProjection(
    true, true, true, 1, NoActionSurgeActionGrant, 12, 12, 0, false, false,
    false, false, false, false, 0, false, featureMbtBaselineArmorClass, Set(), false, WInit
  )

  action doEvasionSuccess = all {
    openHoles == Set(),
    recordProjection(
      false, true, true, 1, NoActionSurgeActionGrant, 12, 12, 0,
      false, false, false, false, false, false, 0, false,
      featureMbtBaselineArmorClass, Set(), false, WResolved
    ),
  }

  action doEvasionFailure = all {
    openHoles == Set(),
    recordProjection(
      false, true, true, 1, NoActionSurgeActionGrant, 9, 12, 0,
      false, false, false, false, false, false, 3, false,
      featureMbtBaselineArmorClass, Set(), false, WResolved
    ),
  }

  action doCuttingWordsDamage = all {
    openHoles == Set(),
    recordProjection(
      false, true, false, 0, NoActionSurgeActionGrant, 10, 12, 0,
      false, false, false, false, false, false, 2, false,
      featureMbtBaselineArmorClass, Set(), false, WResolved
    ),
  }

  action doDeflectAttacksDamageReduction = all {
    openHoles == Set(),
    recordProjection(
      false, true, false, 1, NoActionSurgeActionGrant, 10, 12, 0, false,
      false, false, false, false, false, 2, false,
      featureMbtBaselineArmorClass, Set(), false, WResolved
    ),
  }

  action doUncannyDodge = all {
    openHoles == Set(),
    recordProjection(
      false, true, false, 1, NoActionSurgeActionGrant,
      9, 12, 0, false, false, false, false, false, false, 3, false,
      featureMbtBaselineArmorClass, Set(), false, WResolved
    ),
  }

  action step = any {
    doEvasionSuccess,
    doEvasionFailure,
    doCuttingWordsDamage,
    doDeflectAttacksDamageReduction,
    doUncannyDodge,
  }
}
