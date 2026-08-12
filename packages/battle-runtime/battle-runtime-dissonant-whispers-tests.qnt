// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-forced-reaction-movement

module battleRuntimeDissonantWhispersTests {
  import battleRuntimeMovementBridge.* from "./battle-runtime-movement-bridge"
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

  run test_dissonant_whispers_forced_reaction_no_reaction_opens_after_damage = {
    val noReaction = {
      ...initialState,
      goblin: { ...initialState.goblin, reactionAvailable: false },
    }
    match resolveDissonantWhispersGoblinForcedReactionMovement(noReaction, DissonantWhispersMovementMissing) {
      | DissonantWhispersResolvedAfterDamage(result) =>
          all {
            assert(not(result.goblin.reactionAvailable)),
            assert(result.interruptStack.length() == 1),
            assert(pendingReactionFrame(result.interruptStack[0]) == HasPendingReactionFrame({
              trigger: AfterDamage,
              procedure: DamageInterruptionReactionProcedure,
              eligibleReactors: Set(Fighter),
              offeredReactors: Set(),
              continuation: ResumeAfterDamage,
            })),
          }
      | _ => assert(false)
    }
  }

  run test_dissonant_whispers_forced_reaction_no_movement_spends_reaction_and_opens_after_damage = {
    val grappled = grappleFighterGoblin(initialState, 12)
    match resolveDissonantWhispersGoblinForcedReactionMovement(grappled, DissonantWhispersMovementMissing) {
      | DissonantWhispersResolvedAfterDamage(result) =>
          all {
            assert(not(result.goblin.reactionAvailable)),
            assert(result.interruptStack.length() == 1),
            assert(pendingReactionFrame(result.interruptStack[0]) == HasPendingReactionFrame({
              trigger: AfterDamage,
              procedure: DamageInterruptionReactionProcedure,
              eligibleReactors: Set(Fighter),
              offeredReactors: Set(),
              continuation: ResumeAfterDamage,
            })),
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

  run test_dissonant_whispers_forced_reaction_movement_without_threat_spends_reaction_then_after_damage = {
    match resolveDissonantWhispersGoblinForcedReactionMovement(
      initialState,
      DissonantWhispersMovementFilled({
        speedKind: WalkSpeedKind,
        movementCost: 10,
        provokesOpportunityAttack: false,
      })
    ) {
      | DissonantWhispersResolvedAfterDamage(result) =>
          all {
            assert(not(result.goblin.reactionAvailable)),
            assert(result.goblin.movementSpent == 0),
            assert(result.interruptStack.length() == 1),
            assert(pendingReactionFrame(result.interruptStack[0]) == HasPendingReactionFrame({
              trigger: AfterDamage,
              procedure: DamageInterruptionReactionProcedure,
              eligibleReactors: Set(Fighter),
              offeredReactors: Set(),
              continuation: ResumeAfterDamage,
            })),
          }
      | _ => assert(false)
    }
  }

  run test_dissonant_whispers_forced_reaction_movement_with_threat_opens_opportunity_attack_first = {
    match resolveDissonantWhispersGoblinForcedReactionMovement(
      initialState,
      DissonantWhispersMovementFilled({
        speedKind: WalkSpeedKind,
        movementCost: 10,
        provokesOpportunityAttack: true,
      })
    ) {
      | DissonantWhispersOpportunityAttackWindow(result) =>
          all {
            assert(not(result.goblin.reactionAvailable)),
            assert(result.interruptStack.length() == 1),
            assert(pendingReactionFrame(result.interruptStack[0]) == HasPendingReactionFrame({
              trigger: OpportunityAttack,
              procedure: OpportunityAttackReactionProcedure,
              eligibleReactors: Set(Fighter),
              offeredReactors: Set(),
              continuation: ResumeDissonantWhispersMovementThenAfterDamage({
                speedKind: WalkSpeedKind,
                movementCost: 10,
              }),
            })),
          }
      | _ => assert(false)
    }
  }

  run test_dissonant_whispers_declined_opportunity_attack_resumes_after_damage_sequence = {
    match resolveDissonantWhispersGoblinForcedReactionMovement(
      initialState,
      DissonantWhispersMovementFilled({
        speedKind: WalkSpeedKind,
        movementCost: 10,
        provokesOpportunityAttack: true,
      })
    ) {
      | DissonantWhispersOpportunityAttackWindow(awaiting) => {
          val resumed = declineNonSpellReactionOfferAndResume(awaiting, Fighter)
          all {
            assert(resumed.fighter.reactionAvailable),
            assert(not(resumed.goblin.reactionAvailable)),
            assert(resumed.interruptStack.length() == 1),
            assert(pendingReactionFrame(resumed.interruptStack[0]) == HasPendingReactionFrame({
              trigger: AfterDamage,
              procedure: DamageInterruptionReactionProcedure,
              eligibleReactors: Set(Fighter),
              offeredReactors: Set(),
              continuation: ResumeAfterDamage,
            })),
          }
        }
      | _ => assert(false)
    }
  }

}
