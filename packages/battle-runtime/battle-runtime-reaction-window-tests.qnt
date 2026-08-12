// -*- mode: Bluespec; -*-

module battleRuntimeReactionWindowTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"

  pure def opportunityAttackOfferFrame(
    mover: Actor,
  ): PendingReactionFrame = {
    request: OpportunityAttackReactionRequest({
      mover: mover,
      continuation: OpportunityAttackResumesMovement({
        speedKind: WalkSpeedKind,
        movementCost: 10,
      }),
    }),
  }

  pure def hellishRebukeOfferFrame(
    damaged: Actor,
  ): PendingReactionFrame = {
    request: AfterDamageHellishRebukeReactionRequest({
      damaged: damaged,
      slotLevel: 1,
    }),
  }

  run test_reaction_offer_opens_decision_frame = {
    val frame = opportunityAttackOfferFrame(Goblin)
    val opened = openReactionWindow(initialState, frame)
    all {
      assert(opened.interruptStack.length() == 1),
      assert(pendingReactionFrame(opened.interruptStack[0]) == HasPendingReactionFrame(frame)),
      assert(not(reactionDecisionClosedFrame(initialState, opened))),
    }
  }

  run test_opportunity_attack_request_derives_opposing_threat = {
    val frame = opportunityAttackOfferFrame(Goblin)
    all {
      assert(reactionFrameReactor(frame) == Fighter),
      assert(pendingReactionFrameIsCanonical(frame)),
    }
  }

  run test_final_reaction_decline_closes_frame_for_resume = {
    val frame = opportunityAttackOfferFrame(Goblin)
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
      assert(openReactionWindow(spent, opportunityAttackOfferFrame(Goblin)) == spent),
      assert(openReactionWindow(incapacitated, opportunityAttackOfferFrame(Goblin)) == incapacitated),
      assert(openReactionWindow(unconscious, opportunityAttackOfferFrame(Goblin)) == unconscious),
      assert(openReactionWindow(dead, opportunityAttackOfferFrame(Goblin)) == dead),
    }
  }

  run test_spell_reaction_window_requires_reactor_slot_and_pending_triggering_slot_claim = {
    val shieldFrame = shieldReactionFrame(ShieldResumesRayOfFrost)
    val counterspellFrame = {
      request: SpellCastCounterspellReactionRequest({
        counterspell: {
          triggeringCaster: Fighter,
          triggeringCastingResource: CounterspellMagicAction,
          triggeringSpellLevel: 1,
          triggeringSpellUsesSlot: true,
          counterspellSlotLevel: 3,
          triggeringCasterConSaveSucceeded: true,
          counterspellSpellCastReaction: CounterspellSpellCastNotCountered,
        },
        continuation: CounterspellResumesRayOfFrost,
      }),
    }
    val hellishFrame = hellishRebukeOfferFrame(Fighter)
    val goblinSlotSpent = commitActorSpellSlotUse(initialState, Goblin)
    val fighterSlotSpent = commitActorSpellSlotUse(initialState, Fighter)
    val openedCounterspell = openReactionWindow(initialState, counterspellFrame)
    all {
      assert(openedCounterspell.spellSlotUsesThisTurn.contains(BattlePendingSpellSlotUse(Fighter))),
      assert(openReactionWindow(goblinSlotSpent, shieldFrame) == goblinSlotSpent),
      assert(openReactionWindow(goblinSlotSpent, counterspellFrame) == goblinSlotSpent),
      assert(openReactionWindow(fighterSlotSpent, counterspellFrame) == fighterSlotSpent),
      assert(openReactionWindow(fighterSlotSpent, hellishFrame) == fighterSlotSpent),
    }
  }

  run test_interrupt_stack_resume_declines_nested_to_outer_replay = {
    val outer = openReactionWindow(initialState, opportunityAttackOfferFrame(Goblin))
    val nested = openReactionWindow(outer, hellishRebukeOfferFrame(Goblin))
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
    val opened = openReactionWindow(initialState, opportunityAttackOfferFrame(Goblin))
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
