// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: parity-witness BATTLE.COMMAND.OPTION_AND_NEXT_TURN

module battleRuntimeCommandOptionNextTurnMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  // Self-contained literal projection witness for the SRD Command options.
  // Route choice and held-object inventory remain table-owned facts supplied by
  // the paired TypeScript reducer driver.

  type CommandOptionNextTurnScenario =
    | CommandOptionNextTurnInit
    | CommandFailedSaveRecordsPending
    | CommandFollowGrovel
    | CommandFollowDrop
    | CommandHaltSuppresses
    | CommandHaltEndTurnCleanup
    | CommandApproachContinues
    | CommandApproachWithinFiveEndsTurn
    | CommandApproachMovementRejected
    | CommandApproachNoMovementCleanup
    | CommandFleeFullMovementEndsTurn
    | CommandFleePartialMovementRejected
    | CommandFleeNoMovementCleanup
    | CommandFleeOpportunityAttackWindow
    | CommandFleeOpportunityAttackDeclinedContinuation

  var qScenario: CommandOptionNextTurnScenario
  var qProtocol: WitnessProtocol[str]
  var qTargetProne: bool
  var qTargetEffectCount: int
  var qActionAvailable: bool
  var qBonusActionAvailable: bool
  var qMovementSpentFeet: int
  var qCurrentActor: str
  var qPendingCommandOption: str
  var qDroppedObjectCount: int
  var qReactionWindowOpen: bool
  var qHaltSuppressed: bool

  pure val witnessHoleType: str = "CommandOptionNextTurn"
  pure val interruptDecisionHole: str = "InterruptDecision"

  action recordProjection(
    scenario: CommandOptionNextTurnScenario,
    protocol: WitnessProtocol[str],
    targetProne: bool,
    targetEffectCount: int,
    actionAvailable: bool,
    bonusActionAvailable: bool,
    movementSpentFeet: int,
    currentActorName: str,
    pendingOption: str,
    droppedObjectCount: int,
    reactionWindowOpen: bool,
    haltSuppressed: bool,
  ): bool = all {
    qScenario' = scenario,
    qProtocol' = protocol,
    qTargetProne' = targetProne,
    qTargetEffectCount' = targetEffectCount,
    qActionAvailable' = actionAvailable,
    qBonusActionAvailable' = bonusActionAvailable,
    qMovementSpentFeet' = movementSpentFeet,
    qCurrentActor' = currentActorName,
    qPendingCommandOption' = pendingOption,
    qDroppedObjectCount' = droppedObjectCount,
    qReactionWindowOpen' = reactionWindowOpen,
    qHaltSuppressed' = haltSuppressed,
  }

  action init = recordProjection(
    CommandOptionNextTurnInit,
    witnessInit(witnessHoleType),
    false,
    0,
    true,
    true,
    0,
    "Fighter",
    "none",
    0,
    false,
    false,
  )

  action doFailedSaveRecordsPending = all {
    qScenario == CommandOptionNextTurnInit,
    recordProjection(
      CommandFailedSaveRecordsPending,
      witnessResolved(witnessHoleType),
      false,
      1,
      false,
      true,
      0,
      "Fighter",
      "grovel",
      0,
      false,
      false,
    ),
  }

  action doFollowGrovel = all {
    qScenario == CommandFailedSaveRecordsPending,
    recordProjection(
      CommandFollowGrovel,
      witnessResolved(witnessHoleType),
      true,
      0,
      true,
      true,
      0,
      "Fighter",
      "none",
      0,
      false,
      false,
    ),
  }

  action doFollowDrop = all {
    qScenario == CommandFollowGrovel,
    recordProjection(
      CommandFollowDrop,
      witnessResolved(witnessHoleType),
      false,
      0,
      true,
      true,
      0,
      "Fighter",
      "none",
      1,
      false,
      false,
    ),
  }

  action doHaltSuppresses = all {
    qScenario == CommandFollowDrop,
    recordProjection(
      CommandHaltSuppresses,
      witnessResolved(witnessHoleType),
      false,
      1,
      false,
      false,
      30,
      "Goblin",
      "halt",
      0,
      false,
      true,
    ),
  }

  action doHaltEndTurnCleanup = all {
    qScenario == CommandHaltSuppresses,
    recordProjection(
      CommandHaltEndTurnCleanup,
      witnessResolved(witnessHoleType),
      false,
      0,
      true,
      true,
      30,
      "Fighter",
      "none",
      0,
      false,
      false,
    ),
  }

  action doApproachContinues = all {
    qScenario == CommandHaltEndTurnCleanup,
    recordProjection(
      CommandApproachContinues,
      witnessResolved(witnessHoleType),
      false,
      0,
      true,
      true,
      10,
      "Goblin",
      "none",
      0,
      false,
      false,
    ),
  }

  action doApproachWithinFiveEndsTurn = all {
    qScenario == CommandApproachContinues,
    recordProjection(
      CommandApproachWithinFiveEndsTurn,
      witnessResolved(witnessHoleType),
      false,
      0,
      true,
      true,
      10,
      "Fighter",
      "none",
      0,
      false,
      false,
    ),
  }

  action doApproachNoMovementCleanup = all {
    qScenario == CommandApproachMovementRejected,
    recordProjection(
      CommandApproachNoMovementCleanup,
      witnessResolved(witnessHoleType),
      false,
      0,
      true,
      true,
      0,
      "Goblin",
      "none",
      0,
      false,
      false,
    ),
  }

  action doApproachMovementRejected = all {
    qScenario == CommandApproachWithinFiveEndsTurn,
    recordProjection(
      CommandApproachMovementRejected,
      witnessInvalid(witnessHoleType, WInvalidFill),
      false,
      1,
      true,
      true,
      0,
      "Goblin",
      "approach",
      0,
      false,
      false,
    ),
  }

  action doFleeFullMovementEndsTurn = all {
    qScenario == CommandApproachNoMovementCleanup,
    recordProjection(
      CommandFleeFullMovementEndsTurn,
      witnessResolved(witnessHoleType),
      false,
      0,
      true,
      true,
      30,
      "Fighter",
      "none",
      0,
      false,
      false,
    ),
  }

  action doFleePartialMovementRejected = all {
    qScenario == CommandFleeFullMovementEndsTurn,
    recordProjection(
      CommandFleePartialMovementRejected,
      witnessInvalid(witnessHoleType, WInvalidFill),
      false,
      1,
      true,
      true,
      0,
      "Goblin",
      "flee",
      0,
      false,
      false,
    ),
  }

  action doFleeNoMovementCleanup = all {
    qScenario == CommandFleePartialMovementRejected,
    recordProjection(
      CommandFleeNoMovementCleanup,
      witnessResolved(witnessHoleType),
      false,
      0,
      true,
      true,
      0,
      "Fighter",
      "none",
      0,
      false,
      false,
    ),
  }

  action doFleeOpportunityAttackWindow = all {
    qScenario == CommandFleeNoMovementCleanup,
    recordProjection(
      CommandFleeOpportunityAttackWindow,
      witnessNeedsHoles(Set(interruptDecisionHole)),
      false,
      1,
      true,
      true,
      0,
      "Goblin",
      "flee",
      0,
      true,
      false,
    ),
  }

  action doFleeOpportunityAttackDeclinedContinuation = all {
    qScenario == CommandFleeOpportunityAttackWindow,
    recordProjection(
      CommandFleeOpportunityAttackDeclinedContinuation,
      witnessResolved(witnessHoleType),
      false,
      0,
      true,
      true,
      30,
      "Fighter",
      "none",
      0,
      false,
      false,
    ),
  }

  action doComplete = all {
    qScenario == CommandFleeOpportunityAttackDeclinedContinuation,
    recordProjection(
      qScenario,
      qProtocol,
      qTargetProne,
      qTargetEffectCount,
      qActionAvailable,
      qBonusActionAvailable,
      qMovementSpentFeet,
      qCurrentActor,
      qPendingCommandOption,
      qDroppedObjectCount,
      qReactionWindowOpen,
      qHaltSuppressed,
    ),
  }

  action step = any {
    doFailedSaveRecordsPending,
    doFollowGrovel,
    doFollowDrop,
    doHaltSuppresses,
    doHaltEndTurnCleanup,
    doApproachContinues,
    doApproachWithinFiveEndsTurn,
    doApproachMovementRejected,
    doApproachNoMovementCleanup,
    doFleeFullMovementEndsTurn,
    doFleePartialMovementRejected,
    doFleeNoMovementCleanup,
    doFleeOpportunityAttackWindow,
    doFleeOpportunityAttackDeclinedContinuation,
    doComplete,
  }
}
