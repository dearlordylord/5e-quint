// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: parity-witness BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING

module battleRuntimeCommandOrderingMbt {
  import battleRuntimeCommandOrdering.* from "./battle-runtime-command-ordering"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  var qStage: CommandFrontierStage
  var qProtocol: WitnessProtocol[BattleHoleFamilyKind]
  var qTableFactFrontierOpen: bool
  var qLastOrderingError: str
  var qPendingCommandOption: str
  var qTargetProne: bool
  var qDroppedObjectCount: int
  var qHaltSuppressed: bool
  var qMovementSpentFeet: int
  var qCurrentActor: str
  var qReactionWindowOpen: bool

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

  pure def orderingErrorLabel(error: CommandFillOrderingError): str =
    match error {
      | CommandTargetListRequired => "commandTargetListRequired"
      | CommandOptionChoiceRequired => "commandOptionChoiceRequired"
      | CommandSavingThrowRequired => "commandSavingThrowRequired"
      | CommandHeldObjectFactsRequired => "commandHeldObjectFactsRequired"
      | CommandMovementRequired => "commandMovementRequired"
    }

  pure def acceptedStage(
    result: CommandFillOrderResult,
    fallback: CommandFrontierStage,
  ): CommandFrontierStage =
    match result {
      | CommandFillAccepted(stage) => stage
      | CommandFillRequestedEarlier(request) => request.stage
      | CommandFillRejected(_) => fallback
      | CommandFillNotOrderingError(stage) => stage
    }

  pure def acceptedRuntimeResult(result: CommandFillOrderResult): str =
    match result {
      | CommandFillAccepted(stage) =>
          if (stage == CommandResolvedStage) "resolved" else "needsHoles"
      | CommandFillRequestedEarlier(_) => "needsHoles"
      | CommandFillRejected(_) => "invalid"
      | CommandFillNotOrderingError(_) => "needsHoles"
    }

  pure def orderingLabel(result: CommandFillOrderResult): str =
    match result {
      | CommandFillAccepted(_) => ""
      | CommandFillRequestedEarlier(request) => orderingErrorLabel(request.error)
      | CommandFillRejected(error) => orderingErrorLabel(error)
      | CommandFillNotOrderingError(_) => ""
    }

  action recordProjection(
    stage: CommandFrontierStage,
    lastResult: str,
    lastOrderingError: str,
    pendingCommandOption: str,
    targetProne: bool,
    droppedObjectCount: int,
    haltSuppressed: bool,
    movementSpentFeet: int,
    currentActor: str,
    reactionWindowOpen: bool,
  ): bool = all {
    qStage' = stage,
    qProtocol' = witnessProtocolForProjection(
      commandHoleFrontier(stage),
      lastResult,
    ),
    qTableFactFrontierOpen' = commandHoleFrontierIncludesTableFacts(stage),
    qLastOrderingError' = lastOrderingError,
    qPendingCommandOption' = pendingCommandOption,
    qTargetProne' = targetProne,
    qDroppedObjectCount' = droppedObjectCount,
    qHaltSuppressed' = haltSuppressed,
    qMovementSpentFeet' = movementSpentFeet,
    qCurrentActor' = currentActor,
    qReactionWindowOpen' = reactionWindowOpen,
  }

  action init = recordProjection(
    CommandActSelectionStage,
    "init",
    "",
    "none",
    false,
    0,
    false,
    0,
    "Caster",
    false,
  )

  action doDiscoverCommand = all {
    qStage == CommandActSelectionStage,
    recordProjection(
      CommandTargetListAndOptionChoiceStage,
      "needsHoles",
      "",
      "none",
      false,
      0,
      false,
      0,
      "Caster",
      false,
    ),
  }

  action doSubmitOptionBeforeTargetList = all {
    qStage == CommandTargetListAndOptionChoiceStage,
    val result = commandFillOrderResult(
      qStage,
      CommandOptionChoiceFillKind,
      CommandGrovelOption,
      true,
      false,
      false,
      false,
      false,
    )
    recordProjection(
      acceptedStage(result, qStage),
      acceptedRuntimeResult(result),
      orderingLabel(result),
      "none",
      false,
      0,
      false,
      0,
      "Caster",
      false,
    ),
  }

  action doFillTargetList = all {
    qStage == CommandTargetListAndOptionChoiceStage,
    val result = commandFillOrderResult(
      qStage,
      SpellTargetListFillKind,
      CommandGrovelOption,
      true,
      false,
      false,
      false,
      false,
    )
    recordProjection(
      acceptedStage(result, qStage),
      acceptedRuntimeResult(result),
      "",
      "none",
      false,
      0,
      false,
      0,
      "Caster",
      false,
    ),
  }

  action doSubmitSavingThrowBeforeOption = all {
    qStage == CommandOptionChoiceStage,
    val result = commandFillOrderResult(
      qStage,
      SavingThrowOutcomeFillKind,
      CommandGrovelOption,
      true,
      false,
      false,
      false,
      false,
    )
    recordProjection(
      acceptedStage(result, qStage),
      acceptedRuntimeResult(result),
      orderingLabel(result),
      "none",
      false,
      0,
      false,
      0,
      "Caster",
      false,
    ),
  }

  action doFillGrovelOption = all {
    qStage == CommandOptionChoiceStage,
    val result = commandFillOrderResult(
      qStage,
      CommandOptionChoiceFillKind,
      CommandGrovelOption,
      true,
      false,
      false,
      false,
      false,
    )
    recordProjection(
      acceptedStage(result, qStage),
      acceptedRuntimeResult(result),
      "",
      "none",
      false,
      0,
      false,
      0,
      "Caster",
      false,
    ),
  }

  action doFillFailedGrovelSavingThrow = all {
    qStage == CommandSavingThrowOutcomeStage,
    val result = commandFillOrderResult(
      qStage,
      SavingThrowOutcomeFillKind,
      CommandGrovelOption,
      true,
      false,
      false,
      false,
      false,
    )
    recordProjection(
      acceptedStage(result, qStage),
      acceptedRuntimeResult(result),
      "",
      "grovel",
      false,
      0,
      false,
      0,
      "Caster",
      false,
    ),
  }

  action doFollowGrovel = all {
    qStage == CommandResolvedStage,
    qPendingCommandOption == "grovel",
    recordProjection(
      CommandResolvedStage,
      "resolved",
      "",
      "none",
      true,
      0,
      false,
      0,
      "Caster",
      false,
    ),
  }

  action doDropNeedsHeldObjectFacts = all {
    qStage == CommandActSelectionStage,
    recordProjection(
      CommandDropHeldObjectFactsStage,
      "needsHoles",
      "",
      "drop",
      false,
      0,
      false,
      0,
      "Target",
      false,
    ),
  }

  action doFillDropHeldObjectFacts = all {
    qStage == CommandDropHeldObjectFactsStage,
    recordProjection(
      CommandResolvedStage,
      "resolved",
      "",
      "none",
      false,
      2,
      false,
      0,
      "Caster",
      false,
    ),
  }

  action doHaltSuppresses = all {
    qStage == CommandActSelectionStage,
    recordProjection(
      CommandResolvedStage,
      "resolved",
      "",
      "halt",
      false,
      0,
      true,
      30,
      "Target",
      false,
    ),
  }

  action doApproachMovementContinues = all {
    qStage == CommandActSelectionStage,
    recordProjection(
      CommandApproachMovementStage,
      "needsHoles",
      "",
      "approach",
      false,
      0,
      false,
      0,
      "Target",
      false,
    ),
  }

  action doFillApproachMovementContinues = all {
    qStage == CommandApproachMovementStage,
    val result = commandFillOrderResult(
      qStage,
      MovementFillKind,
      CommandApproachOption,
      true,
      true,
      false,
      false,
      false,
    )
    recordProjection(
      acceptedStage(result, qStage),
      acceptedRuntimeResult(result),
      "",
      "none",
      false,
      0,
      false,
      10,
      "Target",
      false,
    ),
  }

  action doFillApproachMovementWithinFive = all {
    qStage == CommandApproachMovementStage,
    val result = commandFillOrderResult(
      qStage,
      MovementFillKind,
      CommandApproachOption,
      true,
      true,
      false,
      true,
      false,
    )
    recordProjection(
      acceptedStage(result, qStage),
      acceptedRuntimeResult(result),
      "",
      "none",
      false,
      0,
      false,
      10,
      "Caster",
      false,
    ),
  }

  action doApproachNoMovement = all {
    qStage == CommandActSelectionStage,
    recordProjection(
      CommandResolvedStage,
      "resolved",
      "",
      "none",
      false,
      0,
      false,
      0,
      "Target",
      false,
    ),
  }

  action doFleeMovement = all {
    qStage == CommandActSelectionStage,
    recordProjection(
      CommandFleeMovementStage,
      "needsHoles",
      "",
      "flee",
      false,
      0,
      false,
      0,
      "Target",
      false,
    ),
  }

  action doFillFleeMovement = all {
    qStage == CommandFleeMovementStage,
    val result = commandFillOrderResult(
      qStage,
      MovementFillKind,
      CommandFleeOption,
      true,
      true,
      false,
      false,
      false,
    )
    recordProjection(
      acceptedStage(result, qStage),
      acceptedRuntimeResult(result),
      "",
      "none",
      false,
      0,
      false,
      30,
      "Caster",
      false,
    ),
  }

  action doRejectFleePartialMovement = all {
    qStage == CommandFleeMovementStage,
    val result = CommandFillRejected(CommandMovementRequired)
    recordProjection(
      acceptedStage(result, qStage),
      acceptedRuntimeResult(result),
      orderingLabel(result),
      "flee",
      false,
      0,
      false,
      0,
      "Target",
      false,
    ),
  }

  action doFleeNoMovement = all {
    qStage == CommandActSelectionStage,
    recordProjection(
      CommandResolvedStage,
      "resolved",
      "",
      "none",
      false,
      0,
      false,
      0,
      "Caster",
      false,
    ),
  }

  action doFleeOpportunityAttack = all {
    qStage == CommandFleeMovementStage,
    val result = commandFillOrderResult(
      qStage,
      MovementFillKind,
      CommandFleeOption,
      true,
      true,
      false,
      false,
      true,
    )
    recordProjection(
      acceptedStage(result, qStage),
      "needsHoles",
      "",
      "flee",
      false,
      0,
      false,
      0,
      "Target",
      true,
    ),
  }

  action step = any {
    doDiscoverCommand,
    doSubmitOptionBeforeTargetList,
    doFillTargetList,
    doSubmitSavingThrowBeforeOption,
    doFillGrovelOption,
    doFillFailedGrovelSavingThrow,
    doFollowGrovel,
    doDropNeedsHeldObjectFacts,
    doFillDropHeldObjectFacts,
    doHaltSuppresses,
    doApproachMovementContinues,
    doFillApproachMovementContinues,
    doFillApproachMovementWithinFive,
    doApproachNoMovement,
    doFleeMovement,
    doFillFleeMovement,
    doRejectFleePartialMovement,
    doFleeNoMovement,
    doFleeOpportunityAttack,
  }
}
