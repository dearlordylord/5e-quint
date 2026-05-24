// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-004 RAW-PTG-REACTIONS-005 RAW-PTG-REACTIONS-006 RAW-RULES-GLOSSARY-CONCENTRATION-DAMAGE-001
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.reaction-roll-or-damage-reduction spell.reaction-shield spell.readied-action-time-spell
// KERNEL-COVERAGE: qnt-owner BATTLE.REACTION.OFFER_DECLINE_RESUME

module reactionsContinuationsConcentration {
  import hitPointDamage.* from "./hit-point-damage"
  import actionTurnProcedures.* from "./action-turn-procedures"
  import movementSpatialGrapple.* from "./movement-spatial-grapple"

  type ReactionWindowKind =
    | OpportunityAttackReactionWindow
    | DamageInterruptionReactionWindow
    | ReadiedMovementReactionWindow
    | ReadiedSpellReactionWindow
    | StatBlockReactionWindow

  type SuspendedReactionWindowKind =
    | NoSuspendedReactionWindow
    | SuspendedOpportunityAttackReactionWindow
    | SuspendedDamageInterruptionReactionWindow
    | SuspendedReadiedMovementReactionWindow
    | SuspendedReadiedSpellReactionWindow
    | SuspendedStatBlockReactionWindow

  type ReactionWindowState =
    | NoReactionWindow
    | OfferedOpportunityAttackWindow({ suspended: SuspendedReactionWindowKind })
    | OfferedDamageInterruptionWindow({ suspended: SuspendedReactionWindowKind })
    | OfferedReadiedMovementWindow({ suspended: SuspendedReactionWindowKind })
    | OfferedReadiedSpellWindow({ suspended: SuspendedReactionWindowKind })
    | OfferedStatBlockReactionWindow({ suspended: SuspendedReactionWindowKind })

  type ReactionChoice =
    | DeclineReaction
    | TakeOpportunityAttackReaction
    | TakeDamageInterruptionReaction
    | TakeReadiedMovementReaction
    | TakeReadiedSpellReaction
    | TakeStatBlockReaction

  type ConcentrationState =
    | NoConcentration
    | Concentrating

  type ReactionProtocolActor =
    | InterruptedActor
    | Reactor

  type ActorConcentrationState = {
    interruptedActor: ConcentrationState,
    reactor: ConcentrationState,
  }

  type ConcentrationDamageTarget = {
    actor: ReactionProtocolActor,
    vitals: CreatureVitals,
  }

  type ConcentrationDamageResult = {
    concentration: ConcentrationState,
    saveRequired: bool,
    saveDc: int,
  }

  type ReactionProtocolState = {
    interruptedActor: MovementGrappleState,
    reactor: MovementGrappleState,
    reactionWindow: ReactionWindowState,
    concentration: ActorConcentrationState,
  }

  pure def maximumReactionWindowDepth: int = 2

  pure def suspendedReactionWindowKinds: Set[SuspendedReactionWindowKind] = Set(
    NoSuspendedReactionWindow,
    SuspendedOpportunityAttackReactionWindow,
    SuspendedDamageInterruptionReactionWindow,
    SuspendedReadiedMovementReactionWindow,
    SuspendedReadiedSpellReactionWindow,
    SuspendedStatBlockReactionWindow
  )

  pure def legalReactionWindowStates: Set[ReactionWindowState] =
    Set(NoReactionWindow)
      .union(suspendedReactionWindowKinds
        .map(suspended => OfferedOpportunityAttackWindow({ suspended: suspended })))
      .union(suspendedReactionWindowKinds
        .map(suspended => OfferedDamageInterruptionWindow({ suspended: suspended })))
      .union(suspendedReactionWindowKinds
        .map(suspended => OfferedReadiedMovementWindow({ suspended: suspended })))
      .union(suspendedReactionWindowKinds
        .map(suspended => OfferedReadiedSpellWindow({ suspended: suspended })))
      .union(suspendedReactionWindowKinds
        .map(suspended => OfferedStatBlockReactionWindow({ suspended: suspended })))

  pure def initialReactionProtocolState: ReactionProtocolState = {
    interruptedActor: initialMovementGrappleState,
    reactor: initialMovementGrappleState,
    reactionWindow: NoReactionWindow,
    concentration: {
      interruptedActor: NoConcentration,
      reactor: NoConcentration,
    },
  }

  pure def legalReactionWindowState(window: ReactionWindowState): bool =
    window.in(legalReactionWindowStates)

  pure def legalReactionProtocolState(state: ReactionProtocolState): bool = all {
    legalMovementGrappleState(state.interruptedActor),
    legalMovementGrappleState(state.reactor),
    legalReactionWindowState(state.reactionWindow),
    state.concentration.interruptedActor.in(Set(NoConcentration, Concentrating)),
    state.concentration.reactor.in(Set(NoConcentration, Concentrating)),
  }

  pure def reactionWindowIsOpen(window: ReactionWindowState): bool =
    window != NoReactionWindow

  pure def reactionWindowIsKind(
    window: ReactionWindowState,
    kind: ReactionWindowKind
  ): bool =
    match window {
      | NoReactionWindow => false
      | OfferedOpportunityAttackWindow(_) => kind == OpportunityAttackReactionWindow
      | OfferedDamageInterruptionWindow(_) => kind == DamageInterruptionReactionWindow
      | OfferedReadiedMovementWindow(_) => kind == ReadiedMovementReactionWindow
      | OfferedReadiedSpellWindow(_) => kind == ReadiedSpellReactionWindow
      | OfferedStatBlockReactionWindow(_) => kind == StatBlockReactionWindow
    }

  pure def reactionWindowDepth(window: ReactionWindowState): int =
    match window {
      | NoReactionWindow => 0
      | OfferedOpportunityAttackWindow(v) =>
        if (v.suspended == NoSuspendedReactionWindow) 1 else 2
      | OfferedDamageInterruptionWindow(v) =>
        if (v.suspended == NoSuspendedReactionWindow) 1 else 2
      | OfferedReadiedMovementWindow(v) =>
        if (v.suspended == NoSuspendedReactionWindow) 1 else 2
      | OfferedReadiedSpellWindow(v) =>
        if (v.suspended == NoSuspendedReactionWindow) 1 else 2
      | OfferedStatBlockReactionWindow(v) =>
        if (v.suspended == NoSuspendedReactionWindow) 1 else 2
    }

  pure def reactionChoiceMatchesWindow(
    choice: ReactionChoice,
    window: ReactionWindowState
  ): bool =
    match choice {
      | DeclineReaction => true
      | TakeOpportunityAttackReaction =>
        reactionWindowIsKind(window, OpportunityAttackReactionWindow)
      | TakeDamageInterruptionReaction =>
        reactionWindowIsKind(window, DamageInterruptionReactionWindow)
      | TakeReadiedMovementReaction =>
        reactionWindowIsKind(window, ReadiedMovementReactionWindow)
      | TakeReadiedSpellReaction =>
        reactionWindowIsKind(window, ReadiedSpellReactionWindow)
      | TakeStatBlockReaction =>
        reactionWindowIsKind(window, StatBlockReactionWindow)
    }

  pure def suspendedReactionWindowKind(window: ReactionWindowState): SuspendedReactionWindowKind =
    match window {
      | NoReactionWindow => NoSuspendedReactionWindow
      | OfferedOpportunityAttackWindow(_) => SuspendedOpportunityAttackReactionWindow
      | OfferedDamageInterruptionWindow(_) => SuspendedDamageInterruptionReactionWindow
      | OfferedReadiedMovementWindow(_) => SuspendedReadiedMovementReactionWindow
      | OfferedReadiedSpellWindow(_) => SuspendedReadiedSpellReactionWindow
      | OfferedStatBlockReactionWindow(_) => SuspendedStatBlockReactionWindow
    }

  pure def reactionWindowForKind(
    kind: ReactionWindowKind,
    suspended: SuspendedReactionWindowKind
  ): ReactionWindowState =
    match kind {
      | OpportunityAttackReactionWindow =>
        OfferedOpportunityAttackWindow({ suspended: suspended })
      | DamageInterruptionReactionWindow =>
        OfferedDamageInterruptionWindow({ suspended: suspended })
      | ReadiedMovementReactionWindow =>
        OfferedReadiedMovementWindow({ suspended: suspended })
      | ReadiedSpellReactionWindow =>
        OfferedReadiedSpellWindow({ suspended: suspended })
      | StatBlockReactionWindow =>
        OfferedStatBlockReactionWindow({ suspended: suspended })
    }

  pure def reactionWindowForSuspendedKind(
    suspended: SuspendedReactionWindowKind
  ): ReactionWindowState =
    match suspended {
      | NoSuspendedReactionWindow => NoReactionWindow
      | SuspendedOpportunityAttackReactionWindow =>
        OfferedOpportunityAttackWindow({ suspended: NoSuspendedReactionWindow })
      | SuspendedDamageInterruptionReactionWindow =>
        OfferedDamageInterruptionWindow({ suspended: NoSuspendedReactionWindow })
      | SuspendedReadiedMovementReactionWindow =>
        OfferedReadiedMovementWindow({ suspended: NoSuspendedReactionWindow })
      | SuspendedReadiedSpellReactionWindow =>
        OfferedReadiedSpellWindow({ suspended: NoSuspendedReactionWindow })
      | SuspendedStatBlockReactionWindow =>
        OfferedStatBlockReactionWindow({ suspended: NoSuspendedReactionWindow })
    }

  pure def restoreSuspendedReactionWindow(window: ReactionWindowState): ReactionWindowState =
    match window {
      | NoReactionWindow => NoReactionWindow
      | OfferedOpportunityAttackWindow(v) => reactionWindowForSuspendedKind(v.suspended)
      | OfferedDamageInterruptionWindow(v) => reactionWindowForSuspendedKind(v.suspended)
      | OfferedReadiedMovementWindow(v) => reactionWindowForSuspendedKind(v.suspended)
      | OfferedReadiedSpellWindow(v) => reactionWindowForSuspendedKind(v.suspended)
      | OfferedStatBlockReactionWindow(v) => reactionWindowForSuspendedKind(v.suspended)
    }

  pure def offerReactionWindow(
    window: ReactionWindowState,
    kind: ReactionWindowKind
  ): ReactionWindowState =
    match window {
      | NoReactionWindow => reactionWindowForKind(kind, NoSuspendedReactionWindow)
      | _ =>
        if (reactionWindowDepth(window) >= maximumReactionWindowDepth) window
        else reactionWindowForKind(kind, suspendedReactionWindowKind(window))
    }

  pure def declineReactionWindow(window: ReactionWindowState): ReactionWindowState =
    restoreSuspendedReactionWindow(window)

  pure def advanceContinuation(window: ReactionWindowState): ReactionWindowState =
    restoreSuspendedReactionWindow(window)

  pure def resolveReactionChoice(
    reactorTurn: TurnProcedureState,
    window: ReactionWindowState,
    choice: ReactionChoice
  ): { turn: TurnProcedureState, reactionWindow: ReactionWindowState } =
    match window {
      | NoReactionWindow => {
          turn: reactorTurn,
          reactionWindow: NoReactionWindow,
        }
      | _ =>
        if (not(reactionChoiceMatchesWindow(choice, window))) {
          turn: reactorTurn,
          reactionWindow: window,
        } else if (choice == DeclineReaction) {
          turn: reactorTurn,
          reactionWindow: declineReactionWindow(window),
        } else {
          val spent = spendReaction(reactorTurn)
          if (spent == reactorTurn) {
            turn: reactorTurn,
            reactionWindow: window,
          } else {
            turn: spent,
            reactionWindow: advanceContinuation(window),
          }
        }
    }

  pure def offerOpportunityAttackReaction(
    state: ReactionProtocolState,
    facts: OpportunityAttackTriggerFacts
  ): ReactionProtocolState =
    if (opportunityAttackTriggered(state.interruptedActor.turn, facts)) {
      state.with("reactionWindow", offerReactionWindow(
        state.reactionWindow,
        OpportunityAttackReactionWindow
      ))
    } else state

  pure def resolveOpportunityAttackContinuation(
    state: ReactionProtocolState
  ): ReactionProtocolState = {
    val choice = resolveReactionChoice(
      state.reactor.turn,
      state.reactionWindow,
      TakeOpportunityAttackReaction
    )
    if (choice.reactionWindow == state.reactionWindow) state
    else {
      interruptedActor: state.interruptedActor,
      reactor: state.reactor.with("turn", choice.turn),
      reactionWindow: choice.reactionWindow,
      concentration: state.concentration,
    }
  }

  pure def offerDamageInterruptionReaction(
    state: ReactionProtocolState,
    effectiveDamage: int
  ): ReactionProtocolState =
    if (effectiveDamage > 0) {
      state.with("reactionWindow", offerReactionWindow(
        state.reactionWindow,
        DamageInterruptionReactionWindow
      ))
    } else state

  pure def resolveReadiedMovementReaction(
    state: ReactionProtocolState,
    facts: MovementSpendFacts
  ): ReactionProtocolState = {
    val canRelease = all {
      reactionWindowIsKind(state.reactionWindow, ReadiedMovementReactionWindow),
      canSpendReadiedReactionMovement(state.reactor, facts),
    }
    val choice = resolveReactionChoice(
      state.reactor.turn,
      state.reactionWindow,
      TakeReadiedMovementReaction
    )
    val moved =
      if (not(canRelease) or choice.reactionWindow == state.reactionWindow) state.reactor
      else spendReadiedReactionMovement(state.reactor.with("turn", choice.turn), facts)
    {
      interruptedActor: state.interruptedActor,
      reactor: moved,
      reactionWindow:
        if (not(canRelease)) state.reactionWindow else choice.reactionWindow,
      concentration: state.concentration,
    }
  }

  pure def canSpendReadiedReactionMovement(
    reactor: MovementGrappleState,
    facts: MovementSpendFacts
  ): bool = {
    val cost = movementCostFeet(facts)
    all {
      legalMovementSpendFacts(facts),
      cost > 0,
      reactor.turn.readiedMovementHeld,
      effectiveSpeedFeet(reactor) > 0,
      cost <= effectiveSpeedFeet(reactor),
      reactor.movementSpentFeet + cost <= 120,
    }
  }

  pure def spendReadiedReactionMovement(
    reactor: MovementGrappleState,
    facts: MovementSpendFacts
  ): MovementGrappleState =
    if (not(canSpendReadiedReactionMovement(reactor, facts))) reactor
    else reactor
      .with("turn", reactor.turn.with("readiedMovementHeld", false))
      .with("movementSpentFeet", reactor.movementSpentFeet + movementCostFeet(facts))

  pure def concentrationForActor(
    concentration: ActorConcentrationState,
    actor: ReactionProtocolActor
  ): ConcentrationState =
    if (actor == InterruptedActor) concentration.interruptedActor else concentration.reactor

  pure def setConcentrationForActor(
    concentration: ActorConcentrationState,
    actor: ReactionProtocolActor,
    actorConcentration: ConcentrationState
  ): ActorConcentrationState =
    if (actor == InterruptedActor) {
      interruptedActor: actorConcentration,
      reactor: concentration.reactor,
    } else {
      interruptedActor: concentration.interruptedActor,
      reactor: actorConcentration,
    }

  pure def startConcentration(
    concentration: ActorConcentrationState,
    actor: ReactionProtocolActor,
    canConcentrate: bool
  ): ActorConcentrationState =
    if (canConcentrate) {
      setConcentrationForActor(concentration, actor, Concentrating)
    } else concentration

  pure def endConcentration(
    concentration: ActorConcentrationState,
    actor: ReactionProtocolActor
  ): ActorConcentrationState =
    setConcentrationForActor(concentration, actor, NoConcentration)

  pure def breakConcentrationIfPrevented(
    concentration: ActorConcentrationState,
    actor: ReactionProtocolActor,
    incapacitatedOrDead: bool
  ): ActorConcentrationState =
    if (incapacitatedOrDead) {
      setConcentrationForActor(concentration, actor, NoConcentration)
    } else concentration

  pure def concentrationSavingThrowDc(effectiveDamage: int): int = {
    val halfDamage = effectiveDamage / 2
    val rawDc = if (halfDamage > 10) halfDamage else 10
    if (rawDc > 30) 30 else rawDc
  }

  pure def resolveConcentrationAfterDamage(
    concentration: ConcentrationState,
    effectiveDamage: int,
    saveSucceeded: bool
  ): ConcentrationDamageResult = {
    val saveRequired = concentration == Concentrating and effectiveDamage > 0
    val dc = if (saveRequired) concentrationSavingThrowDc(effectiveDamage) else 0
    {
      concentration:
        if (saveRequired and not(saveSucceeded)) NoConcentration else concentration,
      saveRequired: saveRequired,
      saveDc: dc,
    }
  }

  pure def applyDamageTargetWithConcentrationInterruption(
    state: ReactionProtocolState,
    target: ConcentrationDamageTarget,
    effectiveDamage: int,
    concentrationSaveSucceeded: bool
  ): ReactionProtocolState = {
    if (not(canApplyResolvedDamageToPositiveHitPoints(target.vitals))) state
    else {
    val damaged = applyResolvedDamageToPositiveHitPoints(target.vitals, effectiveDamage)
    val afterDamageConcentration = resolveConcentrationAfterDamage(
      concentrationForActor(state.concentration, target.actor),
      damaged.damageToHitPoints,
      concentrationSaveSucceeded
    )
    val afterDamage = {
      interruptedActor: state.interruptedActor,
      reactor: state.reactor,
      reactionWindow: state.reactionWindow,
      concentration: setConcentrationForActor(
        state.concentration,
        target.actor,
        afterDamageConcentration.concentration
      ),
    }
    val opensInterruption = damaged.damageToHitPoints > 0
    if (not(opensInterruption)) afterDamage
    else
    {
      interruptedActor: afterDamage.interruptedActor,
      reactor: afterDamage.reactor,
      reactionWindow: offerReactionWindow(
        afterDamage.reactionWindow,
        DamageInterruptionReactionWindow
      ),
      concentration: afterDamage.concentration,
    }
    }
  }

}
