// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: parity-witness BATTLE.COMMAND.OPTION_AND_NEXT_TURN

module battleRuntimeCommandOptionNextTurnMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"
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
  var qRoute: List[ReducerRouteEvent]

  pure val witnessHoleType: str = "CommandOptionNextTurn"
  pure val interruptDecisionHole: str = "InterruptDecision"
  pure val noRouteHoles: Set[BattleHoleFamilyKind] = Set()

  pure def commandDiscoverRoute(
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeDiscoverBattleActs(CommandEffectRouteSubject, holes, owner)

  pure def commandResolveRoute(
    fill: BattleFillKind,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubject(CommandEffectRouteSubject, fill, holes, owner)

  pure def commandResolveWithoutFillRoute(
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubjectWithoutFill(
      CommandEffectRouteSubject,
      noRouteHoles,
      owner,
    )

  pure def forcedMovementResolveRoute(
    fill: BattleFillKind,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubject(ForcedMovementRouteSubject, fill, holes, owner)

  pure def forcedMovementResolveWithoutFillRoute(
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubjectWithoutFill(
      ForcedMovementRouteSubject,
      noRouteHoles,
      owner,
    )

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
    route: List[ReducerRouteEvent],
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
    qRoute' = route,
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
    List(routeStartBattle(BattleActionEconomyOwner)),
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
      qRoute.concat(List(
        commandDiscoverRoute(
          Set(SpellTargetListHoleKind, CommandOptionChoiceHoleKind),
          BattleSpellSlotAndActionEconomyOwner,
        ),
        commandResolveRoute(
          CommandOptionChoiceFillKind,
          Set(SavingThrowOutcomeHoleKind),
          BattleHoleFrontierOwner,
        ),
        commandResolveRoute(
          SavingThrowOutcomeFillKind,
          noRouteHoles,
          BattleActiveEffectOwner,
        ),
      )),
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
      qRoute.append(commandResolveWithoutFillRoute(BattleConditionLifecycleOwner)),
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
      qRoute.append(commandResolveWithoutFillRoute(BattleActiveEffectOwner)),
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
      qRoute.append(commandResolveWithoutFillRoute(BattleActiveEffectOwner)),
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
      qRoute.append(commandResolveWithoutFillRoute(BattleActiveEffectOwner)),
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
      qRoute.concat(List(
        commandDiscoverRoute(
          Set(MovementHoleKind),
          BattleActiveEffectOwner,
        ),
        commandResolveRoute(
          MovementFillKind,
          noRouteHoles,
          BattleMovementResourceOwner,
        ),
      )),
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
      qRoute.concat(List(
        commandDiscoverRoute(
          Set(MovementHoleKind),
          BattleActiveEffectOwner,
        ),
        commandResolveRoute(
          MovementFillKind,
          noRouteHoles,
          BattleMovementResourceOwner,
        ),
      )),
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
      qRoute.append(commandResolveWithoutFillRoute(BattleMovementResourceOwner)),
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
      qRoute.concat(List(
        commandDiscoverRoute(
          Set(MovementHoleKind),
          BattleActiveEffectOwner,
        ),
        commandResolveRoute(
          MovementFillKind,
          noRouteHoles,
          BattleMovementResourceOwner,
        ),
      )),
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
      qRoute.concat(List(
        commandDiscoverRoute(
          Set(MovementHoleKind),
          BattleActiveEffectOwner,
        ),
        commandResolveRoute(
          MovementFillKind,
          noRouteHoles,
          BattleMovementResourceOwner,
        ),
        forcedMovementResolveRoute(
          MovementFillKind,
          noRouteHoles,
          BattleMovementResourceOwner,
        ),
        forcedMovementResolveWithoutFillRoute(
          BattleActionEconomyOwner,
        ),
        forcedMovementResolveWithoutFillRoute(
          BattleInterruptStackOwner,
        ),
        forcedMovementResolveWithoutFillRoute(
          BattleActiveEffectOwner,
        ),
        forcedMovementResolveWithoutFillRoute(
          BattleTurnBoundaryOwner,
        ),
      )),
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
      qRoute.concat(List(
        commandDiscoverRoute(
          Set(MovementHoleKind),
          BattleActiveEffectOwner,
        ),
        commandResolveRoute(
          MovementFillKind,
          Set(MovementHoleKind),
          BattleHoleFrontierOwner,
        ),
      )),
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
      qRoute.append(commandResolveWithoutFillRoute(BattleMovementResourceOwner)),
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
      qRoute.concat(List(
        commandDiscoverRoute(
          Set(MovementHoleKind),
          BattleActiveEffectOwner,
        ),
        commandResolveRoute(
          MovementFillKind,
          Set(InterruptDecisionHoleKind),
          BattleInterruptStackOwner,
        ),
      )),
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
      qRoute.append(
        routeResolveBattleInterrupt(
          InterruptStackResumeRouteSubject,
          InterruptDecisionFillKind,
          noRouteHoles,
          BattleInterruptStackOwner,
        )
      ),
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
      qRoute,
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
