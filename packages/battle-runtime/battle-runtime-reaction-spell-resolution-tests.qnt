// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.reaction-counterspell spell.reaction-shield

module battleRuntimeReactionSpellResolutionTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeDirectShieldReactionResolution.* from "./battle-runtime-direct-shield-reaction-resolution"
  import battleRuntimeSpellCastReactionResolution.* from "./battle-runtime-spell-cast-reaction-resolution"
  import battleRuntimeSpellAttackDirectResolution.* from "./battle-runtime-spell-attack-direct-resolution"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"

  pure def directCounterspellFrame(
    counterspell: PendingCounterspellReaction,
  ): PendingReactionFrame = {
    request: SpellCastCounterspellReactionRequest({
      counterspell: counterspell,
      continuation: CounterspellResumesRayOfFrost,
    }),
  }

  run test_reaction_continuations_are_narrowed_by_request_owner = {
    // The former omnibus continuation union admitted trigger/procedure/replay
    // combinations that no request owner could truthfully resume. These
    // assertions preserve the historical contract scenario at narrowed owner
    // boundaries.
    all {
      assert(directSpellAttackContinuationForShield(ShieldResumesRayOfFrost) == HasDirectSpellAttackReactionContinuation(DirectSpellAttackRayOfFrost)),
      assert(directSpellAttackContinuationForShield(ShieldResumesTrueStrikeWeaponAttack) == NoDirectSpellAttackReactionContinuation),
      assert(directSpellAttackContinuationForCounterspell(CounterspellResumesPoisonSpray) == HasDirectSpellAttackReactionContinuation(DirectSpellAttackPoisonSpray)),
      assert(directSpellAttackContinuationForCounterspell(CounterspellResumesSaveGateDamage) == NoDirectSpellAttackReactionContinuation),
    }
  }

  run test_shield_reaction_spell_interrupts_spell_attack_hit = {
    val awaiting = resolveRayOfFrost(initialState, 15, 10, 4, true)
    val resolved = resolveDirectShieldReactionOffer(awaiting, Goblin)
    all {
      assert(pendingReactionFrame(awaiting.interruptStack[0]) == HasPendingReactionFrame({
        request: AttackHitShieldReactionRequest(ShieldResumesRayOfFrost),
      })),
      assert(resolved.goblin.activeEffects.contains(ShieldArmorClassBonus)),
      assert(not(resolved.goblin.reactionAvailable)),
      assert(resolved.goblin.hp == 10),
      assert(not(resolved.actionAvailable)),
    }
  }

  run test_shield_reaction_spell_spends_turn_spell_slot = {
    val awaiting = resolveRayOfFrost(initialState, 15, 10, 4, true)
    val resolved = resolveDirectShieldReactionOffer(awaiting, Goblin)
    all {
      assert(resolved.goblin.activeEffects.contains(ShieldArmorClassBonus)),
      assert(not(resolved.goblin.reactionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Goblin)),
    }
  }

  run test_shield_reaction_spell_rejects_second_slot_spell_in_same_turn = {
    val resolved = resolveRayOfFrost({ ...initialState, spellSlotUsesThisTurn: Set(BattleCommittedSpellSlotUse(Goblin)) }, 15, 10, 4, true)
    all {
      assert(resolved.interruptStack == []),
      assert(resolved.goblin.hp == 6),
      assert(resolved.goblin.reactionAvailable),
      assert(not(resolved.actionAvailable)),
    }
  }

  run test_shield_unavailable_reactor_resumes_hit_without_phantom_window = {
    val incapacitatedTarget = {
      ...initialState,
      goblin: { ...initialState.goblin, incapacitated: true },
    }
    val resolved = resolveRayOfFrost(incapacitatedTarget, 15, 10, 4, true)
    all {
      assert(resolved.interruptStack == []),
      assert(resolved.goblin.hp == 6),
      assert(resolved.goblin.reactionAvailable),
      assert(not(resolved.actionAvailable)),
    }
  }

  run test_declining_direct_shield_resumes_spell_attack = {
    val awaiting = resolveRayOfFrost(initialState, 15, 10, 4, true)
    val resumed = declineDirectShieldReactionOfferAndResume(awaiting, Goblin)
    all {
      assert(resumed.interruptStack == []),
      assert(resumed.goblin.reactionAvailable),
      assert(resumed.goblin.hp == 6),
      assert(not(resumed.actionAvailable)),
    }
  }

  run test_direct_shield_owner_ignores_typed_hellish_rebuke_frame_without_spend = {
    val awaiting = openReactionWindow(initialState, {
      request: AfterDamageHellishRebukeReactionRequest({
        damaged: Fighter,
        slotLevel: 1,
      }),
    })
    all {
      assert(resolveDirectShieldReactionOffer(awaiting, Fighter) == awaiting),
      assert(declineDirectShieldReactionOfferAndResume(awaiting, Fighter) == awaiting),
    }
  }

  run test_reaction_spell_requests_derive_canonical_trigger_and_narrowed_owner = {
    val shieldFrame = {
      request: AttackHitShieldReactionRequest(ShieldResumesRayOfFrost),
    }
    val counterspellFrame = directCounterspellFrame({
        triggeringCaster: Goblin,
        triggeringCastingResource: CounterspellMagicAction,
        triggeringSpellUsesSlot: true,
        triggeringCasterConSaveSucceeded: false,
        counterspellSpellCastReaction: CounterspellSpellCastNoNestedReactionAttempt,
      })
    all {
      assert(reactionFrameTrigger(shieldFrame) == AttackHit),
      assert(match directShieldReactionCandidate(shieldFrame) { | HasDirectShieldReactionCandidate(_) => true | _ => false }),
      assert(reactionFrameTrigger(counterspellFrame) == SpellCast),
      assert(reactionFrameReactor(counterspellFrame) == Fighter),
      assert(match directSpellReactionCandidate(counterspellFrame) { | HasDirectSpellReactionCandidate(_) => true | _ => false }),
    }
  }

  run test_counterspell_reaction_spell_failed_save_ends_spell_cast_window_and_wastes_casting_action = {
    val awaiting = openReactionWindow(initialState, directCounterspellFrame({
        triggeringCaster: Fighter,
        triggeringCastingResource: CounterspellMagicAction,
        triggeringSpellUsesSlot: true,
        triggeringCasterConSaveSucceeded: false,
        counterspellSpellCastReaction: CounterspellSpellCastNoNestedReactionAttempt,
      }))
    val resolved = resolveDirectSpellReactionOffer(awaiting)
    all {
      assert(resolved.interruptStack == []),
      assert(not(resolved.goblin.reactionAvailable)),
      assert(not(battleActorHasSpellSlotUse(resolved, Fighter))),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Goblin)),
      assert(not(resolved.actionAvailable)),
      assert(resolved.goblin.hp == 10),
    }
  }

  run test_counterspell_reaction_spell_successful_save_resumes_lower_level_triggering_spell = {
    val awaiting = openReactionWindow(initialState, directCounterspellFrame({
        triggeringCaster: Fighter,
        triggeringCastingResource: CounterspellMagicAction,
        triggeringSpellUsesSlot: true,
        triggeringCasterConSaveSucceeded: true,
        counterspellSpellCastReaction: CounterspellSpellCastNoNestedReactionAttempt,
      }))
    val resolved = resolveDirectSpellReactionOffer(awaiting)
    all {
      assert(resolved.interruptStack == []),
      assert(not(resolved.goblin.reactionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Fighter)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Goblin)),
      assert(not(resolved.actionAvailable)),
      assert(resolved.goblin.hp == 6),
    }
  }

  run test_declining_direct_counterspell_resumes_triggering_spell_into_shield_window = {
    val awaiting = openReactionWindow(initialState, directCounterspellFrame({
        triggeringCaster: Fighter,
        triggeringCastingResource: CounterspellMagicAction,
        triggeringSpellUsesSlot: false,
        triggeringCasterConSaveSucceeded: true,
        counterspellSpellCastReaction: CounterspellSpellCastNoNestedReactionAttempt,
      }))
    val resumed = declineDirectSpellReactionOfferAndResume(awaiting)
    all {
      assert(resumed.interruptStack == [PendingReaction({
        request: AttackHitShieldReactionRequest(ShieldResumesRayOfFrost),
      })]),
      assert(resumed.goblin.reactionAvailable),
      assert(not(battleActorHasSpellSlotUse(resumed, Goblin))),
      assert(not(battleActorHasSpellSlotUse(resumed, Fighter))),
      assert(resumed.goblin.hp == 10),
      assert(resumed.actionAvailable),
    }
  }

  run test_counterspell_window_rejects_unavailable_reactor_or_triggering_slot_claim = {
    val frame = directCounterspellFrame({
      triggeringCaster: Fighter,
      triggeringCastingResource: CounterspellMagicAction,
      triggeringSpellUsesSlot: true,
      triggeringCasterConSaveSucceeded: true,
      counterspellSpellCastReaction: CounterspellSpellCastNoNestedReactionAttempt,
    })
    val reactorSlotSpent = commitActorSpellSlotUse(initialState, Goblin)
    val triggeringSlotSpent = commitActorSpellSlotUse(initialState, Fighter)
    all {
      assert(openReactionWindow(reactorSlotSpent, frame) == reactorSlotSpent),
      assert(openReactionWindow(triggeringSlotSpent, frame) == triggeringSlotSpent),
    }
  }

  run test_counterspell_reaction_spell_can_be_counterspelled_before_slot_commit = {
    val awaiting = openReactionWindow(initialState, directCounterspellFrame({
        triggeringCaster: Fighter,
        triggeringCastingResource: CounterspellMagicAction,
        triggeringSpellUsesSlot: false,
        triggeringCasterConSaveSucceeded: true,
        counterspellSpellCastReaction: CounterspellSpellCastNestedReactionAttempt({
          outerCounterspellCasterConSaveSucceeded: false,
        }),
      }))
    val resolved = resolveDirectSpellReactionOffer(awaiting)
    all {
      assert(resolved.interruptStack == []),
      assert(not(resolved.fighter.reactionAvailable)),
      assert(not(resolved.goblin.reactionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Fighter)),
      assert(not(battleActorHasSpellSlotUse(resolved, Goblin))),
      assert(not(resolved.actionAvailable)),
      assert(resolved.goblin.hp == 6),
    }
  }

  run test_counterspell_nested_reaction_requires_reaction_availability = {
    val reactionSpellState = {
      ...initialState,
      fighter: { ...initialState.fighter, reactionAvailable: false },
    }
    val awaiting = openReactionWindow(reactionSpellState, directCounterspellFrame({
        triggeringCaster: Fighter,
        triggeringCastingResource: CounterspellReaction,
        triggeringSpellUsesSlot: true,
        triggeringCasterConSaveSucceeded: true,
        counterspellSpellCastReaction: CounterspellSpellCastNestedReactionAttempt({
          outerCounterspellCasterConSaveSucceeded: true,
        }),
      }))
    val resolved = resolveDirectSpellReactionOffer(awaiting)
    all {
      assert(resolved.interruptStack == []),
      assert(not(resolved.fighter.reactionAvailable)),
      assert(not(resolved.goblin.reactionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Fighter)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Goblin)),
    }
  }
}
