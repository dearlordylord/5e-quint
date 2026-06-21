// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Command: the spell
//   chooses an option, uses a Wisdom Saving Throw, and failed-save targets
//   follow the option on their next turn.
// - .references/srd-5.2.1/Playing-the-Game.md#Movement-and-Position and
//   .references/srd-5.2.1/Rules-Glossary.md#Opportunity-Attacks define the
//   Movement and Reaction consequences used by Approach and Flee.
// - UBIQUITOUS_LANGUAGE.md: Spell Invocation, Spell Effect, Movement,
//   Reaction, Condition, and Boundary Crossing.
module battleRuntimeCommandOrderingRouteMbt {
  import battleRuntimeCommandOrdering.* from "./battle-runtime-command-ordering"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"
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

  pure def resolveRoute(
    fill: BattleFillKind,
    stage: CommandFrontierStage,
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubject(
      CommandEffectRouteSubject,
      fill,
      commandHoleFrontier(stage),
      owner,
    )

  pure def runtimeCommandDiscoverRoute(
    stage: CommandFrontierStage,
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeDiscoverBattleActs(
      CommandEffectRouteSubject,
      commandHoleFrontier(stage),
      owner,
    )

  action recordProjectionWithHoles(
    holes: Set[BattleHoleFamilyKind],
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
    route: List[ReducerRouteEvent],
  ): bool = all {
    qStage' = stage,
    qProtocol' = witnessProtocolForProjection(holes, lastResult),
    qTableFactFrontierOpen' = commandHoleFrontierIncludesTableFacts(stage),
    qLastOrderingError' = lastOrderingError,
    qPendingCommandOption' = pendingCommandOption,
    qTargetProne' = targetProne,
    qDroppedObjectCount' = droppedObjectCount,
    qHaltSuppressed' = haltSuppressed,
    qMovementSpentFeet' = movementSpentFeet,
    qCurrentActor' = currentActor,
    qReactionWindowOpen' = reactionWindowOpen,
    qRoute' = route,
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
    route: List[ReducerRouteEvent],
  ): bool = recordProjectionWithHoles(
    commandHoleFrontier(stage),
    stage,
    lastResult,
    lastOrderingError,
    pendingCommandOption,
    targetProne,
    droppedObjectCount,
    haltSuppressed,
    movementSpentFeet,
    currentActor,
    reactionWindowOpen,
    route,
  )

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
    List(routeStartBattle(BattleActionEconomyOwner)),
  )

  action doDiscoverCommand = all {
    qStage == CommandActSelectionStage,
    val stage = CommandTargetListAndOptionChoiceStage
    recordProjection(
      stage,
      "needsHoles",
      "",
      "none",
      false,
      0,
      false,
      0,
      "Caster",
      false,
      qRoute.append(
        routeDiscoverBattleActs(
          CommandEffectRouteSubject,
          commandHoleFrontier(stage),
          BattleSpellSlotAndActionEconomyOwner,
        )
      ),
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
    val stage = acceptedStage(result, qStage)
    recordProjection(
      stage,
      acceptedRuntimeResult(result),
      orderingLabel(result),
      "none",
      false,
      0,
      false,
      0,
      "Caster",
      false,
      qRoute.append(resolveRoute(CommandOptionChoiceFillKind, stage, BattleHoleFrontierOwner)),
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
    val stage = acceptedStage(result, qStage)
    recordProjection(
      stage,
      acceptedRuntimeResult(result),
      "",
      "none",
      false,
      0,
      false,
      0,
      "Caster",
      false,
      qRoute.append(resolveRoute(SpellTargetListFillKind, stage, BattleHoleFrontierOwner)),
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
    val stage = acceptedStage(result, qStage)
    recordProjection(
      stage,
      acceptedRuntimeResult(result),
      orderingLabel(result),
      "none",
      false,
      0,
      false,
      0,
      "Caster",
      false,
      qRoute.append(resolveRoute(SavingThrowOutcomeFillKind, stage, BattleHoleFrontierOwner)),
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
    val stage = acceptedStage(result, qStage)
    recordProjection(
      stage,
      acceptedRuntimeResult(result),
      "",
      "none",
      false,
      0,
      false,
      0,
      "Caster",
      false,
      qRoute.append(resolveRoute(CommandOptionChoiceFillKind, stage, BattleHoleFrontierOwner)),
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
    val stage = acceptedStage(result, qStage)
    recordProjection(
      stage,
      acceptedRuntimeResult(result),
      "",
      "grovel",
      false,
      0,
      false,
      0,
      "Caster",
      false,
      qRoute.append(resolveRoute(SavingThrowOutcomeFillKind, stage, BattleActiveEffectOwner)),
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
      qRoute.append(
        routeResolveBattleSubjectWithoutFill(
          CommandEffectRouteSubject,
          Set(),
          BattleConditionLifecycleOwner,
        )
      ),
    ),
  }

  action doDropNeedsHeldObjectFacts = all {
    qStage == CommandActSelectionStage,
    val stage = CommandDropHeldObjectFactsStage
    recordProjection(
      stage,
      "needsHoles",
      "",
      "drop",
      false,
      0,
      false,
      0,
      "Target",
      false,
      qRoute.append(runtimeCommandDiscoverRoute(stage, BattleActiveEffectOwner)),
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
      qRoute.append(
        routeResolveBattleSubjectWithoutFill(
          CommandEffectRouteSubject,
          Set(),
          BattleActiveEffectOwner,
        )
      ),
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
      qRoute.append(
        routeResolveBattleSubjectWithoutFill(
          CommandEffectRouteSubject,
          Set(),
          BattleActiveEffectOwner,
        )
      ),
    ),
  }

  action doApproachMovementContinues = all {
    qStage == CommandActSelectionStage,
    val stage = CommandApproachMovementStage
    recordProjection(
      stage,
      "needsHoles",
      "",
      "approach",
      false,
      0,
      false,
      0,
      "Target",
      false,
      qRoute.append(runtimeCommandDiscoverRoute(stage, BattleActiveEffectOwner)),
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
    val stage = acceptedStage(result, qStage)
    recordProjection(
      stage,
      acceptedRuntimeResult(result),
      "",
      "none",
      false,
      0,
      false,
      10,
      "Target",
      false,
      qRoute.append(resolveRoute(MovementFillKind, stage, BattleMovementResourceOwner)),
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
    val stage = acceptedStage(result, qStage)
    recordProjection(
      stage,
      acceptedRuntimeResult(result),
      "",
      "none",
      false,
      0,
      false,
      10,
      "Caster",
      false,
      qRoute.append(resolveRoute(MovementFillKind, stage, BattleMovementResourceOwner)),
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
      qRoute.append(
        routeResolveBattleSubjectWithoutFill(
          CommandEffectRouteSubject,
          Set(),
          BattleMovementResourceOwner,
        )
      ),
    ),
  }

  action doFleeMovement = all {
    qStage == CommandActSelectionStage,
    val stage = CommandFleeMovementStage
    recordProjection(
      stage,
      "needsHoles",
      "",
      "flee",
      false,
      0,
      false,
      0,
      "Target",
      false,
      qRoute.append(runtimeCommandDiscoverRoute(stage, BattleActiveEffectOwner)),
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
    val stage = acceptedStage(result, qStage)
    recordProjection(
      stage,
      acceptedRuntimeResult(result),
      "",
      "none",
      false,
      0,
      false,
      30,
      "Caster",
      false,
      qRoute.append(resolveRoute(MovementFillKind, stage, BattleMovementResourceOwner)),
    ),
  }

  action doRejectFleePartialMovement = all {
    qStage == CommandFleeMovementStage,
    val result = CommandFillRejected(CommandMovementRequired)
    val stage = acceptedStage(result, qStage)
    recordProjection(
      stage,
      acceptedRuntimeResult(result),
      orderingLabel(result),
      "flee",
      false,
      0,
      false,
      0,
      "Target",
      false,
      qRoute.append(resolveRoute(MovementFillKind, stage, BattleHoleFrontierOwner)),
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
      qRoute.append(
        routeResolveBattleSubjectWithoutFill(
          CommandEffectRouteSubject,
          Set(),
          BattleMovementResourceOwner,
        )
      ),
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
    val stage = acceptedStage(result, qStage)
    val interruptHoles = Set(InterruptDecisionHoleKind)
    recordProjectionWithHoles(
      interruptHoles,
      stage,
      "needsHoles",
      "",
      "flee",
      false,
      0,
      false,
      0,
      "Target",
      true,
      qRoute.append(
        routeResolveBattleSubject(
          CommandEffectRouteSubject,
          MovementFillKind,
          interruptHoles,
          BattleInterruptStackOwner,
        )
      ),
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
