// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: parity-witness BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING

module battleRuntimeHitPointRestorationOrderingMbt {
  import battleRuntimeHitPointRestorationOrdering.* from "./battle-runtime-hit-point-restoration-ordering"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  var qStage: HitPointRestorationFrontierStage
  var qProtocol: WitnessProtocol[BattleHoleFamilyKind]
  var qLastOrderingError: str
  var qSpellTargetHp: int
  var qSpellTargetZeroHpLifecycleCleared: bool
  var qFeatureTargetHp: int
  var qFeatureTargetZeroHpLifecycleCleared: bool

  pure def openHoles: Set[BattleHoleFamilyKind] = qProtocol.holes

  pure val witnessHoleType: BattleHoleFamilyKind = TargetChoiceHoleKind

  pure def witnessProtocolForProjection(
    holes: Set[BattleHoleFamilyKind],
    result: WitnessResult,
  ): WitnessProtocol[BattleHoleFamilyKind] =
    witnessProtocolFromResult(holes, witnessHoleType, result)

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

  pure def acceptedRuntimeResult(result: HitPointRestorationFillOrderResult): WitnessResult =
    match result {
      | HitPointRestorationFillAccepted(stage) =>
          if (stage == HitPointRestorationResolvedStage) WResolved else WNeedsHoles
      | HitPointRestorationFillRequestedEarlier(_) => WNeedsHoles
      | HitPointRestorationFillNotOrderingError(_) => WNeedsHoles
    }

  pure def requestedEarlierLabel(result: HitPointRestorationFillOrderResult): str =
    match result {
      | HitPointRestorationFillAccepted(_) => ""
      | HitPointRestorationFillRequestedEarlier(request) => orderingErrorLabel(request.error)
      | HitPointRestorationFillNotOrderingError(_) => ""
    }

  action recordProjection(
    stage: HitPointRestorationFrontierStage,
    result: WitnessResult,
    lastOrderingError: str,
    spellTargetHp: int,
    spellTargetZeroHpLifecycleCleared: bool,
    featureTargetHp: int,
    featureTargetZeroHpLifecycleCleared: bool,
  ): bool = all {
    qStage' = stage,
    qProtocol' = witnessProtocolForProjection(
      hitPointRestorationHoleFrontier(stage),
      result,
    ),
    qLastOrderingError' = lastOrderingError,
    qSpellTargetHp' = spellTargetHp,
    qSpellTargetZeroHpLifecycleCleared' = spellTargetZeroHpLifecycleCleared,
    qFeatureTargetHp' = featureTargetHp,
    qFeatureTargetZeroHpLifecycleCleared' = featureTargetZeroHpLifecycleCleared,
  }

  action init = recordProjection(
    HitPointRestorationActSelectionStage,
    WInit,
    "",
    0,
    false,
    0,
    false,
  )

  action doDiscoverSingleTargetSpellHealing = all {
    qStage == HitPointRestorationActSelectionStage,
    recordProjection(SpellHealingTargetChoiceStage, WNeedsHoles, "", 0, false, 0, false),
  }

  action doSubmitHealingRollBeforeTargetChoice = all {
    qStage == SpellHealingTargetChoiceStage,
    val result = hitPointRestorationFillOrderResult(qStage, RolledDiceFillKind)
    recordProjection(
      acceptedStage(result),
      acceptedRuntimeResult(result),
      requestedEarlierLabel(result),
      0,
      false,
      0,
      false,
    ),
  }

  action doFillSpellHealingTargetChoice = all {
    qStage == SpellHealingTargetChoiceStage,
    val result = hitPointRestorationFillOrderResult(qStage, TargetChoiceFillKind)
    recordProjection(
      acceptedStage(result),
      acceptedRuntimeResult(result),
      "",
      0,
      false,
      0,
      false,
    ),
  }

  action doDiscoverTargetListSpellHealing = all {
    qStage == HitPointRestorationActSelectionStage,
    recordProjection(SpellHealingTargetListStage, WNeedsHoles, "", 0, false, 0, false),
  }

  action doSubmitHealingRollBeforeTargetList = all {
    qStage == SpellHealingTargetListStage,
    val result = hitPointRestorationFillOrderResult(qStage, RolledDiceFillKind)
    recordProjection(
      acceptedStage(result),
      acceptedRuntimeResult(result),
      requestedEarlierLabel(result),
      0,
      false,
      0,
      false,
    ),
  }

  action doFillSpellHealingTargetList = all {
    qStage == SpellHealingTargetListStage,
    val result = hitPointRestorationFillOrderResult(qStage, SpellTargetListFillKind)
    recordProjection(
      acceptedStage(result),
      acceptedRuntimeResult(result),
      "",
      0,
      false,
      0,
      false,
    ),
  }

  action doFillSpellHealingRoll = all {
    qStage == SpellHealingRollStage,
    val result = hitPointRestorationFillOrderResult(qStage, RolledDiceFillKind)
    recordProjection(
      acceptedStage(result),
      acceptedRuntimeResult(result),
      "",
      5,
      true,
      0,
      false,
    ),
  }

  action doDiscoverFeatureHealingPool = all {
    qStage == HitPointRestorationActSelectionStage,
    recordProjection(
      FeatureHealingPoolDistributionStage,
      WNeedsHoles,
      "",
      0,
      false,
      0,
      false,
    ),
  }

  action doFillFeatureHealingDistribution = all {
    qStage == FeatureHealingPoolDistributionStage,
    val result = hitPointRestorationFillOrderResult(
      qStage,
      HitPointHealingDistributionFillKind,
    )
    recordProjection(
      acceptedStage(result),
      acceptedRuntimeResult(result),
      "",
      0,
      false,
      8,
      true,
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
