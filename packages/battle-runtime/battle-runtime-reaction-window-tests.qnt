// -*- mode: Bluespec; -*-

module battleRuntimeReactionWindowTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"

  pure def opportunityAttackOfferFrame(
    eligibleReactors: Set[Actor],
    offeredReactors: Set[Actor],
  ): PendingReactionFrame = {
    request: OpportunityAttackReactionRequest({
      mover: Goblin,
      threats: eligibleReactors,
      continuation: OpportunityAttackResumesMovement({
        speedKind: WalkSpeedKind,
        movementCost: 10,
      }),
    }),
    offeredReactors: offeredReactors,
  }

  pure def hellishRebukeOfferFrame(
    damaged: Actor,
    offeredReactors: Set[Actor],
  ): PendingReactionFrame = {
    request: AfterDamageHellishRebukeReactionRequest({
      damager: if (damaged == Fighter) Goblin else Fighter,
      damaged: damaged,
      slotLevel: 1,
    }),
    offeredReactors: offeredReactors,
  }

  run test_reaction_offer_opens_decision_frame = {
    val frame = opportunityAttackOfferFrame(Set(Fighter), Set())
    val opened = openReactionWindow(initialState, frame)
    all {
      assert(opened.interruptStack.length() == 1),
      assert(pendingReactionFrame(opened.interruptStack[0]) == HasPendingReactionFrame(frame)),
      assert(not(reactionDecisionClosedFrame(initialState, opened))),
    }
  }

  run test_reaction_decline_keeps_offer_open_for_remaining_reactor = {
    // In this bounded two-actor model the mover cannot also be its own threat,
    // so the historical multi-reactor OA frame was an invalid state. Strict
    // admission also rejects offered actors outside the eligible set and
    // already-complete frames.
    val moverIsThreat = opportunityAttackOfferFrame(Set(Fighter, Goblin), Set())
    val ineligibleWasOffered = opportunityAttackOfferFrame(Set(Fighter), Set(Goblin))
    val alreadyComplete = opportunityAttackOfferFrame(Set(Fighter), Set(Fighter))
    all {
      assert(not(pendingReactionFrameIsCanonical(moverIsThreat))),
      assert(not(pendingReactionFrameIsCanonical(ineligibleWasOffered))),
      assert(not(pendingReactionFrameIsCanonical(alreadyComplete))),
      assert(openReactionWindow(initialState, moverIsThreat) == initialState),
      assert(openReactionWindow(initialState, ineligibleWasOffered) == initialState),
      assert(openReactionWindow(initialState, alreadyComplete) == initialState),
    }
  }

  run test_final_reaction_decline_closes_frame_for_resume = {
    val frame = opportunityAttackOfferFrame(Set(Fighter), Set())
    val opened = openReactionWindow(initialState, frame)
    val declined = stateAfterDecliningReactionOffer(opened, Fighter)
    all {
      assert(declined.interruptStack.length() == 0),
      assert(declined.fighter.reactionAvailable),
      assert(reactionDecisionClosedFrame(opened, declined)),
    }
  }

  run test_reaction_spend_consumes_reactor_reaction = {
    val spent = spendReaction(initialState, Fighter)
    all {
      assert(not(spent.fighter.reactionAvailable)),
      assert(spent.goblin.reactionAvailable),
    }
  }

  run test_reactor_eligibility_requires_quota_capacity_and_nonterminal_lifecycle = {
    val spent = {
      ...initialState,
      fighter: { ...initialState.fighter, reactionAvailable: false },
    }
    val incapacitated = {
      ...initialState,
      fighter: { ...initialState.fighter, incapacitated: true },
    }
    val unconscious = {
      ...initialState,
      fighter: { ...initialState.fighter, unconscious: true },
    }
    val dead = {
      ...initialState,
      fighter: {
        ...initialState.fighter,
        hp: 0,
        deathFailures: 3,
      },
    }
    all {
      assert(reactorCanReact(initialState, Fighter)),
      assert(not(reactorCanReact(spent, Fighter))),
      assert(not(reactorCanReact(incapacitated, Fighter))),
      assert(not(reactorCanReact(unconscious, Fighter))),
      assert(not(reactorCanReact(dead, Fighter))),
    }
  }

  run test_interrupt_stack_resume_declines_nested_to_outer_replay = {
    val outer = openReactionWindow(initialState, opportunityAttackOfferFrame(Set(Fighter), Set()))
    val nested = openReactionWindow(outer, hellishRebukeOfferFrame(Goblin, Set()))
    val declined = stateAfterDecliningReactionOffer(nested, Goblin)
    all {
      assert(battleRuntimeInterruptStackReactionDepth(outer) == 1),
      assert(battleRuntimeInterruptStackReactionDepth(nested) == 2),
      assert(battleRuntimeInterruptStackWithinReactionDepth(nested)),
      assert(battleRuntimeInterruptStackDepthMatchesRuleCore(nested)),
      assert(battleRuntimeClosedReactionDecisionMatchesRuleCore(nested, declined)),
      assert(battleRuntimeInterruptStackReactionDepth(declined) == 1),
      assert(battleRuntimeInterruptStackDepthMatchesRuleCore(declined)),
    }
  }

  run test_interrupt_stack_resume_observes_active_effect_change_from_battle_state = {
    val opened = openReactionWindow(initialState, opportunityAttackOfferFrame(Set(Fighter), Set()))
    val shieldedBeforeResume = applyShieldReactionSpell(opened, Goblin)
    val declined = stateAfterDecliningReactionOffer(shieldedBeforeResume, Fighter)
    all {
      assert(battleRuntimeActiveEffectsChangedBetween(opened, shieldedBeforeResume)),
      assert(battleRuntimeReactionWindowStableAcrossActiveEffectChange(opened, shieldedBeforeResume)),
      assert(battleRuntimeClosedReactionDecisionMatchesRuleCore(shieldedBeforeResume, declined)),
      assert(battleRuntimeActiveEffectsChangedBetween(opened, declined)),
    }
  }
}
