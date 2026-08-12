// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-forced-reaction-movement

module battleRuntimeDissonantWhispersTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeTriggeredReactionResolution.* from "./battle-runtime-triggered-reaction-resolution"
  import battleRuntimeMovement.* from "./battle-runtime-movement"

  run test_dissonant_whispers_forced_reaction_requires_movement_fill_when_available = {
    assert(
      resolveDissonantWhispersGoblinForcedReactionMovement(initialState, DissonantWhispersMovementMissing)
        == DissonantWhispersNeedsMovementFill
    )
  }

  run test_dissonant_whispers_no_reaction_completes_without_interrupt = {
    val noReaction = {
      ...initialState,
      goblin: { ...initialState.goblin, reactionAvailable: false },
    }
    match resolveDissonantWhispersGoblinForcedReactionMovement(noReaction, DissonantWhispersMovementMissing) {
      | DissonantWhispersForcedMovementResolved(result) =>
          all {
            assert(not(result.goblin.reactionAvailable)),
            assert(result.fighter.reactionAvailable),
            assert(result.interruptStack == []),
          }
      | _ => assert(false)
    }
  }

  run test_dissonant_whispers_no_movement_spends_reaction_without_interrupt = {
    val grappled = grappleFighterGoblin(initialState, 12)
    match resolveDissonantWhispersGoblinForcedReactionMovement(grappled, DissonantWhispersMovementMissing) {
      | DissonantWhispersForcedMovementResolved(result) =>
          all {
            assert(not(result.goblin.reactionAvailable)),
            assert(result.fighter.reactionAvailable),
            assert(result.interruptStack == []),
          }
      | _ => assert(false)
    }
  }

  run test_dissonant_whispers_forced_reaction_rejects_movement_when_unavailable = {
    val grappled = grappleFighterGoblin(initialState, 12)
    assert(
      resolveDissonantWhispersGoblinForcedReactionMovement(
        grappled,
        DissonantWhispersMovementFilled({
          speedKind: WalkSpeedKind,
          movementCost: 5,
          provokesOpportunityAttack: false,
        })
      ) == DissonantWhispersInvalidMovementFill
    )
  }

  run test_dissonant_whispers_reaction_movement_without_threat_preserves_turn_movement = {
    match resolveDissonantWhispersGoblinForcedReactionMovement(
      initialState,
      DissonantWhispersMovementFilled({
        speedKind: WalkSpeedKind,
        movementCost: 10,
        provokesOpportunityAttack: false,
      })
    ) {
      | DissonantWhispersForcedMovementResolved(result) =>
          all {
            assert(not(result.goblin.reactionAvailable)),
            assert(result.goblin.movementSpent == initialState.goblin.movementSpent),
            assert(result.fighter.reactionAvailable),
            assert(result.interruptStack == []),
          }
      | _ => assert(false)
    }
  }

  run test_dissonant_whispers_reaction_movement_with_threat_opens_opportunity_attack = {
    match resolveDissonantWhispersGoblinForcedReactionMovement(
      initialState,
      DissonantWhispersMovementFilled({
        speedKind: WalkSpeedKind,
        movementCost: 10,
        provokesOpportunityAttack: true,
      })
    ) {
      | DissonantWhispersOpportunityAttackPending(result) =>
          all {
            assert(not(result.goblin.reactionAvailable)),
            assert(result.goblin.movementSpent == initialState.goblin.movementSpent),
            assert(result.interruptStack.length() == 1),
            assert(pendingReactionFrame(result.interruptStack[0]) == HasPendingReactionFrame({
              request: OpportunityAttackReactionRequest({
                mover: Goblin,
                threat: Fighter,
                continuation: OpportunityAttackResumesDissonantWhispersReactionMovement({
                  damageSource: Fighter,
                }),
              }),
            })),
          }
      | _ => assert(false)
    }
  }

  run test_dissonant_whispers_declined_opportunity_attack_closes_interrupt = {
    match resolveDissonantWhispersGoblinForcedReactionMovement(
      initialState,
      DissonantWhispersMovementFilled({
        speedKind: WalkSpeedKind,
        movementCost: 10,
        provokesOpportunityAttack: true,
      })
    ) {
      | DissonantWhispersOpportunityAttackPending(awaiting) => {
          val resumed = declineTriggeredReactionOfferAndResume(awaiting, Fighter)
          all {
            assert(resumed.fighter.reactionAvailable),
            assert(not(resumed.goblin.reactionAvailable)),
            assert(resumed.goblin.movementSpent == initialState.goblin.movementSpent),
            assert(resumed.interruptStack == []),
          }
        }
      | _ => assert(false)
    }
  }

  run test_dissonant_whispers_accepted_opportunity_attack_preserves_reactor_and_provoker_direction = {
    match resolveDissonantWhispersGoblinForcedReactionMovement(
      initialState,
      DissonantWhispersMovementFilled({
        speedKind: WalkSpeedKind,
        movementCost: 10,
        provokesOpportunityAttack: true,
      })
    ) {
      | DissonantWhispersOpportunityAttackPending(awaiting) => {
          val resolved = resolveTriggeredReactionOffer(awaiting, Fighter)
          all {
            assert(not(resolved.fighter.reactionAvailable)),
            assert(not(resolved.goblin.reactionAvailable)),
            assert(resolved.fighter.hp == initialState.fighter.hp),
            assert(resolved.goblin.hp == 3),
            assert(resolved.goblin.movementSpent == initialState.goblin.movementSpent),
            assert(resolved.interruptStack == []),
          }
        }
      | _ => assert(false)
    }
  }

  run test_dissonant_whispers_unavailable_threat_completes_without_phantom_window = {
    val unavailableThreat = {
      ...initialState,
      fighter: { ...initialState.fighter, incapacitated: true },
    }
    match resolveDissonantWhispersGoblinForcedReactionMovement(
      unavailableThreat,
      DissonantWhispersMovementFilled({
        speedKind: WalkSpeedKind,
        movementCost: 10,
        provokesOpportunityAttack: true,
      })
    ) {
      | DissonantWhispersForcedMovementResolved(resolved) =>
          all {
            assert(not(resolved.goblin.reactionAvailable)),
            assert(resolved.fighter.reactionAvailable),
            assert(resolved.goblin.movementSpent == unavailableThreat.goblin.movementSpent),
            assert(resolved.interruptStack == []),
          }
      | _ => assert(false)
    }
  }

}
