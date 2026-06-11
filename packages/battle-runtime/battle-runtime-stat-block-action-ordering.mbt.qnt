// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: parity-witness BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING

module battleRuntimeStatBlockActionOrderingMbt {
  import battleRuntimeStatBlockActionOrdering.* from "./battle-runtime-stat-block-action-ordering"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"

  var qStage: StatBlockActionFrontierStage
  var qHoles: Set[BattleHoleFamilyKind]
  var qLastResult: str
  var qLastOrderingError: str
  var qMultiattackDispatchesAvailable: int
  var qRechargeActionAvailable: bool
  var qUsesRolledDamage: bool

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

  pure def acceptedRuntimeResult(result: StatBlockActionFillOrderResult): str =
    match result {
      | StatBlockActionFillAccepted(stage) =>
          if (stage == StatBlockResolvedStage) "resolved" else "needsHoles"
      | StatBlockActionFillRejected(_) => "invalid"
      | StatBlockActionFillNotOrderingError(_) => "needsHoles"
    }

  pure def rejectedOrderingLabel(result: StatBlockActionFillOrderResult): str =
    match result {
      | StatBlockActionFillAccepted(_) => ""
      | StatBlockActionFillRejected(error) => orderingErrorLabel(error)
      | StatBlockActionFillNotOrderingError(_) => ""
    }

  action recordProjection(
    stage: StatBlockActionFrontierStage,
    lastResult: str,
    lastOrderingError: str,
    multiattackDispatchesAvailable: int,
    rechargeActionAvailable: bool,
    usesRolledDamage: bool,
  ): bool = all {
    qStage' = stage,
    qHoles' = statBlockActionHoleFrontier(stage),
    qLastResult' = lastResult,
    qLastOrderingError' = lastOrderingError,
    qMultiattackDispatchesAvailable' = multiattackDispatchesAvailable,
    qRechargeActionAvailable' = rechargeActionAvailable,
    qUsesRolledDamage' = usesRolledDamage,
  }

  action init = recordProjection(
    StatBlockActSelectionStage,
    "init",
    "",
    0,
    true,
    true,
  )

  action doStartMultiattackControl = all {
    qStage == StatBlockActSelectionStage,
    recordProjection(
      StatBlockAttackTargetChoiceStage,
      "needsHoles",
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
      "needsHoles",
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
      "needsHoles",
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
      "needsHoles",
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
