// -*- mode: Bluespec; -*-

module battleRuntimeReactionContinuationTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeTriggeredReactionResolution.* from "./battle-runtime-triggered-reaction-resolution"
  import battleRuntimeAttackFacts.* from "./battle-runtime-attack-facts"
  import battleRuntimeMovement.* from "./battle-runtime-movement"
  import battleRuntimeOpportunityAttack.* from "./battle-runtime-opportunity-attack"

  run test_unavailable_reactor_prevents_opportunity_attack_window_admission = {
    val moved = moveFighter(
      { ...initialState, goblin: { ...initialState.goblin, reactionAvailable: false } },
      5,
      movementProvokesOpportunityAttack,
    )
    all {
      assert(moved.interruptStack == []),
      assert(moved.fighter.movementSpent == 5),
      assert(not(moved.goblin.reactionAvailable)),
    }
  }

  run test_unsupported_shield_continuation_is_rejected_without_reaction_spend = {
    // The former Shield + after-damage continuation frame is now
    // unconstructable. A valid Shield request remains unsupported by this
    // generic triggered-reaction owner and must be left to its narrowed owner.
    val awaiting = openReactionWindow(initialState, {
      request: AttackHitShieldReactionRequest(ShieldResumesRayOfFrost),
    })
    val resolved = resolveTriggeredReactionOffer(awaiting, Goblin)
    val declined = declineTriggeredReactionOfferAndResume(awaiting, Goblin)
    all {
      assert(resolved == awaiting),
      assert(declined == awaiting),
      assert(resolved.goblin.reactionAvailable),
    }
  }

  run test_declined_opportunity_attack_resumes_movement = {
    val awaiting = moveFighter(initialState, 5, movementProvokesOpportunityAttack)
    val resumed = declineTriggeredReactionOfferAndResume(awaiting, Goblin)
    all {
      assert(resumed.interruptStack == []),
      assert(resumed.fighter.movementSpent == 5),
      assert(resumed.goblin.reactionAvailable),
    }
  }

  run test_resolved_opportunity_attack_spends_reaction_damages_then_resumes_movement = {
    val awaiting = moveFighter(initialState, 5, movementProvokesOpportunityAttack)
    val resolved = resolveTriggeredReactionOffer(awaiting, Goblin)
    all {
      assert(resolved.interruptStack == []),
      assert(resolved.goblin.reactionAvailable == false),
      assert(resolved.fighter.hp == 6),
      assert(resolved.fighter.movementSpent == 5),
    }
  }

  run test_opportunity_attack_rejects_incapacitated_or_terminal_reactor = {
    val awaiting = moveFighter(initialState, 5, movementProvokesOpportunityAttack)
    val incapacitatedAwaiting = {
      ...awaiting,
      goblin: { ...awaiting.goblin, incapacitated: true },
    }
    val terminalAwaiting = {
      ...awaiting,
      goblin: { ...awaiting.goblin, hp: 0 },
    }
    val incapacitatedBeforeTrigger = {
      ...initialState,
      goblin: { ...initialState.goblin, incapacitated: true },
    }
    val movedWithoutWindow = moveFighter(
      incapacitatedBeforeTrigger,
      5,
      movementProvokesOpportunityAttack,
    )
    all {
      assert(awaiting.interruptStack.length() == 1),
      assert(resolveTriggeredReactionOffer(incapacitatedAwaiting, Goblin) == incapacitatedAwaiting),
      assert(resolveTriggeredReactionOffer(terminalAwaiting, Goblin) == terminalAwaiting),
      assert(movedWithoutWindow.interruptStack == []),
      assert(movedWithoutWindow.fighter.movementSpent == 5),
    }
  }

  run test_goblin_opportunity_attack_can_knock_out = {
    val result = resolveGoblinOpportunityAttackWithDisposition(withFighterHp(initialState, 3, 0), 20, 18, 1, true, KnockOut)
    all {
      assert(result.fighter.hp == 1),
      assert(result.fighter.unconscious),
    }
  }

  run test_resolved_reaction_releases_readied_spell_and_resumes_attack_continuation = {
    val readied = { ...readyFighterReadiedSpell(initialState), actionAvailable: true }
    val awaitingReaction = openReactionWindow(readied, {
      request: AttackHitFighterReadiedSpellReleaseReactionRequest({
        damage: 7,
      }),
    })
    val wrongReactor = resolveTriggeredReactionOffer(awaitingReaction, Goblin)
    val resolved = resolveTriggeredReactionOffer(awaitingReaction, Fighter)
    all {
      assert(wrongReactor == awaitingReaction),
      assert(not(resolved.fighter.readiedSpellHeld)),
      assert(not(resolved.fighter.concentrating)),
      assert(not(resolved.fighter.reactionAvailable)),
      assert(resolved.goblin.hp == 3),
      assert(not(resolved.actionAvailable)),
      assert(resolved.interruptStack == []),
    }
  }

}
