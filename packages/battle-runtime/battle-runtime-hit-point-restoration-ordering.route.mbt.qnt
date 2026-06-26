// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

module battleRuntimeHitPointRestorationOrderingRouteMbt {
  import battleRuntimeHitPointRestorationOrdering.* from "./battle-runtime-hit-point-restoration-ordering"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  var qStage: HitPointRestorationFrontierStage
  var qProtocol: WitnessProtocol[BattleHoleFamilyKind]
  var qLastOrderingError: str
  var qSpellTargetHp: int
  var qSpellTargetZeroHpLifecycleCleared: bool
  var qFeatureTargetHp: int
  var qFeatureTargetZeroHpLifecycleCleared: bool
  var qRoute: List[ReducerRouteEvent]

  pure def qHoles: Set[BattleHoleFamilyKind] = qProtocol.holes

  pure val witnessHoleType: BattleHoleFamilyKind = TargetChoiceHoleKind

  pure def witnessProtocolForProjection(
    holes: Set[BattleHoleFamilyKind],
    lastResult: str,
  ): WitnessProtocol[BattleHoleFamilyKind] =
    if (lastResult == "init") witnessInit(witnessHoleType)
    else if (lastResult == "invalid") witnessInvalidWithHoles(holes, WInvalidFill)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(witnessHoleType)

  pure def orderingErrorLabel(error: HitPointRestorationFillOrderingError): str =
    match error {
      | HealingTargetRequired => "healingTargetRequired"
      | HealingAmountRequired => "healingAmountRequired"
      | HealingDistributionRequired => "healingDistributionRequired"
    }

  pure def acceptedStage(
    result: HitPointRestorationFillOrderResult,
  ): HitPointRestorationFrontierStage =
    match result {
      | HitPointRestorationFillAccepted(stage) => stage
      | HitPointRestorationFillRequestedEarlier(request) => request.stage
      | HitPointRestorationFillNotOrderingError(stage) => stage
    }

  pure def acceptedRuntimeResult(result: HitPointRestorationFillOrderResult): str =
    match result {
      | HitPointRestorationFillAccepted(stage) =>
          if (stage == HitPointRestorationResolvedStage) "resolved" else "needsHoles"
      | HitPointRestorationFillRequestedEarlier(_) => "needsHoles"
      | HitPointRestorationFillNotOrderingError(_) => "needsHoles"
    }

  pure def requestedEarlierLabel(result: HitPointRestorationFillOrderResult): str =
    match result {
      | HitPointRestorationFillAccepted(_) => ""
      | HitPointRestorationFillRequestedEarlier(request) => orderingErrorLabel(request.error)
      | HitPointRestorationFillNotOrderingError(_) => ""
    }

  action recordProjection(
    stage: HitPointRestorationFrontierStage,
    lastResult: str,
    lastOrderingError: str,
    spellTargetHp: int,
    spellTargetZeroHpLifecycleCleared: bool,
    featureTargetHp: int,
    featureTargetZeroHpLifecycleCleared: bool,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qStage' = stage,
    qProtocol' = witnessProtocolForProjection(
      hitPointRestorationHoleFrontier(stage),
      lastResult,
    ),
    qLastOrderingError' = lastOrderingError,
    qSpellTargetHp' = spellTargetHp,
    qSpellTargetZeroHpLifecycleCleared' = spellTargetZeroHpLifecycleCleared,
    qFeatureTargetHp' = featureTargetHp,
    qFeatureTargetZeroHpLifecycleCleared' = featureTargetZeroHpLifecycleCleared,
    qRoute' = route,
  }

  action init = recordProjection(
    HitPointRestorationActSelectionStage,
    "init",
    "",
    0,
    false,
    0,
    false,
    List(routeStartBattle(BattleActionEconomyOwner)),
  )

  action doDiscoverSingleTargetSpellHealing = all {
    qStage == HitPointRestorationActSelectionStage,
    recordProjection(
      SpellHealingTargetChoiceStage,
      "needsHoles",
      "",
      0,
      false,
      0,
      false,
      qRoute.append(
        routeDiscoverBattleActs(
          HitPointRestorationRouteSubject,
          Set(TargetChoiceHoleKind),
          BattleSpellSlotAndActionEconomyOwner,
        )
      ),
    ),
  }

  action doSubmitHealingRollBeforeTargetChoice = all {
    qStage == SpellHealingTargetChoiceStage,
    val result = hitPointRestorationFillOrderResult(qStage, RolledDiceFillKind)
    val stage = acceptedStage(result)
    recordProjection(
      stage,
      acceptedRuntimeResult(result),
      requestedEarlierLabel(result),
      0,
      false,
      0,
      false,
      qRoute.append(
        routeResolveBattleSubject(
          HitPointRestorationRouteSubject,
          RolledDiceFillKind,
          hitPointRestorationHoleFrontier(stage),
          BattleHoleFrontierOwner,
        )
      ),
    ),
  }

  action doFillSpellHealingTargetChoice = all {
    qStage == SpellHealingTargetChoiceStage,
    val result = hitPointRestorationFillOrderResult(qStage, TargetChoiceFillKind)
    val stage = acceptedStage(result)
    recordProjection(
      stage,
      acceptedRuntimeResult(result),
      "",
      0,
      false,
      0,
      false,
      qRoute.append(
        routeResolveBattleSubject(
          HitPointRestorationRouteSubject,
          TargetChoiceFillKind,
          hitPointRestorationHoleFrontier(stage),
          BattleHoleFrontierOwner,
        )
      ),
    ),
  }

  action doDiscoverTargetListSpellHealing = all {
    qStage == HitPointRestorationActSelectionStage,
    recordProjection(
      SpellHealingTargetListStage,
      "needsHoles",
      "",
      0,
      false,
      0,
      false,
      qRoute.append(
        routeDiscoverBattleActs(
          HitPointRestorationRouteSubject,
          Set(SpellTargetListHoleKind),
          BattleSpellSlotAndActionEconomyOwner,
        )
      ),
    ),
  }

  action doSubmitHealingRollBeforeTargetList = all {
    qStage == SpellHealingTargetListStage,
    val result = hitPointRestorationFillOrderResult(qStage, RolledDiceFillKind)
    val stage = acceptedStage(result)
    recordProjection(
      stage,
      acceptedRuntimeResult(result),
      requestedEarlierLabel(result),
      0,
      false,
      0,
      false,
      qRoute.append(
        routeResolveBattleSubject(
          HitPointRestorationRouteSubject,
          RolledDiceFillKind,
          hitPointRestorationHoleFrontier(stage),
          BattleHoleFrontierOwner,
        )
      ),
    ),
  }

  action doFillSpellHealingTargetList = all {
    qStage == SpellHealingTargetListStage,
    val result = hitPointRestorationFillOrderResult(qStage, SpellTargetListFillKind)
    val stage = acceptedStage(result)
    recordProjection(
      stage,
      acceptedRuntimeResult(result),
      "",
      0,
      false,
      0,
      false,
      qRoute.append(
        routeResolveBattleSubject(
          HitPointRestorationRouteSubject,
          SpellTargetListFillKind,
          hitPointRestorationHoleFrontier(stage),
          BattleHoleFrontierOwner,
        )
      ),
    ),
  }

  action doFillSpellHealingRoll = all {
    qStage == SpellHealingRollStage,
    val result = hitPointRestorationFillOrderResult(qStage, RolledDiceFillKind)
    val stage = acceptedStage(result)
    recordProjection(
      stage,
      acceptedRuntimeResult(result),
      "",
      5,
      true,
      0,
      false,
      qRoute.append(
        routeResolveBattleSubject(
          HitPointRestorationRouteSubject,
          RolledDiceFillKind,
          hitPointRestorationHoleFrontier(stage),
          BattleHitPointAndZeroHpLifecycleOwner,
        )
      ),
    ),
  }

  action doDiscoverFeatureHealingPool = all {
    qStage == HitPointRestorationActSelectionStage,
    recordProjection(
      FeatureHealingPoolDistributionStage,
      "needsHoles",
      "",
      0,
      false,
      0,
      false,
      qRoute.append(
        routeDiscoverBattleActs(
          HitPointRestorationRouteSubject,
          Set(HitPointHealingDistributionHoleKind),
          BattleActionEconomyOwner,
        )
      ),
    ),
  }

  action doFillFeatureHealingDistribution = all {
    qStage == FeatureHealingPoolDistributionStage,
    val result = hitPointRestorationFillOrderResult(
      qStage,
      HitPointHealingDistributionFillKind,
    )
    val stage = acceptedStage(result)
    recordProjection(
      stage,
      acceptedRuntimeResult(result),
      "",
      0,
      false,
      8,
      true,
      qRoute.append(
        routeResolveBattleSubject(
          HitPointRestorationRouteSubject,
          HitPointHealingDistributionFillKind,
          hitPointRestorationHoleFrontier(stage),
          BattleHitPointAndZeroHpLifecycleOwner,
        )
      ),
    ),
  }

  action step = any {
    doDiscoverSingleTargetSpellHealing,
    doSubmitHealingRollBeforeTargetChoice,
    doFillSpellHealingTargetChoice,
    doDiscoverTargetListSpellHealing,
    doSubmitHealingRollBeforeTargetList,
    doFillSpellHealingTargetList,
    doFillSpellHealingRoll,
    doDiscoverFeatureHealingPool,
    doFillFeatureHealingDistribution,
  }
}
