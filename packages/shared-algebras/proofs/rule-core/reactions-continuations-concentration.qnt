// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-004 RAW-PTG-REACTIONS-005 RAW-PTG-REACTIONS-006
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.reaction-roll-or-damage-reduction spell.reaction-shield spell.readied-action-time-spell

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

  run test_offer_decline_and_advance_close_reaction_window_without_spending = {
    val offered = offerReactionWindow(
      NoReactionWindow,
      OpportunityAttackReactionWindow
    )
    val declined = resolveReactionChoice(initialTurnProcedureState, offered, DeclineReaction)
    all {
      assert(reactionWindowIsOpen(offered)),
      assert(declined.turn.reactionAvailable),
      assert(declined.reactionWindow == NoReactionWindow),
      assert(advanceContinuation(offered) == NoReactionWindow),
    }
  }

  run test_reaction_choice_spends_quota_and_closes_matching_window = {
    val offered = offerReactionWindow(
      NoReactionWindow,
      OpportunityAttackReactionWindow
    )
    val resolved = resolveReactionChoice(
      initialTurnProcedureState,
      offered,
      TakeOpportunityAttackReaction
    )
    all {
      assert(not(resolved.turn.reactionAvailable)),
      assert(resolved.reactionWindow == NoReactionWindow),
    }
  }

  run test_unavailable_reaction_quota_leaves_window_open = {
    val offered = offerReactionWindow(
      NoReactionWindow,
      DamageInterruptionReactionWindow
    )
    val spentTurn = spendReaction(initialTurnProcedureState)
    val resolved = resolveReactionChoice(
      spentTurn,
      offered,
      TakeDamageInterruptionReaction
    )
    all {
      assert(not(resolved.turn.reactionAvailable)),
      assert(resolved.reactionWindow == offered),
    }
  }

  run test_nested_reaction_windows_are_bounded = {
    val first = offerReactionWindow(
      NoReactionWindow,
      OpportunityAttackReactionWindow
    )
    val second = offerReactionWindow(
      first,
      DamageInterruptionReactionWindow
    )
    val capped = offerReactionWindow(
      second,
      ReadiedMovementReactionWindow
    )
    all {
      assert(legalReactionWindowState(first)),
      assert(legalReactionWindowState(second)),
      assert(capped == second),
      assert(advanceContinuation(second) == first),
    }
  }

  run test_opportunity_attack_trigger_opens_matching_reaction_window = {
    val facts = {
      hostileCreature: true,
      observerCanSee: true,
      leavesReach: true,
      movementResource: OwnMovementActionBonusReactionOrSpeed,
    }
    val offered = offerOpportunityAttackReaction(initialReactionProtocolState, facts)
    all {
      assert(reactionWindowIsOpen(offered.reactionWindow)),
      assert(legalReactionProtocolState(offered)),
    }
  }

  run test_readied_movement_reaction_spends_reaction_and_movement = {
    val readyTurn = resolveReadyMovement(initialTurnProcedureState, true)
    val readied = initialReactionProtocolState
      .with("reactor", initialMovementGrappleState.with("turn", readyTurn))
      .with(
      "reactionWindow",
      offerReactionWindow(
        NoReactionWindow,
        ReadiedMovementReactionWindow
      )
    )
    val resolved = resolveReadiedMovementReaction(readied, {
      distanceFeet: 10,
      extraCostFeet: 0,
    })
    all {
      assert(not(resolved.reactor.turn.reactionAvailable)),
      assert(not(resolved.reactor.turn.readiedMovementHeld)),
      assert(resolved.reactor.movementSpentFeet == 10),
      assert(resolved.interruptedActor.movementSpentFeet == 0),
      assert(resolved.reactionWindow == NoReactionWindow),
    }
  }

  run test_readied_movement_reaction_requires_held_response = {
    val readied = initialReactionProtocolState.with(
      "reactionWindow",
      offerReactionWindow(
        NoReactionWindow,
        ReadiedMovementReactionWindow
      )
    )
    val resolved = resolveReadiedMovementReaction(readied, {
      distanceFeet: 10,
      extraCostFeet: 0,
    })
    all {
      assert(resolved.reactor.turn.reactionAvailable),
      assert(resolved.reactor.movementSpentFeet == 0),
      assert(resolved.reactionWindow == readied.reactionWindow),
    }
  }

  run test_damage_integration_opens_interruption_and_breaks_concentration = {
    val result = applyDamageTargetWithConcentrationInterruption(
      initialReactionProtocolState.with("concentration", {
        interruptedActor: Concentrating,
        reactor: Concentrating,
      }),
      {
        actor: InterruptedActor,
        vitals: {
          kind: PlayerCharacter,
          hitPoints: 20,
          hitPointMaximum: 20,
          temporaryHitPoints: 0,
          dead: false,
          unconscious: false,
        },
      },
      12,
      false
    )
    all {
      assert(result.concentration.interruptedActor == NoConcentration),
      assert(result.concentration.reactor == Concentrating),
      assert(result.reactionWindow == OfferedDamageInterruptionWindow({
        suspended: NoSuspendedReactionWindow,
      })),
      assert(legalReactionProtocolState(result)),
    }
  }

  run test_damage_integration_breaks_only_target_actor_concentration = {
    val result = applyDamageTargetWithConcentrationInterruption(
      initialReactionProtocolState.with("concentration", {
        interruptedActor: Concentrating,
        reactor: Concentrating,
      }),
      {
        actor: Reactor,
        vitals: {
          kind: PlayerCharacter,
          hitPoints: 20,
          hitPointMaximum: 20,
          temporaryHitPoints: 0,
          dead: false,
          unconscious: false,
        },
      },
      12,
      false
    )
    all {
      assert(result.concentration.interruptedActor == Concentrating),
      assert(result.concentration.reactor == NoConcentration),
      assert(legalReactionProtocolState(result)),
    }
  }

  run test_damage_integration_rejects_non_dead_zero_hit_point_target = {
    val invalidPositiveHpTarget = {
      actor: InterruptedActor,
      vitals: {
        kind: PlayerCharacter,
        hitPoints: 0,
        hitPointMaximum: 20,
        temporaryHitPoints: 0,
        dead: false,
        unconscious: true,
      },
    }
    assert(applyDamageTargetWithConcentrationInterruption(
      initialReactionProtocolState.with("concentration", {
        interruptedActor: Concentrating,
        reactor: Concentrating,
      }),
      invalidPositiveHpTarget,
      12,
      false
    ) == initialReactionProtocolState.with("concentration", {
      interruptedActor: Concentrating,
      reactor: Concentrating,
    }))
  }

  run test_concentration_start_replace_end_and_prevent = {
    val started = startConcentration(initialReactionProtocolState.concentration, Reactor, true)
    val replaced = startConcentration(started, Reactor, true)
    val prevented = startConcentration(initialReactionProtocolState.concentration, Reactor, false)
    val ended = endConcentration(started, Reactor)
    val broken = breakConcentrationIfPrevented(started, Reactor, true)
    all {
      assert(started.reactor == Concentrating),
      assert(started.interruptedActor == NoConcentration),
      assert(replaced.reactor == Concentrating),
      assert(prevented.reactor == NoConcentration),
      assert(ended.reactor == NoConcentration),
      assert(broken.reactor == NoConcentration),
    }
  }

  run test_concentration_damage_save_dc_and_failed_save_break = {
    val small = resolveConcentrationAfterDamage(Concentrating, 8, true)
    val large = resolveConcentrationAfterDamage(Concentrating, 80, true)
    val failed = resolveConcentrationAfterDamage(Concentrating, 22, false)
    val noDamage = resolveConcentrationAfterDamage(Concentrating, 0, false)
    all {
      assert(small.saveRequired),
      assert(small.saveDc == 10),
      assert(large.saveDc == 30),
      assert(failed.saveDc == 11),
      assert(failed.concentration == NoConcentration),
      assert(noDamage.concentration == Concentrating),
      assert(not(noDamage.saveRequired)),
    }
  }
}
