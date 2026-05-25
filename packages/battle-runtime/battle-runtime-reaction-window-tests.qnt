// -*- mode: Bluespec; -*-

module battleRuntimeReactionWindowTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"

  pure def opportunityAttackOfferFrame(
    eligibleReactors: Set[Actor],
    offeredReactors: Set[Actor],
  ): PendingReactionFrame = {
    trigger: OpportunityAttack,
    procedure: OpportunityAttackReactionProcedure,
    eligibleReactors: eligibleReactors,
    offeredReactors: offeredReactors,
    continuation: ResumeMovement({ speedKind: WalkSpeedKind, movementCost: 10 }),
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
    val frame = opportunityAttackOfferFrame(Set(Fighter, Goblin), Set())
    val opened = openReactionWindow(initialState, frame)
    val declined = stateAfterDecliningReactionOffer(opened, Fighter)
    val expectedFrame = opportunityAttackOfferFrame(Set(Fighter, Goblin), Set(Fighter))
    all {
      assert(declined.interruptStack.length() == 1),
      assert(pendingReactionFrame(declined.interruptStack[0]) == HasPendingReactionFrame(expectedFrame)),
      assert(declined.fighter.reactionAvailable),
      assert(not(reactionDecisionClosedFrame(opened, declined))),
    }
  }

  run test_final_reaction_decline_closes_frame_for_resume = {
    val frame = opportunityAttackOfferFrame(Set(Fighter, Goblin), Set(Fighter))
    val opened = openReactionWindow(initialState, frame)
    val declined = stateAfterDecliningReactionOffer(opened, Goblin)
    all {
      assert(declined.interruptStack.length() == 0),
      assert(declined.goblin.reactionAvailable),
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
}
