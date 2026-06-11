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

  pure def commandHoleFrontier(stage: CommandFrontierStage): Set[BattleHoleFamilyKind] =
    match stage {
      | CommandActSelectionStage => Set()
      | CommandTargetListAndOptionChoiceStage =>
          Set(SpellTargetListHoleKind, CommandOptionChoiceHoleKind)
      | CommandTargetListStage => Set(SpellTargetListHoleKind)
      | CommandOptionChoiceStage => Set(CommandOptionChoiceHoleKind)
      | CommandSavingThrowOutcomeStage => Set(SavingThrowOutcomeHoleKind)
      | CommandDropHeldObjectFactsStage => Set()
      | CommandApproachMovementStage => Set(MovementHoleKind)
      | CommandFleeMovementStage => Set(MovementHoleKind)
      | CommandResolvedStage => Set()
    }

  pure def commandHoleFrontierIncludesTableFacts(stage: CommandFrontierStage): bool =
    stage == CommandDropHeldObjectFactsStage

  pure def commandAfterSavingThrowStage(
    option: CommandNextTurnOption,
    failedSavingThrow: bool,
    movementAvailable: bool,
    heldObjectFactsRequired: bool,
  ): CommandFrontierStage =
    if (not(failedSavingThrow))
      CommandResolvedStage
    else {
      match option {
        | CommandGrovelOption => CommandResolvedStage
        | CommandDropOption =>
            if (heldObjectFactsRequired) CommandDropHeldObjectFactsStage else CommandResolvedStage
        | CommandHaltOption => CommandResolvedStage
        | CommandApproachOption =>
            if (movementAvailable) CommandApproachMovementStage else CommandResolvedStage
        | CommandFleeOption =>
            if (movementAvailable) CommandFleeMovementStage else CommandResolvedStage
      }
    }

  pure def commandAfterMovementStage(
    option: CommandNextTurnOption,
    movedWithinFiveFeetOfCaster: bool,
    openedOpportunityAttack: bool,
  ): CommandFrontierStage =
    match option {
      | CommandApproachOption =>
          CommandResolvedStage
      | CommandFleeOption =>
          CommandResolvedStage
      | _ => CommandResolvedStage
    }

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
    match stage {
      | CommandActSelectionStage =>
          CommandFillNotOrderingError(CommandActSelectionStage)
      | CommandTargetListAndOptionChoiceStage =>
          if (fillKind == SpellTargetListFillKind)
            CommandFillAccepted(CommandOptionChoiceStage)
          else if (fillKind == CommandOptionChoiceFillKind)
            CommandFillRequestedEarlier({
              error: CommandTargetListRequired,
              stage: CommandTargetListStage,
            })
          else if (fillKind == SavingThrowOutcomeFillKind)
            CommandFillRequestedEarlier({
              error: CommandTargetListRequired,
              stage: CommandTargetListStage,
            })
          else
            CommandFillNotOrderingError(CommandTargetListAndOptionChoiceStage)
      | CommandTargetListStage =>
          if (fillKind == SpellTargetListFillKind)
            CommandFillAccepted(CommandOptionChoiceStage)
          else
            CommandFillNotOrderingError(CommandTargetListStage)
      | CommandOptionChoiceStage =>
          if (fillKind == CommandOptionChoiceFillKind)
            CommandFillAccepted(CommandSavingThrowOutcomeStage)
          else if (fillKind == SavingThrowOutcomeFillKind)
            CommandFillRequestedEarlier({
              error: CommandOptionChoiceRequired,
              stage: CommandOptionChoiceStage,
            })
          else
            CommandFillNotOrderingError(CommandOptionChoiceStage)
      | CommandSavingThrowOutcomeStage =>
          if (fillKind == SavingThrowOutcomeFillKind)
            CommandFillAccepted(
              commandAfterSavingThrowStage(option, failedSavingThrow, movementAvailable, heldObjectFactsRequired)
            )
          else if (fillKind == MovementFillKind)
            CommandFillRequestedEarlier({
              error: CommandSavingThrowRequired,
              stage: CommandSavingThrowOutcomeStage,
            })
          else
            CommandFillNotOrderingError(CommandSavingThrowOutcomeStage)
      | CommandDropHeldObjectFactsStage =>
          CommandFillNotOrderingError(CommandDropHeldObjectFactsStage)
      | CommandApproachMovementStage =>
          if (fillKind == MovementFillKind)
            CommandFillAccepted(commandAfterMovementStage(option, movedWithinFiveFeetOfCaster, openedOpportunityAttack))
          else
            CommandFillNotOrderingError(CommandApproachMovementStage)
      | CommandFleeMovementStage =>
          if (fillKind == MovementFillKind and movementAvailable)
            CommandFillAccepted(commandAfterMovementStage(option, false, openedOpportunityAttack))
          else if (fillKind == MovementFillKind)
            CommandFillRejected(CommandMovementRequired)
          else
            CommandFillNotOrderingError(CommandFleeMovementStage)
      | CommandResolvedStage =>
          CommandFillNotOrderingError(CommandResolvedStage)
    }
}
