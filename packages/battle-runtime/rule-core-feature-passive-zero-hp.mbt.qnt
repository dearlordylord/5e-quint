// -*- mode: Bluespec; -*-

module ruleCoreFeaturePassiveZeroHpMbt {
  import ruleCoreComponentRoute.* from "./rule-core-component-route"
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  // Literal projection witness for QCORE9 passive Armor Class and zero-Hit-Point
  // replacement feature families.

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

  action doDefenseArmorClass = all {
    openHoles == Set(),
    recordProjection(
      true, true, true, 1, NoActionSurgeActionGrant, 12, 12, 0, false, false,
      false, false, false, false, 0, false, 17, Set(), false, WResolved
    ),
  }

  action doZeroHitPointReplacement = all {
    openHoles == Set(),
    recordProjection(
      false, true, true, 0, NoActionSurgeActionGrant, 12, 1, 0, false, false,
      false, false, false, false, 1, false, featureMbtBaselineArmorClass,
      Set(), false, WResolved
    ),
  }

  action step = any {
    doDefenseArmorClass,
    doZeroHitPointReplacement,
  }
}
