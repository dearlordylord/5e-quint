// -*- mode: Bluespec; -*-

module ruleCoreFeatureAttackRidersMbt {
  import ruleCoreComponentRoute.* from "./rule-core-component-route"
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  // Literal projection witness for QCORE9 rage, reckless-attack, and attack
  // rider feature families.

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

  action doRageActivateAndDamage = all {
    openHoles == Set(),
    recordProjection(
      false, false, true, 0, NoActionSurgeActionGrant, 12, 5, 0, false,
      false, true, false, false, false, 7, false,
      featureMbtBaselineArmorClass, Set(), false, WResolved
    ),
  }

  action doRecklessAttack = all {
    openHoles == Set(),
    recordProjection(
      false, true, true, 1, NoActionSurgeActionGrant, 12, 5, 0, false, false,
      false, true, true, false, 7, false, featureMbtBaselineArmorClass, Set(),
      false, WResolved
    ),
  }

  action doSneakAttack = all {
    openHoles == Set(),
    recordProjection(
      false, true, true, 1, NoActionSurgeActionGrant, 12, 2, 0,
      false, false, false, false, false, true, 1, false,
      featureMbtBaselineArmorClass, Set(), false, WResolved
    ),
  }

  action doFrenzy = all {
    openHoles == Set(),
    recordProjection(
      false, false, true, 0, NoActionSurgeActionGrant, 12, 7, 0,
      false, false, true, true, true, false, 2, false,
      featureMbtBaselineArmorClass, Set(), false, WResolved
    ),
  }

  action doImprovedCritical = all {
    openHoles == Set(),
    recordProjection(
      false, true, true, 1, NoActionSurgeActionGrant, 12, 4, 0,
      false, false, false, false, false, false, 8, true,
      featureMbtBaselineArmorClass, Set(), false, WResolved
    ),
  }

  action doSavageAttackerDamage = all {
    openHoles == Set(),
    recordProjection(
      false, true, true, 1, NoActionSurgeActionGrant, 12, 4, 0, false, false,
      false, false, false, false, 8, false, featureMbtBaselineArmorClass,
      Set(), false, WResolved
    ),
  }

  action doArcheryAttackRollBonus = all {
    openHoles == Set(),
    recordProjection(
      false, true, true, 1, NoActionSurgeActionGrant, 12, 12, 0, false, false,
      false, false, false, false, 2, false, 9, Set(), false, WResolved
    ),
  }

  action doCombatProwessMissToHit = all {
    openHoles == Set(),
    recordProjection(
      false, true, true, 0, NoActionSurgeActionGrant, 12, 8, 0, false, false,
      false, false, false, false, 4, false, featureMbtBaselineArmorClass,
      Set(), false, WResolved
    ),
  }

  action step = any {
    doRageActivateAndDamage,
    doRecklessAttack,
    doSneakAttack,
    doFrenzy,
    doImprovedCritical,
    doArcheryAttackRollBonus,
    doCombatProwessMissToHit,
    doSavageAttackerDamage,
  }
}
