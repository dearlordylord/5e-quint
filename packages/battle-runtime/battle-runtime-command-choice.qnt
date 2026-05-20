// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMMAND.OPTION_AND_NEXT_TURN
module battleRuntimeCommandChoice {
  type CommandGrovelFollowOutcome =
    | CommandGrovelIgnored
    | CommandGrovelAppliesProneEndsTurn

  type CommandDropFollowOutcome =
    | CommandDropIgnored
    | CommandDropObjectsAndEndsTurn({ droppedObjectCount: int })

  type CommandHaltFollowOutcome =
    | CommandHaltIgnored
    | CommandHaltSuppressesActionBonusAndMovement

  type CommandApproachFollowOutcome =
    | CommandApproachNoMovement
    | CommandApproachMovementRejected
    | CommandApproachMovementContinues
    | CommandApproachMovementEndsTurn

  type CommandFleeFollowOutcome =
    | CommandFleeNoMovementEndsTurn
    | CommandFleeMovementRejected
    | CommandFleeOpportunityAttackContinuation
    | CommandFleeMovementEndsTurn

  pure def commandGrovelFollowOutcome(hasPendingCommand: bool): CommandGrovelFollowOutcome =
    if (hasPendingCommand) CommandGrovelAppliesProneEndsTurn else CommandGrovelIgnored

  pure def commandDropFollowOutcome(hasPendingCommand: bool, heldObjectCount: int): CommandDropFollowOutcome =
    if (hasPendingCommand and heldObjectCount >= 0)
      CommandDropObjectsAndEndsTurn({ droppedObjectCount: heldObjectCount })
    else
      CommandDropIgnored

  pure def commandHaltFollowOutcome(hasPendingCommand: bool): CommandHaltFollowOutcome =
    if (hasPendingCommand) CommandHaltSuppressesActionBonusAndMovement else CommandHaltIgnored

  pure def commandApproachFollowOutcome(
    hasMovementAvailable: bool,
    movementCanBeSpent: bool,
    movedWithinFiveFeetOfCaster: bool,
  ): CommandApproachFollowOutcome =
    if (not(hasMovementAvailable))
      CommandApproachNoMovement
    else if (not(movementCanBeSpent))
      CommandApproachMovementRejected
    else if (movedWithinFiveFeetOfCaster)
      CommandApproachMovementEndsTurn
    else
      CommandApproachMovementContinues

  pure def commandFleeFollowOutcome(
    hasMovementAvailable: bool,
    movementCost: int,
    movementRemaining: int,
    movementCanBeSpent: bool,
    provokesOpportunityAttack: bool,
  ): CommandFleeFollowOutcome =
    if (not(hasMovementAvailable))
      CommandFleeNoMovementEndsTurn
    else if (movementCost != movementRemaining or not(movementCanBeSpent))
      CommandFleeMovementRejected
    else if (provokesOpportunityAttack)
      CommandFleeOpportunityAttackContinuation
    else
      CommandFleeMovementEndsTurn
}
