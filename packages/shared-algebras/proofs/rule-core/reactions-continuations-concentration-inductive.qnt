// -*- mode: Bluespec; -*-
// RAW-COVERAGE: verification-owner:qnt-proof RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-004 RAW-PTG-REACTIONS-005 RAW-PTG-REACTIONS-006 RAW-RULES-GLOSSARY-CONCENTRATION-DAMAGE-001

module reactionsContinuationsConcentrationInductive {
  import attackDamageComposition.* from "./attack-damage-composition"
  import hitPointDamage.* from "./hit-point-damage"
  import actionTurnProcedures.* from "./action-turn-procedures"
  import movementSpatialGrapple.* from "./movement-spatial-grapple"
  import reactionsContinuationsConcentration.* from "./reactions-continuations-concentration"

  var qInterruptedActionQuota: ActionQuota
  var qInterruptedBonusActionAvailable: bool
  var qInterruptedReactionAvailable: bool
  var qInterruptedDashMovementBonusFeet: int
  var qInterruptedDisengaged: bool
  var qInterruptedDodging: bool
  var qInterruptedHidden: bool
  var qInterruptedHelpAttackHeld: bool
  var qInterruptedReadiedMovementHeld: bool
  var qInterruptedStartOfTurnHookActive: bool
  var qInterruptedEndOfTurnHookActive: bool
  var qInterruptedCurrentActorOwnsTurn: bool
  var qInterruptedSpeedFeet: int
  var qInterruptedMovementSpentFeet: int
  var qInterruptedProne: bool
  var qInterruptedGrapple: GrappleState
  var qReactorActionQuota: ActionQuota
  var qReactorBonusActionAvailable: bool
  var qReactorReactionAvailable: bool
  var qReactorDashMovementBonusFeet: int
  var qReactorDisengaged: bool
  var qReactorDodging: bool
  var qReactorHidden: bool
  var qReactorHelpAttackHeld: bool
  var qReactorReadiedMovementHeld: bool
  var qReactorStartOfTurnHookActive: bool
  var qReactorEndOfTurnHookActive: bool
  var qReactorCurrentActorOwnsTurn: bool
  var qReactorSpeedFeet: int
  var qReactorMovementSpentFeet: int
  var qReactorProne: bool
  var qReactorGrapple: GrappleState
  var qReactionWindow: ReactionWindowState
  var qInterruptedConcentration: ConcentrationState
  var qReactorConcentration: ConcentrationState

  pure def qInterruptedActorTurn: TurnProcedureState = {
    actionQuota: qInterruptedActionQuota,
    bonusActionAvailable: qInterruptedBonusActionAvailable,
    reactionAvailable: qInterruptedReactionAvailable,
    dashMovementBonusFeet: qInterruptedDashMovementBonusFeet,
    disengaged: qInterruptedDisengaged,
    dodging: qInterruptedDodging,
    hidden: qInterruptedHidden,
    helpAttackHeld: qInterruptedHelpAttackHeld,
    readiedMovementHeld: qInterruptedReadiedMovementHeld,
    startOfTurnHookActive: qInterruptedStartOfTurnHookActive,
    endOfTurnHookActive: qInterruptedEndOfTurnHookActive,
    currentActorOwnsTurn: qInterruptedCurrentActorOwnsTurn,
  }

  pure def qReactorTurn: TurnProcedureState = {
    actionQuota: qReactorActionQuota,
    bonusActionAvailable: qReactorBonusActionAvailable,
    reactionAvailable: qReactorReactionAvailable,
    dashMovementBonusFeet: qReactorDashMovementBonusFeet,
    disengaged: qReactorDisengaged,
    dodging: qReactorDodging,
    hidden: qReactorHidden,
    helpAttackHeld: qReactorHelpAttackHeld,
    readiedMovementHeld: qReactorReadiedMovementHeld,
    startOfTurnHookActive: qReactorStartOfTurnHookActive,
    endOfTurnHookActive: qReactorEndOfTurnHookActive,
    currentActorOwnsTurn: qReactorCurrentActorOwnsTurn,
  }

  pure def qInterruptedActor: MovementGrappleState = {
    turn: qInterruptedActorTurn,
    speedFeet: qInterruptedSpeedFeet,
    movementSpentFeet: qInterruptedMovementSpentFeet,
    prone: qInterruptedProne,
    grapple: qInterruptedGrapple,
  }

  pure def qReactor: MovementGrappleState = {
    turn: qReactorTurn,
    speedFeet: qReactorSpeedFeet,
    movementSpentFeet: qReactorMovementSpentFeet,
    prone: qReactorProne,
    grapple: qReactorGrapple,
  }

  pure def qReactionProtocolState: ReactionProtocolState = {
    interruptedActor: qInterruptedActor,
    reactor: qReactor,
    reactionWindow: qReactionWindow,
    concentration: {
      interruptedActor: qInterruptedConcentration,
      reactor: qReactorConcentration,
    },
  }

  action init = recordReactionProtocolState(initialReactionProtocolState)

  action recordReactionProtocolState(state: ReactionProtocolState): bool = all {
    qInterruptedActionQuota' = state.interruptedActor.turn.actionQuota,
    qInterruptedBonusActionAvailable' = state.interruptedActor.turn.bonusActionAvailable,
    qInterruptedReactionAvailable' = state.interruptedActor.turn.reactionAvailable,
    qInterruptedDashMovementBonusFeet' = state.interruptedActor.turn.dashMovementBonusFeet,
    qInterruptedDisengaged' = state.interruptedActor.turn.disengaged,
    qInterruptedDodging' = state.interruptedActor.turn.dodging,
    qInterruptedHidden' = state.interruptedActor.turn.hidden,
    qInterruptedHelpAttackHeld' = state.interruptedActor.turn.helpAttackHeld,
    qInterruptedReadiedMovementHeld' = state.interruptedActor.turn.readiedMovementHeld,
    qInterruptedStartOfTurnHookActive' = state.interruptedActor.turn.startOfTurnHookActive,
    qInterruptedEndOfTurnHookActive' = state.interruptedActor.turn.endOfTurnHookActive,
    qInterruptedCurrentActorOwnsTurn' = state.interruptedActor.turn.currentActorOwnsTurn,
    qInterruptedSpeedFeet' = state.interruptedActor.speedFeet,
    qInterruptedMovementSpentFeet' = state.interruptedActor.movementSpentFeet,
    qInterruptedProne' = state.interruptedActor.prone,
    qInterruptedGrapple' = state.interruptedActor.grapple,
    qReactorActionQuota' = state.reactor.turn.actionQuota,
    qReactorBonusActionAvailable' = state.reactor.turn.bonusActionAvailable,
    qReactorReactionAvailable' = state.reactor.turn.reactionAvailable,
    qReactorDashMovementBonusFeet' = state.reactor.turn.dashMovementBonusFeet,
    qReactorDisengaged' = state.reactor.turn.disengaged,
    qReactorDodging' = state.reactor.turn.dodging,
    qReactorHidden' = state.reactor.turn.hidden,
    qReactorHelpAttackHeld' = state.reactor.turn.helpAttackHeld,
    qReactorReadiedMovementHeld' = state.reactor.turn.readiedMovementHeld,
    qReactorStartOfTurnHookActive' = state.reactor.turn.startOfTurnHookActive,
    qReactorEndOfTurnHookActive' = state.reactor.turn.endOfTurnHookActive,
    qReactorCurrentActorOwnsTurn' = state.reactor.turn.currentActorOwnsTurn,
    qReactorSpeedFeet' = state.reactor.speedFeet,
    qReactorMovementSpentFeet' = state.reactor.movementSpentFeet,
    qReactorProne' = state.reactor.prone,
    qReactorGrapple' = state.reactor.grapple,
    qReactionWindow' = state.reactionWindow,
    qInterruptedConcentration' = state.concentration.interruptedActor,
    qReactorConcentration' = state.concentration.reactor,
  }

  action doOfferOpportunityAttack = {
    nondet hostileCreature = Set(true, false).oneOf()
    nondet observerCanSee = Set(true, false).oneOf()
    nondet leavesReach = Set(true, false).oneOf()
    nondet movementResource = Set(
      OwnMovementActionBonusReactionOrSpeed,
      TeleportResource,
      ForcedMovementNoOwnResource
    ).oneOf()
    all {
      recordReactionProtocolState(offerOpportunityAttackReaction(qReactionProtocolState, {
        hostileCreature: hostileCreature,
        observerCanSee: observerCanSee,
        leavesReach: leavesReach,
        movementResource: movementResource,
      })),
    }
  }

  action doOfferDamageInterruption = {
    nondet effectiveDamage = Set(0, 1, 12, 80).oneOf()
    all {
      recordReactionProtocolState(offerDamageInterruptionReaction(qReactionProtocolState, effectiveDamage)),
    }
  }

  action doOfferReadiedMovement = all {
    recordReactionProtocolState(qReactionProtocolState.with(
      "reactionWindow",
      offerReactionWindow(
        qReactionWindow,
        ReadiedMovementReactionWindow
      )
    )),
  }

  action doDecline = {
    val choice = resolveReactionChoice(qReactorTurn, qReactionWindow, DeclineReaction)
    all {
      recordReactionProtocolState(qReactionProtocolState
        .with("reactor", qReactor.with("turn", choice.turn))
        .with("reactionWindow", choice.reactionWindow)),
    }
  }

  action doTakeOpportunityAttackReaction = {
    val choice = resolveReactionChoice(
      qReactorTurn,
      qReactionWindow,
      TakeOpportunityAttackReaction
    )
    all {
      recordReactionProtocolState(qReactionProtocolState
        .with("reactor", qReactor.with("turn", choice.turn))
        .with("reactionWindow", choice.reactionWindow)),
    }
  }

  action doTakeDamageInterruptionReaction = {
    val choice = resolveReactionChoice(
      qReactorTurn,
      qReactionWindow,
      TakeDamageInterruptionReaction
    )
    all {
      recordReactionProtocolState(qReactionProtocolState
        .with("reactor", qReactor.with("turn", choice.turn))
        .with("reactionWindow", choice.reactionWindow)),
    }
  }

  action doTakeReadiedMovementReaction = {
    nondet distanceFeet = Set(0, 5, 10).oneOf()
    all {
      recordReactionProtocolState(resolveReadiedMovementReaction(qReactionProtocolState, {
        distanceFeet: distanceFeet,
        extraCostFeet: 0,
      })),
    }
  }

  action doStartConcentration = {
    nondet canConcentrate = Set(true, false).oneOf()
    nondet actor = Set(InterruptedActor, Reactor).oneOf()
    all {
      recordReactionProtocolState(qReactionProtocolState.with(
        "concentration",
        startConcentration(qReactionProtocolState.concentration, actor, canConcentrate)
      )),
    }
  }

  action doBreakPreventedConcentration = {
    nondet incapacitatedOrDead = Set(true, false).oneOf()
    nondet actor = Set(InterruptedActor, Reactor).oneOf()
    all {
      recordReactionProtocolState(qReactionProtocolState.with(
        "concentration",
        breakConcentrationIfPrevented(
          qReactionProtocolState.concentration,
          actor,
          incapacitatedOrDead
        )
      )),
    }
  }

  action doDamageConcentration = {
    nondet effectiveDamage = Set(0, 8, 22, 80).oneOf()
    nondet saveSucceeded = Set(true, false).oneOf()
    nondet actor = Set(InterruptedActor, Reactor).oneOf()
    val result = resolveConcentrationAfterDamage(
      concentrationForActor(qReactionProtocolState.concentration, actor),
      effectiveDamage,
      saveSucceeded
    )
    all {
      recordReactionProtocolState(qReactionProtocolState.with(
        "concentration",
        setConcentrationForActor(
          qReactionProtocolState.concentration,
          actor,
          result.concentration
        )
      )),
    }
  }

  action doApplyDamageWithConcentrationInterruption = {
    nondet targetVitals = Set(
      {
        kind: PlayerCharacter,
        hitPoints: 8,
        hitPointMaximum: 8,
        temporaryHitPoints: 0,
        dead: false,
        unconscious: false,
      },
      {
        kind: PlayerCharacter,
        hitPoints: 8,
        hitPointMaximum: 8,
        temporaryHitPoints: 3,
        dead: false,
        unconscious: false,
      },
      {
        kind: PlayerCharacter,
        hitPoints: 0,
        hitPointMaximum: 8,
        temporaryHitPoints: 0,
        dead: false,
        unconscious: true,
      },
      {
        kind: PlayerCharacter,
        hitPoints: 0,
        hitPointMaximum: 8,
        temporaryHitPoints: 0,
        dead: true,
        unconscious: true,
      }
    ).oneOf()
    nondet effectiveDamage = Set(0, 8, 22).oneOf()
    nondet saveSucceeded = Set(true, false).oneOf()
    nondet targetActor = Set(InterruptedActor, Reactor).oneOf()
    all {
      recordReactionProtocolState(applyDamageTargetWithConcentrationInterruption(
        qReactionProtocolState,
        {
          actor: targetActor,
          vitals: targetVitals,
        },
        effectiveDamage,
        saveSucceeded
      )),
    }
  }

  action doStartReactorTurn = all {
    recordReactionProtocolState(qReactionProtocolState.with(
      "reactor",
      startMovementTurn(qReactor)
    )),
  }

  action doAdvanceContinuation = all {
    recordReactionProtocolState(qReactionProtocolState.with(
      "reactionWindow",
      advanceContinuation(qReactionWindow)
    )),
  }

  action doReset = all {
    recordReactionProtocolState(initialReactionProtocolState),
  }

  // Branch budget: 24 Opportunity Attack fact choices + 4 damage offers +
  // 1 Readied Movement offer + 1 Decline + 2 direct reaction choices +
  // 3 Readied Movement choices + 4 concentration starts +
  // 4 incapacitated/dead concentration checks + 16 damage-save choices +
  // 48 integrated damage/concentration/interruption choices +
  // Start/Advance/Reset singletons = 111 transition choices.
  action step = any {
    doOfferOpportunityAttack,
    doOfferDamageInterruption,
    doOfferReadiedMovement,
    doDecline,
    doTakeOpportunityAttackReaction,
    doTakeDamageInterruptionReaction,
    doTakeReadiedMovementReaction,
    doStartConcentration,
    doBreakPreventedConcentration,
    doDamageConcentration,
    doApplyDamageWithConcentrationInterruption,
    doStartReactorTurn,
    doAdvanceContinuation,
    doReset,
  }

  val invariant = all {
    qInterruptedActionQuota.in(Set(ActionAvailable, ActionSpent)),
    qInterruptedBonusActionAvailable.in(Set(true, false)),
    qInterruptedReactionAvailable.in(Set(true, false)),
    qInterruptedDashMovementBonusFeet.in(0.to(80)),
    qInterruptedDisengaged.in(Set(true, false)),
    qInterruptedDodging.in(Set(true, false)),
    qInterruptedHidden.in(Set(true, false)),
    qInterruptedHelpAttackHeld.in(Set(true, false)),
    qInterruptedReadiedMovementHeld.in(Set(true, false)),
    qInterruptedStartOfTurnHookActive.in(Set(true, false)),
    qInterruptedEndOfTurnHookActive.in(Set(true, false)),
    qInterruptedCurrentActorOwnsTurn.in(Set(true, false)),
    qInterruptedSpeedFeet.in(0.to(40)),
    qInterruptedMovementSpentFeet.in(0.to(120)),
    qInterruptedProne.in(Set(true, false)),
    qInterruptedGrapple.in(legalGrappleStates),
    qReactorActionQuota.in(Set(ActionAvailable, ActionSpent)),
    qReactorBonusActionAvailable.in(Set(true, false)),
    qReactorReactionAvailable.in(Set(true, false)),
    qReactorDashMovementBonusFeet.in(0.to(80)),
    qReactorDisengaged.in(Set(true, false)),
    qReactorDodging.in(Set(true, false)),
    qReactorHidden.in(Set(true, false)),
    qReactorHelpAttackHeld.in(Set(true, false)),
    qReactorReadiedMovementHeld.in(Set(true, false)),
    qReactorStartOfTurnHookActive.in(Set(true, false)),
    qReactorEndOfTurnHookActive.in(Set(true, false)),
    qReactorCurrentActorOwnsTurn.in(Set(true, false)),
    qReactorSpeedFeet.in(0.to(40)),
    qReactorMovementSpentFeet.in(0.to(120)),
    qReactorProne.in(Set(true, false)),
    qReactorGrapple.in(legalGrappleStates),
    qReactionWindow.in(legalReactionWindowStates),
    qInterruptedConcentration.in(Set(NoConcentration, Concentrating)),
    qReactorConcentration.in(Set(NoConcentration, Concentrating)),
    legalReactionProtocolState(qReactionProtocolState),
  }
}
