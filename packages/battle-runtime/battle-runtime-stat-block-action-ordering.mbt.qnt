// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: parity-witness BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING

module battleRuntimeStatBlockActionOrderingMbt {
  import battleRuntimeStatBlockActionOrdering.* from "./battle-runtime-stat-block-action-ordering"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  var qStage: StatBlockActionFrontierStage
  var qProtocol: WitnessProtocol[BattleHoleFamilyKind]
  var qLastOrderingError: str
  var qMultiattackDispatchesAvailable: int
  var qRechargeActionAvailable: bool
  var qUsesRolledDamage: bool

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
  ): bool = all {
    qStage' = stage,
    qProtocol' = witnessProtocolForProjection(stage, result),
    qLastOrderingError' = lastOrderingError,
    qMultiattackDispatchesAvailable' = multiattackDispatchesAvailable,
    qRechargeActionAvailable' = rechargeActionAvailable,
    qUsesRolledDamage' = usesRolledDamage,
  }

  action init = recordProjection(
    StatBlockActSelectionStage,
    WInit,
    "",
    0,
    true,
    true,
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
    ),
  }

  action doRejectAttackRollBeforeTargetChoice = all {
    qStage == StatBlockAttackTargetChoiceStage,
    val result = statBlockActionFillOrderResult(qStage, AttackRollFillKind, true, true)
    recordProjection(
      acceptedStage(qStage, result),
      acceptedRuntimeResult(result),
      rejectedOrderingLabel(result),
      qMultiattackDispatchesAvailable,
      qRechargeActionAvailable,
      qUsesRolledDamage,
    ),
  }

  action doFillTargetChoice = all {
    qStage == StatBlockAttackTargetChoiceStage,
    val result = statBlockActionFillOrderResult(qStage, TargetChoiceFillKind, true, true)
    recordProjection(
      acceptedStage(qStage, result),
      acceptedRuntimeResult(result),
      "",
      qMultiattackDispatchesAvailable,
      qRechargeActionAvailable,
      qUsesRolledDamage,
    ),
  }

  action doRejectDamageBeforeAttackRoll = all {
    qStage == StatBlockAttackRollStage,
    qUsesRolledDamage,
    val result = statBlockActionFillOrderResult(qStage, RolledDiceFillKind, true, true)
    recordProjection(
      acceptedStage(qStage, result),
      acceptedRuntimeResult(result),
      rejectedOrderingLabel(result),
      qMultiattackDispatchesAvailable,
      qRechargeActionAvailable,
      qUsesRolledDamage,
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
    recordProjection(
      acceptedStage(qStage, result),
      acceptedRuntimeResult(result),
      "",
      qMultiattackDispatchesAvailable,
      false,
      qUsesRolledDamage,
    ),
  }

  action doFillRolledAttackRollHit = all {
    qStage == StatBlockAttackRollStage,
    qUsesRolledDamage,
    val result = statBlockActionFillOrderResult(qStage, AttackRollFillKind, true, true)
    recordProjection(
      acceptedStage(qStage, result),
      acceptedRuntimeResult(result),
      "",
      qMultiattackDispatchesAvailable,
      qRechargeActionAvailable,
      true,
    ),
  }

  action doFillStaticAttackRollHit = all {
    qStage == StatBlockAttackRollStage,
    not(qUsesRolledDamage),
    val result = statBlockActionFillOrderResult(qStage, AttackRollFillKind, true, false)
    recordProjection(
      acceptedStage(qStage, result),
      acceptedRuntimeResult(result),
      "",
      qMultiattackDispatchesAvailable,
      false,
      false,
    ),
  }

  action doFillDamageDice = all {
    qStage == StatBlockDamageDiceStage,
    val result = statBlockActionFillOrderResult(qStage, RolledDiceFillKind, true, true)
    recordProjection(
      acceptedStage(qStage, result),
      acceptedRuntimeResult(result),
      "",
      qMultiattackDispatchesAvailable,
      false,
      true,
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
    recordProjection(
      acceptedStage(qStage, result),
      acceptedRuntimeResult(result),
      "",
      qMultiattackDispatchesAvailable,
      true,
      true,
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
