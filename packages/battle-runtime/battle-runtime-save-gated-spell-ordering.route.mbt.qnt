// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

module battleRuntimeSaveGatedSpellOrderingRouteMbt {
  import battleRuntimeSaveGatedSpellOrdering.* from "./battle-runtime-save-gated-spell-ordering"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  var qStage: SaveGatedSpellFrontierStage
  var qProtocol: WitnessProtocol[BattleHoleFamilyKind]
  var qLastOrderingError: str
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

  pure def orderingErrorLabel(error: SaveGatedSpellFillOrderingError): str =
    match error {
      | SaveGatedSpellTargetOrAreaRequired => "targetOrAreaRequired"
      | SaveGatedSpellSavingThrowRequired => "savingThrowRequired"
    }

  pure def acceptedStage(
    result: SaveGatedSpellFillOrderResult,
    fallback: SaveGatedSpellFrontierStage,
  ): SaveGatedSpellFrontierStage =
    match result {
      | SaveGatedSpellFillAccepted(stage) => stage
      | SaveGatedSpellFillRejected(_) => fallback
      | SaveGatedSpellFillNotOrderingError(stage) => stage
    }

  pure def acceptedRuntimeResult(result: SaveGatedSpellFillOrderResult): str =
    match result {
      | SaveGatedSpellFillAccepted(stage) =>
          if (stage == SaveGatedSpellResolvedStage) "resolved" else "needsHoles"
      | SaveGatedSpellFillRejected(_) => "needsHoles"
      | SaveGatedSpellFillNotOrderingError(_) => "needsHoles"
    }

  pure def rejectedOrderingLabel(result: SaveGatedSpellFillOrderResult): str =
    match result {
      | SaveGatedSpellFillAccepted(_) => ""
      | SaveGatedSpellFillRejected(error) => orderingErrorLabel(error)
      | SaveGatedSpellFillNotOrderingError(_) => ""
    }

  action recordProjection(
    stage: SaveGatedSpellFrontierStage,
    lastResult: str,
    lastOrderingError: str,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qStage' = stage,
    qProtocol' = witnessProtocolForProjection(
      saveGatedSpellHoleFrontier(stage),
      lastResult,
    ),
    qLastOrderingError' = lastOrderingError,
    qRoute' = route,
  }

  action init = recordProjection(
    SaveGatedSpellActSelectionStage,
    "init",
    "",
    List(routeStartBattle(BattleActionEconomyOwner)),
  )

  action doDiscoverAreaSaveDamage = all {
    qStage == SaveGatedSpellActSelectionStage,
    recordProjection(
      SaveGatedSpellDamageSavingThrowOutcomeStage,
      "needsHoles",
      "",
      qRoute.append(
        routeDiscoverBattleActs(
          SaveGatedSpellRouteSubject,
          Set(SavingThrowOutcomeHoleKind),
          BattleSpellSlotAndActionEconomyOwner,
        )
      ),
    ),
  }

  action doSubmitDamageBeforeSavingThrow = all {
    qStage == SaveGatedSpellDamageSavingThrowOutcomeStage,
    val result = saveGatedSpellFillOrderResult(qStage, RolledDiceFillKind, true)
    recordProjection(
      acceptedStage(result, qStage),
      "needsHoles",
      rejectedOrderingLabel(result),
      qRoute.append(
        routeResolveBattleSubject(
          SaveGatedSpellRouteSubject,
          RolledDiceFillKind,
          saveGatedSpellHoleFrontier(qStage),
          BattleHoleFrontierOwner,
        )
      ),
    ),
  }

  action doFillAreaSaveFailed = all {
    qStage == SaveGatedSpellDamageSavingThrowOutcomeStage,
    val result = saveGatedSpellFillOrderResult(qStage, SavingThrowOutcomeFillKind, true)
    val stage = acceptedStage(result, qStage)
    recordProjection(
      stage,
      acceptedRuntimeResult(result),
      "",
      qRoute.append(
        routeResolveBattleSubject(
          SaveGatedSpellRouteSubject,
          SavingThrowOutcomeFillKind,
          saveGatedSpellHoleFrontier(stage),
          BattleHoleFrontierOwner,
        )
      ),
    ),
  }

  action doFillAreaDamageDice = all {
    qStage == SaveGatedSpellDamageDiceStage,
    val result = saveGatedSpellFillOrderResult(qStage, RolledDiceFillKind, true)
    val stage = acceptedStage(result, qStage)
    recordProjection(
      stage,
      acceptedRuntimeResult(result),
      "",
      qRoute.append(
        routeResolveBattleSubject(
          SaveGatedSpellRouteSubject,
          RolledDiceFillKind,
          saveGatedSpellHoleFrontier(stage),
          BattleHitPointOwner,
        )
      ),
    ),
  }

  action doDiscoverTargetListConditionChoice = all {
    qStage == SaveGatedSpellActSelectionStage,
    recordProjection(
      SaveGatedSpellTargetListAndConditionChoiceStage,
      "needsHoles",
      "",
      qRoute.append(
        routeDiscoverBattleActs(
          SaveGatedSpellRouteSubject,
          Set(SpellTargetListHoleKind, ConditionChoiceHoleKind),
          BattleSpellSlotAndActionEconomyOwner,
        )
      ),
    ),
  }

  action doFillTargetListBeforeConditionChoice = all {
    qStage == SaveGatedSpellTargetListAndConditionChoiceStage,
    val result = saveGatedSpellFillOrderResult(qStage, SpellTargetListFillKind, false)
    val stage = acceptedStage(result, qStage)
    recordProjection(
      stage,
      acceptedRuntimeResult(result),
      "",
      qRoute.append(
        routeResolveBattleSubject(
          SaveGatedSpellRouteSubject,
          SpellTargetListFillKind,
          saveGatedSpellHoleFrontier(stage),
          BattleHoleFrontierOwner,
        )
      ),
    ),
  }

  action doFillConditionChoiceAfterTargetList = all {
    qStage == SaveGatedSpellConditionChoiceStage,
    val result = saveGatedSpellFillOrderResult(qStage, ConditionChoiceFillKind, false)
    val stage = acceptedStage(result, qStage)
    recordProjection(
      stage,
      acceptedRuntimeResult(result),
      "",
      qRoute.append(
        routeResolveBattleSubject(
          SaveGatedSpellRouteSubject,
          ConditionChoiceFillKind,
          saveGatedSpellHoleFrontier(stage),
          BattleHoleFrontierOwner,
        )
      ),
    ),
  }

  action doFillConditionChoiceBeforeTargetList = all {
    qStage == SaveGatedSpellTargetListAndConditionChoiceStage,
    val result = saveGatedSpellFillOrderResult(qStage, ConditionChoiceFillKind, false)
    val stage = acceptedStage(result, qStage)
    recordProjection(
      stage,
      acceptedRuntimeResult(result),
      "",
      qRoute.append(
        routeResolveBattleSubject(
          SaveGatedSpellRouteSubject,
          ConditionChoiceFillKind,
          saveGatedSpellHoleFrontier(stage),
          BattleHoleFrontierOwner,
        )
      ),
    ),
  }

  action doFillTargetListAfterConditionChoice = all {
    qStage == SaveGatedSpellTargetListStage,
    val result = saveGatedSpellFillOrderResult(qStage, SpellTargetListFillKind, false)
    val stage = acceptedStage(result, qStage)
    recordProjection(
      stage,
      acceptedRuntimeResult(result),
      "",
      qRoute.append(
        routeResolveBattleSubject(
          SaveGatedSpellRouteSubject,
          SpellTargetListFillKind,
          saveGatedSpellHoleFrontier(stage),
          BattleHoleFrontierOwner,
        )
      ),
    ),
  }

  action doFillConditionSavingThrow = all {
    qStage == SaveGatedSpellConditionSavingThrowOutcomeStage,
    val result = saveGatedSpellFillOrderResult(qStage, SavingThrowOutcomeFillKind, false)
    val stage = acceptedStage(result, qStage)
    recordProjection(
      stage,
      acceptedRuntimeResult(result),
      "",
      qRoute.append(
        routeResolveBattleSubject(
          SaveGatedSpellRouteSubject,
          SavingThrowOutcomeFillKind,
          saveGatedSpellHoleFrontier(stage),
          BattleHoleFrontierOwner,
        )
      ),
    ),
  }

  action step = any {
    doDiscoverAreaSaveDamage,
    doSubmitDamageBeforeSavingThrow,
    doFillAreaSaveFailed,
    doFillAreaDamageDice,
    doDiscoverTargetListConditionChoice,
    doFillTargetListBeforeConditionChoice,
    doFillConditionChoiceAfterTargetList,
    doFillConditionChoiceBeforeTargetList,
    doFillTargetListAfterConditionChoice,
    doFillConditionSavingThrow,
  }
}
