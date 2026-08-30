// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.COMMAND.OPTION_AND_NEXT_TURN BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING

module battleRuntimeCompelledNextTurnBehavior {
  type CompelledGrovelOutcome =
    | CompelledGrovelIgnored
    | CompelledGrovelAppliesProneEndsTurn

  type CompelledDropOutcome =
    | CompelledDropIgnored
    | CompelledDropObjectsAndEndsTurn({ droppedObjectCount: int })

  type CompelledHaltOutcome =
    | CompelledHaltIgnored
    | CompelledHaltSuppressesActionBonusAndMovement

  type CompelledApproachOutcome =
    | CompelledApproachNoMovement
    | CompelledApproachMovementRejected
    | CompelledApproachMovementContinues
    | CompelledApproachMovementEndsTurn

  type CompelledFleeOutcome =
    | CompelledFleeNoMovementEndsTurn
    | CompelledFleeMovementRejected
    | CompelledFleeReactionContinuation
    | CompelledFleeMovementEndsTurn

  pure def compelledBehaviorMaximumTargets(slotLevel: int): int =
    if (slotLevel < 1) 0 else slotLevel

  pure def compelledGrovelOutcome(hasPendingBehavior: bool): CompelledGrovelOutcome =
    if (hasPendingBehavior)
      CompelledGrovelAppliesProneEndsTurn
    else
      CompelledGrovelIgnored

  pure def compelledDropOutcome(
    hasPendingBehavior: bool,
    heldObjectCount: int,
  ): CompelledDropOutcome =
    if (hasPendingBehavior and heldObjectCount >= 0)
      CompelledDropObjectsAndEndsTurn({ droppedObjectCount: heldObjectCount })
    else
      CompelledDropIgnored

  pure def compelledHaltOutcome(hasPendingBehavior: bool): CompelledHaltOutcome =
    if (hasPendingBehavior)
      CompelledHaltSuppressesActionBonusAndMovement
    else
      CompelledHaltIgnored

  pure def compelledApproachOutcome(
    hasMovementAvailable: bool,
    movementCanBeSpent: bool,
    movedWithinRequiredDistance: bool,
  ): CompelledApproachOutcome =
    if (not(hasMovementAvailable))
      CompelledApproachNoMovement
    else if (not(movementCanBeSpent))
      CompelledApproachMovementRejected
    else if (movedWithinRequiredDistance)
      CompelledApproachMovementEndsTurn
    else
      CompelledApproachMovementContinues

  pure def compelledFleeOutcome(
    hasMovementAvailable: bool,
    movementCost: int,
    movementRemaining: int,
    movementCanBeSpent: bool,
    opensReaction: bool,
  ): CompelledFleeOutcome =
    if (not(hasMovementAvailable))
      CompelledFleeNoMovementEndsTurn
    else if (movementCost != movementRemaining or not(movementCanBeSpent))
      CompelledFleeMovementRejected
    else if (opensReaction)
      CompelledFleeReactionContinuation
    else
      CompelledFleeMovementEndsTurn

  type CompelledBehaviorFrontierStage =
    | CompelledActSelectionStage
    | CompelledTargetListAndBehaviorChoiceStage
    | CompelledTargetListStage
    | CompelledBehaviorChoiceStage
    | CompelledSavingThrowOutcomeStage
    | CompelledHeldObjectFactsStage
    | CompelledApproachMovementStage
    | CompelledFleeMovementStage
    | CompelledResolvedStage

  type CompelledBehaviorOption =
    | CompelledGrovelOption
    | CompelledDropOption
    | CompelledHaltOption
    | CompelledApproachOption
    | CompelledFleeOption

  type CompelledBehaviorHoleKind =
    | CompelledTargetListHole
    | CompelledBehaviorChoiceHole
    | CompelledSavingThrowOutcomeHole
    | CompelledMovementHole

  type CompelledBehaviorFillKind =
    | CompelledTargetListFill
    | CompelledBehaviorChoiceFill
    | CompelledSavingThrowOutcomeFill
    | CompelledMovementFill
    | CompelledOtherFill

  type CompelledBehaviorOrderingError =
    | CompelledTargetListRequired
    | CompelledBehaviorChoiceRequired
    | CompelledSavingThrowRequired
    | CompelledHeldObjectFactsRequired
    | CompelledMovementRequired

  type CompelledBehaviorFillOrderResult =
    | CompelledFillAccepted(CompelledBehaviorFrontierStage)
    | CompelledFillRequestedEarlier({
        error: CompelledBehaviorOrderingError,
        stage: CompelledBehaviorFrontierStage,
      })
    | CompelledFillRejected(CompelledBehaviorOrderingError)
    | CompelledFillNotOrderingError(CompelledBehaviorFrontierStage)

  pure def compelledBehaviorHoleFrontier(
    stage: CompelledBehaviorFrontierStage,
  ): Set[CompelledBehaviorHoleKind] =
    match stage {
      | CompelledActSelectionStage => Set()
      | CompelledTargetListAndBehaviorChoiceStage =>
          Set(CompelledTargetListHole, CompelledBehaviorChoiceHole)
      | CompelledTargetListStage => Set(CompelledTargetListHole)
      | CompelledBehaviorChoiceStage => Set(CompelledBehaviorChoiceHole)
      | CompelledSavingThrowOutcomeStage => Set(CompelledSavingThrowOutcomeHole)
      | CompelledHeldObjectFactsStage => Set()
      | CompelledApproachMovementStage => Set(CompelledMovementHole)
      | CompelledFleeMovementStage => Set(CompelledMovementHole)
      | CompelledResolvedStage => Set()
    }

  pure def compelledBehaviorHoleFrontierIncludesTableFacts(
    stage: CompelledBehaviorFrontierStage,
  ): bool =
    stage == CompelledHeldObjectFactsStage

  pure def compelledBehaviorAfterSavingThrowStage(
    option: CompelledBehaviorOption,
    failedSavingThrow: bool,
    movementAvailable: bool,
    heldObjectFactsRequired: bool,
  ): CompelledBehaviorFrontierStage =
    if (not(failedSavingThrow))
      CompelledResolvedStage
    else
      match option {
        | CompelledGrovelOption => CompelledResolvedStage
        | CompelledDropOption =>
            if (heldObjectFactsRequired) CompelledHeldObjectFactsStage else CompelledResolvedStage
        | CompelledHaltOption => CompelledResolvedStage
        | CompelledApproachOption =>
            if (movementAvailable) CompelledApproachMovementStage else CompelledResolvedStage
        | CompelledFleeOption =>
            if (movementAvailable) CompelledFleeMovementStage else CompelledResolvedStage
      }

  pure def compelledBehaviorAfterMovementStage: CompelledBehaviorFrontierStage =
    CompelledResolvedStage

  pure def compelledBehaviorFillOrderResult(
    stage: CompelledBehaviorFrontierStage,
    fillKind: CompelledBehaviorFillKind,
    option: CompelledBehaviorOption,
    failedSavingThrow: bool,
    movementAvailable: bool,
    heldObjectFactsRequired: bool,
  ): CompelledBehaviorFillOrderResult =
    match stage {
      | CompelledActSelectionStage =>
          CompelledFillNotOrderingError(CompelledActSelectionStage)
      | CompelledTargetListAndBehaviorChoiceStage =>
          if (fillKind == CompelledTargetListFill)
            CompelledFillAccepted(CompelledBehaviorChoiceStage)
          else if (fillKind == CompelledBehaviorChoiceFill or fillKind == CompelledSavingThrowOutcomeFill)
            CompelledFillRequestedEarlier({
              error: CompelledTargetListRequired,
              stage: CompelledTargetListStage,
            })
          else
            CompelledFillNotOrderingError(CompelledTargetListAndBehaviorChoiceStage)
      | CompelledTargetListStage =>
          if (fillKind == CompelledTargetListFill)
            CompelledFillAccepted(CompelledBehaviorChoiceStage)
          else
            CompelledFillNotOrderingError(CompelledTargetListStage)
      | CompelledBehaviorChoiceStage =>
          if (fillKind == CompelledBehaviorChoiceFill)
            CompelledFillAccepted(CompelledSavingThrowOutcomeStage)
          else if (fillKind == CompelledSavingThrowOutcomeFill)
            CompelledFillRequestedEarlier({
              error: CompelledBehaviorChoiceRequired,
              stage: CompelledBehaviorChoiceStage,
            })
          else
            CompelledFillNotOrderingError(CompelledBehaviorChoiceStage)
      | CompelledSavingThrowOutcomeStage =>
          if (fillKind == CompelledSavingThrowOutcomeFill)
            CompelledFillAccepted(compelledBehaviorAfterSavingThrowStage(
              option,
              failedSavingThrow,
              movementAvailable,
              heldObjectFactsRequired,
            ))
          else if (fillKind == CompelledMovementFill)
            CompelledFillRequestedEarlier({
              error: CompelledSavingThrowRequired,
              stage: CompelledSavingThrowOutcomeStage,
            })
          else
            CompelledFillNotOrderingError(CompelledSavingThrowOutcomeStage)
      | CompelledHeldObjectFactsStage =>
          CompelledFillNotOrderingError(CompelledHeldObjectFactsStage)
      | CompelledApproachMovementStage =>
          if (fillKind == CompelledMovementFill)
            CompelledFillAccepted(compelledBehaviorAfterMovementStage)
          else
            CompelledFillNotOrderingError(CompelledApproachMovementStage)
      | CompelledFleeMovementStage =>
          if (fillKind == CompelledMovementFill and movementAvailable)
            CompelledFillAccepted(compelledBehaviorAfterMovementStage)
          else if (fillKind == CompelledMovementFill)
            CompelledFillRejected(CompelledMovementRequired)
          else
            CompelledFillNotOrderingError(CompelledFleeMovementStage)
      | CompelledResolvedStage =>
          CompelledFillNotOrderingError(CompelledResolvedStage)
    }
}
