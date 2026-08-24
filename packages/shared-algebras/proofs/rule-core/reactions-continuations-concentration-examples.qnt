// -*- mode: Bluespec; -*-

module reactionsContinuationsConcentrationExamples {
  import hitPointDamage.* from "./hit-point-damage"
  import actionTurnProcedures.* from "./action-turn-procedures"
  import movementSpatialGrapple.* from "./movement-spatial-grapple"
  import reactionsContinuationsConcentration.* from "./reactions-continuations-concentration"

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
      .with(
        "reactor",
        initialMovementGrappleState
          .with("turn", readyTurn)
          .with("movementSpentFeet", 5)
      )
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
      assert(resolved.reactor.movementSpentFeet == 5),
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
    val offered = offerDamageTargetWithConcentrationInterruption(
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
      12
    )
    match offered {
      | NoConcentrationDamageInterruption(_) => false
      | ConcentrationDamageInterruptionUnavailable(_) => false
      | ConcentrationDamageInterruptionOffered(data) => {
          val stateAfterReaction = data.state.with(
            "reactionWindow",
            advanceContinuation(data.state.reactionWindow)
          )
          val resumed = resumeDamageTargetAfterConcentrationInterruption(
            stateAfterReaction,
            data.continuation,
            false
          )
          all {
            assert(data.state.concentration.interruptedActor == Concentrating),
            assert(data.state.concentration.reactor == Concentrating),
            assert(data.state.reactionWindow == OfferedDamageInterruptionWindow({
              suspended: NoSuspendedReactionWindow,
            })),
            assert(data.continuation.actor == InterruptedActor),
            assert(data.continuation.damageAmount == 12),
            assert(resumed.concentration.interruptedActor == NoConcentration),
            assert(resumed.concentration.reactor == Concentrating),
            assert(resumed.reactionWindow == NoReactionWindow),
            assert(legalReactionProtocolState(resumed)),
          }
        }
    }
  }

  run test_damage_integration_breaks_only_target_actor_concentration = {
    val offered = offerDamageTargetWithConcentrationInterruption(
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
      12
    )
    match offered {
      | NoConcentrationDamageInterruption(_) => false
      | ConcentrationDamageInterruptionUnavailable(_) => false
      | ConcentrationDamageInterruptionOffered(data) => {
          val stateAfterReaction = data.state.with(
            "reactionWindow",
            advanceContinuation(data.state.reactionWindow)
          )
          val resumed = resumeDamageTargetAfterConcentrationInterruption(
            stateAfterReaction,
            data.continuation,
            false
          )
          all {
            assert(data.state.concentration.interruptedActor == Concentrating),
            assert(data.state.concentration.reactor == Concentrating),
            assert(data.continuation.actor == Reactor),
            assert(resumed.concentration.interruptedActor == Concentrating),
            assert(resumed.concentration.reactor == NoConcentration),
            assert(legalReactionProtocolState(resumed)),
          }
        }
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
    assert(offerDamageTargetWithConcentrationInterruption(
      initialReactionProtocolState.with("concentration", {
        interruptedActor: Concentrating,
        reactor: Concentrating,
      }),
      invalidPositiveHpTarget,
      12
    ) == NoConcentrationDamageInterruption({
      state: initialReactionProtocolState.with("concentration", {
        interruptedActor: Concentrating,
        reactor: Concentrating,
      }),
    }))
  }

  run test_zero_damage_does_not_open_interruption_or_change_concentration = {
    val state = initialReactionProtocolState.with("concentration", {
      interruptedActor: Concentrating,
      reactor: Concentrating,
    })
    val offered = offerDamageTargetWithConcentrationInterruption(
      state,
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
      0
    )
    assert(offered == NoConcentrationDamageInterruption({ state: state }))
  }

  run test_temporary_hit_points_do_not_prevent_damage_interruption_or_concentration = {
    val state = initialReactionProtocolState.with("concentration", {
      interruptedActor: Concentrating,
      reactor: Concentrating,
    })
    val offered = offerDamageTargetWithConcentrationInterruption(
      state,
      {
        actor: InterruptedActor,
        vitals: {
          kind: PlayerCharacter,
          hitPoints: 20,
          hitPointMaximum: 20,
          temporaryHitPoints: 12,
          dead: false,
          unconscious: false,
        },
      },
      8
    )
    match offered {
      | NoConcentrationDamageInterruption(_) => false
      | ConcentrationDamageInterruptionUnavailable(_) => false
      | ConcentrationDamageInterruptionOffered(data) => {
          val resumed = resumeDamageTargetAfterConcentrationInterruption(
            data.state.with(
              "reactionWindow",
              advanceContinuation(data.state.reactionWindow)
            ),
            data.continuation,
            false
          )
          all {
            assert(data.continuation.damageAmount == 8),
            assert(resumed.concentration.interruptedActor == NoConcentration),
          }
        }
    }
  }

  run test_maximum_depth_resumes_damage_without_advancing_existing_window = {
    val depthOne = offerReactionWindow(
      NoReactionWindow,
      OpportunityAttackReactionWindow
    )
    val depthTwo = offerReactionWindow(
      depthOne,
      DamageInterruptionReactionWindow
    )
    val state = initialReactionProtocolState
      .with("reactionWindow", depthTwo)
      .with("concentration", {
        interruptedActor: Concentrating,
        reactor: Concentrating,
      })
    val offered = offerDamageTargetWithConcentrationInterruption(
      state,
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
      12
    )
    match offered {
      | NoConcentrationDamageInterruption(_) => false
      | ConcentrationDamageInterruptionOffered(_) => false
      | ConcentrationDamageInterruptionUnavailable(data) => {
          val resumed = resumeDamageTargetAfterConcentrationInterruption(
            data.state,
            data.continuation,
            false
          )
          all {
            assert(resumed.reactionWindow == depthTwo),
            assert(resumed.concentration.interruptedActor == NoConcentration),
            assert(resumed.concentration.reactor == Concentrating),
            assert(legalReactionProtocolState(resumed)),
          }
        }
    }
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
