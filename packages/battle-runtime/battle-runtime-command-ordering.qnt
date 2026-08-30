// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING

// Command hole-frontier ordering over the protocol vocabulary.
//
// RAW anchor: SRD 5.2.1 Spells "Command" says the caster chooses one of five
// options, the target makes a Wisdom Saving Throw, and failed-save targets
// follow that option on their next turn. Approach and Flee spend Movement,
// Drop releases held objects and ends the turn, Grovel applies Prone and ends
// the turn, and Halt suppresses Movement, Action, and Bonus Action for that
// turn. The SRD fixes the consequences, while the reducer fixes target-list
// before option before Saving Throw as its fill-request protocol; route and
// held-object inventory details remain table-owned facts.
module battleRuntimeCommandOrdering {
  import battleRuntimeCompelledNextTurnBehavior.* from "./battle-runtime-compelled-next-turn-behavior"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"

  type CommandFrontierStage =
    | CommandActSelectionStage
    | CommandTargetListAndOptionChoiceStage
    | CommandTargetListStage
    | CommandOptionChoiceStage
    | CommandSavingThrowOutcomeStage
    | CommandDropHeldObjectFactsStage
    | CommandApproachMovementStage
    | CommandFleeMovementStage
    | CommandResolvedStage

  type CommandNextTurnOption =
    | CommandGrovelOption
    | CommandDropOption
    | CommandHaltOption
    | CommandApproachOption
    | CommandFleeOption

  type CommandFillOrderingError =
    | CommandTargetListRequired
    | CommandOptionChoiceRequired
    | CommandSavingThrowRequired
    | CommandHeldObjectFactsRequired
    | CommandMovementRequired

  type CommandFillOrderResult =
    | CommandFillAccepted(CommandFrontierStage)
    | CommandFillRequestedEarlier({ error: CommandFillOrderingError, stage: CommandFrontierStage })
    | CommandFillRejected(CommandFillOrderingError)
    | CommandFillNotOrderingError(CommandFrontierStage)

  pure def compelledStageForCommandStage(stage: CommandFrontierStage): CompelledBehaviorFrontierStage =
    match stage {
      | CommandActSelectionStage => CompelledActSelectionStage
      | CommandTargetListAndOptionChoiceStage => CompelledTargetListAndBehaviorChoiceStage
      | CommandTargetListStage => CompelledTargetListStage
      | CommandOptionChoiceStage => CompelledBehaviorChoiceStage
      | CommandSavingThrowOutcomeStage => CompelledSavingThrowOutcomeStage
      | CommandDropHeldObjectFactsStage => CompelledHeldObjectFactsStage
      | CommandApproachMovementStage => CompelledApproachMovementStage
      | CommandFleeMovementStage => CompelledFleeMovementStage
      | CommandResolvedStage => CompelledResolvedStage
    }

  pure def commandStageForCompelledStage(stage: CompelledBehaviorFrontierStage): CommandFrontierStage =
    match stage {
      | CompelledActSelectionStage => CommandActSelectionStage
      | CompelledTargetListAndBehaviorChoiceStage => CommandTargetListAndOptionChoiceStage
      | CompelledTargetListStage => CommandTargetListStage
      | CompelledBehaviorChoiceStage => CommandOptionChoiceStage
      | CompelledSavingThrowOutcomeStage => CommandSavingThrowOutcomeStage
      | CompelledHeldObjectFactsStage => CommandDropHeldObjectFactsStage
      | CompelledApproachMovementStage => CommandApproachMovementStage
      | CompelledFleeMovementStage => CommandFleeMovementStage
      | CompelledResolvedStage => CommandResolvedStage
    }

  pure def compelledOptionForCommandOption(option: CommandNextTurnOption): CompelledBehaviorOption =
    match option {
      | CommandGrovelOption => CompelledGrovelOption
      | CommandDropOption => CompelledDropOption
      | CommandHaltOption => CompelledHaltOption
      | CommandApproachOption => CompelledApproachOption
      | CommandFleeOption => CompelledFleeOption
    }

  pure def compelledFillKindForBattleFillKind(fillKind: BattleFillKind): CompelledBehaviorFillKind =
    if (fillKind == SpellTargetListFillKind)
      CompelledTargetListFill
    else if (fillKind == CommandOptionChoiceFillKind)
      CompelledBehaviorChoiceFill
    else if (fillKind == SavingThrowOutcomeFillKind)
      CompelledSavingThrowOutcomeFill
    else if (fillKind == MovementFillKind)
      CompelledMovementFill
    else
      CompelledOtherFill

  pure def commandErrorForCompelledError(error: CompelledBehaviorOrderingError): CommandFillOrderingError =
    match error {
      | CompelledTargetListRequired => CommandTargetListRequired
      | CompelledBehaviorChoiceRequired => CommandOptionChoiceRequired
      | CompelledSavingThrowRequired => CommandSavingThrowRequired
      | CompelledHeldObjectFactsRequired => CommandHeldObjectFactsRequired
      | CompelledMovementRequired => CommandMovementRequired
    }

  pure def commandResultForCompelledResult(result: CompelledBehaviorFillOrderResult): CommandFillOrderResult =
    match result {
      | CompelledFillAccepted(stage) => CommandFillAccepted(commandStageForCompelledStage(stage))
      | CompelledFillRequestedEarlier(request) => CommandFillRequestedEarlier({
          error: commandErrorForCompelledError(request.error),
          stage: commandStageForCompelledStage(request.stage),
        })
      | CompelledFillRejected(error) => CommandFillRejected(commandErrorForCompelledError(error))
      | CompelledFillNotOrderingError(stage) => CommandFillNotOrderingError(commandStageForCompelledStage(stage))
    }

  pure def commandHoleFrontier(stage: CommandFrontierStage): Set[BattleHoleFamilyKind] =
    compelledBehaviorHoleFrontier(compelledStageForCommandStage(stage)).map(hole => match hole {
      | CompelledTargetListHole => SpellTargetListHoleKind
      | CompelledBehaviorChoiceHole => CommandOptionChoiceHoleKind
      | CompelledSavingThrowOutcomeHole => SavingThrowOutcomeHoleKind
      | CompelledMovementHole => MovementHoleKind
    })

  pure def commandHoleFrontierIncludesTableFacts(stage: CommandFrontierStage): bool =
    compelledBehaviorHoleFrontierIncludesTableFacts(compelledStageForCommandStage(stage))

  pure def commandAfterSavingThrowStage(
    option: CommandNextTurnOption,
    failedSavingThrow: bool,
    movementAvailable: bool,
    heldObjectFactsRequired: bool,
  ): CommandFrontierStage =
    commandStageForCompelledStage(compelledBehaviorAfterSavingThrowStage(
      compelledOptionForCommandOption(option),
      failedSavingThrow,
      movementAvailable,
      heldObjectFactsRequired,
    ))

  pure def commandAfterMovementStage(
    option: CommandNextTurnOption,
    movedWithinFiveFeetOfCaster: bool,
    openedOpportunityAttack: bool,
  ): CommandFrontierStage =
    commandStageForCompelledStage(compelledBehaviorAfterMovementStage)

  pure def commandFillOrderResult(
    stage: CommandFrontierStage,
    fillKind: BattleFillKind,
    option: CommandNextTurnOption,
    failedSavingThrow: bool,
    movementAvailable: bool,
    heldObjectFactsRequired: bool,
    movedWithinFiveFeetOfCaster: bool,
    openedOpportunityAttack: bool,
  ): CommandFillOrderResult =
    commandResultForCompelledResult(compelledBehaviorFillOrderResult(
      compelledStageForCommandStage(stage),
      compelledFillKindForBattleFillKind(fillKind),
      compelledOptionForCommandOption(option),
      failedSavingThrow,
      movementAvailable,
      heldObjectFactsRequired,
    ))
}
