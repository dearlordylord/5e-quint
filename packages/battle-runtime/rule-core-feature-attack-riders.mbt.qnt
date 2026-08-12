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

  type FrenzyDamageTypeSelectionProjection =
    | FrenzySelectionNotObserved
    | FrenzyAutomatic(str)
    | FrenzyDecisionRequired({
        first: str,
        second: str,
        rest: List[str],
      })
    | FrenzySelected(str)
    | FrenzyRejected

  type FeatureProjection = {
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
    frenzyDamageTypeSelection: FrenzyDamageTypeSelectionProjection,
  }

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
  var qFrenzyDamageTypeSelection: FrenzyDamageTypeSelectionProjection
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

  pure def baselineProjection: FeatureProjection = {
    actionAvailable: true,
    bonusActionAvailable: true,
    reactionAvailable: true,
    featureUsesRemaining: 1,
    actionSurgeGrant: NoActionSurgeActionGrant,
    actorHp: 12,
    targetHp: 12,
    dashBonusFeet: 0,
    disengaged: false,
    hidden: false,
    rageActive: false,
    recklessActive: false,
    incomingAttackAdvantage: false,
    sneakAttackUsedThisTurn: false,
    lastDamageAmount: 0,
    critical: false,
    actorArmorClass: featureMbtBaselineArmorClass,
    holes: Set(),
    pendingReaction: false,
    result: WInit,
    frenzyDamageTypeSelection: FrenzySelectionNotObserved,
  }

  action recordProjection(projection: FeatureProjection): bool = all {
    qActionAvailable' = projection.actionAvailable,
    qBonusActionAvailable' = projection.bonusActionAvailable,
    qReactionAvailable' = projection.reactionAvailable,
    qFeatureUsesRemaining' = projection.featureUsesRemaining,
    qActionSurgeGrant' = projection.actionSurgeGrant,
    qActorHp' = projection.actorHp,
    qTargetHp' = projection.targetHp,
    qDashBonusFeet' = projection.dashBonusFeet,
    qDisengaged' = projection.disengaged,
    qHidden' = projection.hidden,
    qRageActive' = projection.rageActive,
    qRecklessActive' = projection.recklessActive,
    qIncomingAttackAdvantage' = projection.incomingAttackAdvantage,
    qSneakAttackUsedThisTurn' = projection.sneakAttackUsedThisTurn,
    qLastDamageAmount' = projection.lastDamageAmount,
    qAbilityCheckBoostedTotal' = 0,
    qAbilityCheckBoostedSucceeded' = false,
    qCritical' = projection.critical,
    qActorArmorClass' = projection.actorArmorClass,
    qFrenzyDamageTypeSelection' = projection.frenzyDamageTypeSelection,
    qProtocol' = witnessProtocolForProjection(projection.holes, projection.result),
    qPendingReaction' = projection.pendingReaction,
    qComponentRoute' = componentRouteEvidence,
  }

  action init = recordProjection(baselineProjection)

  action doRageActivateAndDamage = all {
    openHoles == Set(),
    recordProjection({
      ...baselineProjection,
      actionAvailable: false,
      bonusActionAvailable: false,
      featureUsesRemaining: 0,
      targetHp: 5,
      rageActive: true,
      lastDamageAmount: 7,
      result: WResolved,
    }),
  }

  action doRecklessAttack = all {
    openHoles == Set(),
    recordProjection({
      ...baselineProjection,
      actionAvailable: false,
      targetHp: 5,
      recklessActive: true,
      incomingAttackAdvantage: true,
      lastDamageAmount: 7,
      result: WResolved,
    }),
  }

  action doSneakAttack = all {
    openHoles == Set(),
    recordProjection({
      ...baselineProjection,
      actionAvailable: false,
      targetHp: 2,
      sneakAttackUsedThisTurn: true,
      lastDamageAmount: 1,
      result: WResolved,
    }),
  }

  action doFrenzy = all {
    openHoles == Set(),
    recordProjection({
      ...baselineProjection,
      actionAvailable: false,
      bonusActionAvailable: false,
      featureUsesRemaining: 0,
      targetHp: 7,
      rageActive: true,
      recklessActive: true,
      incomingAttackAdvantage: true,
      lastDamageAmount: 2,
      result: WResolved,
      frenzyDamageTypeSelection: FrenzyAutomatic("slashing"),
    }),
  }

  action doImprovedCritical = all {
    openHoles == Set(),
    recordProjection({
      ...baselineProjection,
      actionAvailable: false,
      targetHp: 4,
      lastDamageAmount: 8,
      critical: true,
      result: WResolved,
    }),
  }

  action doSavageAttackerDamage = all {
    openHoles == Set(),
    recordProjection({
      ...baselineProjection,
      actionAvailable: false,
      targetHp: 4,
      lastDamageAmount: 8,
      result: WResolved,
    }),
  }

  action doArcheryAttackRollBonus = all {
    openHoles == Set(),
    recordProjection({
      ...baselineProjection,
      actionAvailable: false,
      lastDamageAmount: 2,
      actorArmorClass: 9,
      result: WResolved,
    }),
  }

  action doCombatProwessMissToHit = all {
    openHoles == Set(),
    recordProjection({
      ...baselineProjection,
      actionAvailable: false,
      featureUsesRemaining: 0,
      targetHp: 8,
      lastDamageAmount: 4,
      result: WResolved,
    }),
  }

  action doFrenzyMixedDecisionRequired = recordProjection({
    ...baselineProjection,
    result: WResolved,
    frenzyDamageTypeSelection: FrenzyDecisionRequired({
      first: "piercing",
      second: "fire",
      rest: [],
    }),
  })

  action doFrenzyDuplicateTypesAutomatic = recordProjection({
    ...baselineProjection,
    result: WResolved,
    frenzyDamageTypeSelection: FrenzyAutomatic("piercing"),
  })

  action doFrenzyMixedSelectPiercing = recordProjection({
    ...baselineProjection,
    result: WResolved,
    frenzyDamageTypeSelection: FrenzySelected("piercing"),
  })

  action doFrenzyMixedSelectFire = recordProjection({
    ...baselineProjection,
    result: WResolved,
    frenzyDamageTypeSelection: FrenzySelected("fire"),
  })

  action doFrenzyMixedRejectOutsideType = recordProjection({
    ...baselineProjection,
    result: WResolved,
    frenzyDamageTypeSelection: FrenzyRejected,
  })

  action stepFrenzyDamageTypeChoice =
    match qFrenzyDamageTypeSelection {
      | FrenzySelectionNotObserved =>
          any { doFrenzyDuplicateTypesAutomatic, }
      | FrenzyDecisionRequired(_) =>
          any { doFrenzyMixedSelectPiercing, }
      | FrenzySelected(damageType) =>
          if (damageType == "piercing")
          any { doFrenzyMixedSelectFire, }
          else
          any { doFrenzyMixedRejectOutsideType, }
      | FrenzyAutomatic(_) =>
          any { doFrenzyMixedDecisionRequired, }
      | FrenzyRejected =>
          any { doFrenzyMixedDecisionRequired, }
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
    doFrenzyDuplicateTypesAutomatic,
    doFrenzyMixedDecisionRequired,
    doFrenzyMixedSelectPiercing,
    doFrenzyMixedSelectFire,
    doFrenzyMixedRejectOutsideType,
  }
}
