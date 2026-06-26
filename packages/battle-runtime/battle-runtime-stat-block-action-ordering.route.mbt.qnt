// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Rules-Glossary.md#Stat Block defines monster
//   Actions, Attack Notation, Damage Notation, and recharge notation.
// - .references/srd-5.2.1/Playing-the-Game.md#Making an Attack orders target
//   choice, attack roll, and hit damage.
// - UBIQUITOUS_LANGUAGE.md: Stat Block, Multiattack, Recharge, Attack Roll.
module battleRuntimeStatBlockActionOrderingRouteMbt {
  import battleRuntimeStatBlockActionOrdering.* from "./battle-runtime-stat-block-action-ordering"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  var qStage: StatBlockActionFrontierStage
  var qProtocol: WitnessProtocol[BattleHoleFamilyKind]
  var qLastOrderingError: str
  var qMultiattackDispatchesAvailable: int
  var qRechargeActionAvailable: bool
  var qUsesRolledDamage: bool
  var qRoute: List[ReducerRouteEvent]

  pure val witnessHoleType: BattleHoleFamilyKind = TargetChoiceHoleKind

  pure def witnessProtocolForProjection(
    stage: StatBlockActionFrontierStage,
    result: WitnessResult,
  ): WitnessProtocol[BattleHoleFamilyKind] = {
    val holes = statBlockActionHoleFrontier(stage)
    match result {
      | WInit => witnessInit(witnessHoleType)
      | WNeedsHoles => witnessNeedsHoles(holes)
      | WResolved => witnessResolved(witnessHoleType)
      | WInvalid(reason) => witnessInvalidWithHoles(holes, reason)
    }
  }

  pure def orderingErrorLabel(error: StatBlockActionFillOrderingError): str =
    match error {
      | StatBlockTargetChoiceRequired => "statBlockTargetChoiceRequired"
      | StatBlockAttackRollRequired => "statBlockAttackRollRequired"
      | StatBlockRechargeRollRequired => "statBlockRechargeRollRequired"
    }

  pure def acceptedStage(
    currentStage: StatBlockActionFrontierStage,
    result: StatBlockActionFillOrderResult,
  ): StatBlockActionFrontierStage =
    match result {
      | StatBlockActionFillAccepted(stage) => stage
      | StatBlockActionFillRejected(_) => currentStage
      | StatBlockActionFillNotOrderingError(stage) => stage
    }

  pure def acceptedRuntimeResult(result: StatBlockActionFillOrderResult): WitnessResult =
    match result {
      | StatBlockActionFillAccepted(stage) =>
          if (stage == StatBlockResolvedStage) WResolved else WNeedsHoles
      | StatBlockActionFillRejected(_) => WInvalid(WInvalidFill)
      | StatBlockActionFillNotOrderingError(_) => WNeedsHoles
    }

  pure def rejectedOrderingLabel(result: StatBlockActionFillOrderResult): str =
    match result {
      | StatBlockActionFillAccepted(_) => ""
      | StatBlockActionFillRejected(error) => orderingErrorLabel(error)
      | StatBlockActionFillNotOrderingError(_) => ""
    }

  action recordProjection(
    stage: StatBlockActionFrontierStage,
    result: WitnessResult,
    lastOrderingError: str,
    multiattackDispatchesAvailable: int,
    rechargeActionAvailable: bool,
    usesRolledDamage: bool,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qStage' = stage,
    qProtocol' = witnessProtocolForProjection(stage, result),
    qLastOrderingError' = lastOrderingError,
    qMultiattackDispatchesAvailable' = multiattackDispatchesAvailable,
    qRechargeActionAvailable' = rechargeActionAvailable,
    qUsesRolledDamage' = usesRolledDamage,
    qRoute' = route,
  }

  action init = recordProjection(
    StatBlockActSelectionStage,
    WInit,
    "",
    0,
    true,
    true,
    List(routeStartBattle(BattleActionEconomyOwner)),
  )

  action doStartMultiattackControl = all {
    qStage == StatBlockActSelectionStage,
    recordProjection(
      StatBlockAttackTargetChoiceStage,
      WNeedsHoles,
      "",
      2,
      false,
      true,
      qRoute.append(
        routeDiscoverBattleActs(
          StatBlockActionRouteSubject,
          Set(TargetChoiceHoleKind),
          BattleStatBlockActionOwner,
        )
      ),
    ),
  }

  action doDiscoverRolledActionAttackControl = all {
    qStage == StatBlockActSelectionStage,
    recordProjection(
      StatBlockAttackTargetChoiceStage,
      WNeedsHoles,
      "",
      0,
      qRechargeActionAvailable,
      true,
      qRoute.append(
        routeDiscoverBattleActs(
          StatBlockActionRouteSubject,
          Set(TargetChoiceHoleKind),
          BattleStatBlockActionOwner,
        )
      ),
    ),
  }

  action doDiscoverStaticActionAttackControl = all {
    qStage == StatBlockActSelectionStage,
    recordProjection(
      StatBlockAttackTargetChoiceStage,
      WNeedsHoles,
      "",
      0,
      false,
      false,
      qRoute.append(
        routeDiscoverBattleActs(
          StatBlockActionRouteSubject,
          Set(TargetChoiceHoleKind),
          BattleStatBlockActionOwner,
        )
      ),
    ),
  }

  action doRejectAttackRollBeforeTargetChoice = all {
    qStage == StatBlockAttackTargetChoiceStage,
    val result = statBlockActionFillOrderResult(qStage, AttackRollFillKind, true, true)
    val stage = acceptedStage(qStage, result)
    recordProjection(
      stage,
      acceptedRuntimeResult(result),
      rejectedOrderingLabel(result),
      qMultiattackDispatchesAvailable,
      qRechargeActionAvailable,
      qUsesRolledDamage,
      qRoute.append(
        routeResolveBattleSubject(
          StatBlockActionRouteSubject,
          AttackRollFillKind,
          statBlockActionHoleFrontier(stage),
          BattleHoleFrontierOwner,
        )
      ),
    ),
  }

  action doFillTargetChoice = all {
    qStage == StatBlockAttackTargetChoiceStage,
    val result = statBlockActionFillOrderResult(qStage, TargetChoiceFillKind, true, true)
    val stage = acceptedStage(qStage, result)
    recordProjection(
      stage,
      acceptedRuntimeResult(result),
      "",
      qMultiattackDispatchesAvailable,
      qRechargeActionAvailable,
      qUsesRolledDamage,
      qRoute.append(
        routeResolveBattleSubject(
          StatBlockActionRouteSubject,
          TargetChoiceFillKind,
          statBlockActionHoleFrontier(stage),
          BattleTargetSelectionOwner,
        )
      ),
    ),
  }

  action doRejectDamageBeforeAttackRoll = all {
    qStage == StatBlockAttackRollStage,
    qUsesRolledDamage,
    val result = statBlockActionFillOrderResult(qStage, RolledDiceFillKind, true, true)
    val stage = acceptedStage(qStage, result)
    recordProjection(
      stage,
      acceptedRuntimeResult(result),
      rejectedOrderingLabel(result),
      qMultiattackDispatchesAvailable,
      qRechargeActionAvailable,
      qUsesRolledDamage,
      qRoute.append(
        routeResolveBattleSubject(
          StatBlockActionRouteSubject,
          RolledDiceFillKind,
          statBlockActionHoleFrontier(stage),
          BattleHoleFrontierOwner,
        )
      ),
    ),
  }

  action doFillAttackRollMiss = all {
    qStage == StatBlockAttackRollStage,
    val result = statBlockActionFillOrderResult(
      qStage,
      AttackRollFillKind,
      false,
      qUsesRolledDamage,
    )
    val stage = acceptedStage(qStage, result)
    recordProjection(
      stage,
      acceptedRuntimeResult(result),
      "",
      qMultiattackDispatchesAvailable,
      false,
      qUsesRolledDamage,
      qRoute.append(
        routeResolveBattleSubject(
          StatBlockActionRouteSubject,
          AttackRollFillKind,
          statBlockActionHoleFrontier(stage),
          BattleAttackRollOwner,
        )
      ),
    ),
  }

  action doFillRolledAttackRollHit = all {
    qStage == StatBlockAttackRollStage,
    qUsesRolledDamage,
    val result = statBlockActionFillOrderResult(qStage, AttackRollFillKind, true, true)
    val stage = acceptedStage(qStage, result)
    recordProjection(
      stage,
      acceptedRuntimeResult(result),
      "",
      qMultiattackDispatchesAvailable,
      qRechargeActionAvailable,
      true,
      qRoute.append(
        routeResolveBattleSubject(
          StatBlockActionRouteSubject,
          AttackRollFillKind,
          statBlockActionHoleFrontier(stage),
          BattleAttackRollOwner,
        )
      ),
    ),
  }

  action doFillStaticAttackRollHit = all {
    qStage == StatBlockAttackRollStage,
    not(qUsesRolledDamage),
    val result = statBlockActionFillOrderResult(qStage, AttackRollFillKind, true, false)
    val stage = acceptedStage(qStage, result)
    recordProjection(
      stage,
      acceptedRuntimeResult(result),
      "",
      qMultiattackDispatchesAvailable,
      false,
      false,
      qRoute.append(
        routeResolveBattleSubject(
          StatBlockActionRouteSubject,
          AttackRollFillKind,
          statBlockActionHoleFrontier(stage),
          BattleHitPointOwner,
        )
      ),
    ),
  }

  action doFillDamageDice = all {
    qStage == StatBlockDamageDiceStage,
    val result = statBlockActionFillOrderResult(qStage, RolledDiceFillKind, true, true)
    val stage = acceptedStage(qStage, result)
    recordProjection(
      stage,
      acceptedRuntimeResult(result),
      "",
      qMultiattackDispatchesAvailable,
      false,
      true,
      qRoute.append(
        routeResolveBattleSubject(
          StatBlockActionRouteSubject,
          RolledDiceFillKind,
          statBlockActionHoleFrontier(stage),
          BattleHitPointOwner,
        )
      ),
    ),
  }

  action doSpendRechargeGatedRolledAttack = all {
    qStage == StatBlockActSelectionStage,
    recordProjection(
      StatBlockRechargeRollStage,
      WNeedsHoles,
      "",
      0,
      false,
      true,
      qRoute.append(
        routeDiscoverBattleActs(
          StatBlockActionRouteSubject,
          Set(StatBlockRechargeRollHoleKind),
          BattleStatBlockActionOwner,
        )
      ),
    ),
  }

  action doFillRechargeRoll = all {
    qStage == StatBlockRechargeRollStage,
    val result = statBlockActionFillOrderResult(
      qStage,
      StatBlockRechargeRollFillKind,
      false,
      false,
    )
    val stage = acceptedStage(qStage, result)
    recordProjection(
      stage,
      acceptedRuntimeResult(result),
      "",
      qMultiattackDispatchesAvailable,
      true,
      true,
      qRoute.append(
        routeResolveBattleSubject(
          StatBlockActionRouteSubject,
          StatBlockRechargeRollFillKind,
          statBlockActionHoleFrontier(stage),
          BattleStatBlockActionOwner,
        )
      ),
    ),
  }

  action step = any {
    doStartMultiattackControl,
    doDiscoverRolledActionAttackControl,
    doDiscoverStaticActionAttackControl,
    doRejectAttackRollBeforeTargetChoice,
    doFillTargetChoice,
    doRejectDamageBeforeAttackRoll,
    doFillAttackRollMiss,
    doFillRolledAttackRollHit,
    doFillStaticAttackRollHit,
    doFillDamageDice,
    doSpendRechargeGatedRolledAttack,
    doFillRechargeRoll,
  }
}
