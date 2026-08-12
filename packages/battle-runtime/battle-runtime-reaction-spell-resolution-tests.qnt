// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.reaction-counterspell spell.reaction-shield

module battleRuntimeReactionSpellResolutionTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeDirectShieldReactionResolution.* from "./battle-runtime-direct-shield-reaction-resolution"
  import battleRuntimeSpellCastReactionResolution.* from "./battle-runtime-spell-cast-reaction-resolution"
  import battleRuntimeSpellAttackDirectResolution.* from "./battle-runtime-spell-attack-direct-resolution"
  import battleRuntimeSpellSlotClassification.* from "./battle-runtime-spell-slot-classification"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"

  pure def directCounterspellFrame(
    counterspell: PendingCounterspellReaction,
    eligibleReactors: Set[Actor],
  ): PendingReactionFrame = {
    request: SpellCastCounterspellReactionRequest({
      eligibleReactors: eligibleReactors,
      counterspell: counterspell,
      continuation: CounterspellResumesRayOfFrost,
    }),
    offeredReactors: Set(),
  }

  run test_reaction_continuations_have_battle_runtime_contract_kinds = {
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
        request: AttackHitShieldReactionRequest({
          eligibleReactors: Set(Goblin),
          continuation: ShieldResumesRayOfFrost,
        }),
        offeredReactors: Set(),
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
    val awaiting = resolveRayOfFrost({ ...initialState, spellSlotUsesThisTurn: Set(BattleCommittedSpellSlotUse(Goblin)) }, 15, 10, 4, true)
    assert(resolveDirectShieldReactionOffer(awaiting, Goblin) == awaiting)
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
        damager: Goblin,
        damaged: Fighter,
        slotLevel: 1,
      }),
      offeredReactors: Set(),
    })
    all {
      assert(resolveDirectShieldReactionOffer(awaiting, Fighter) == awaiting),
      assert(declineDirectShieldReactionOfferAndResume(awaiting, Fighter) == awaiting),
    }
  }

  run test_reaction_spell_requests_derive_canonical_trigger_and_narrowed_owner = {
    val shieldFrame = {
      request: AttackHitShieldReactionRequest({
        eligibleReactors: Set(Fighter),
        continuation: ShieldResumesRayOfFrost,
      }),
      offeredReactors: Set(),
    }
    val counterspellFrame = directCounterspellFrame({
        triggeringCaster: Goblin,
        triggeringCastingResource: CounterspellMagicAction,
        triggeringSpellLevel: 1,
        triggeringSpellUsesSlot: true,
        counterspellSlotLevel: 3,
        triggeringCasterConSaveSucceeded: false,
        counterspellSpellCastReaction: CounterspellSpellCastNotCountered,
      }, Set(Fighter))
    all {
      assert(reactionFrameTrigger(shieldFrame) == AttackHit),
      assert(match directShieldReactionCandidate(shieldFrame) { | HasDirectShieldReactionCandidate(_) => true | _ => false }),
      assert(reactionFrameTrigger(counterspellFrame) == SpellCast),
      assert(match directSpellReactionCandidate(counterspellFrame) { | HasDirectSpellReactionCandidate(_) => true | _ => false }),
    }
  }

  run test_counterspell_reaction_spell_failed_save_ends_spell_cast_window_and_wastes_casting_action = {
    val awaiting = openReactionWindow(initialState, directCounterspellFrame({
        triggeringCaster: Fighter,
        triggeringCastingResource: CounterspellMagicAction,
        triggeringSpellLevel: 1,
        triggeringSpellUsesSlot: true,
        counterspellSlotLevel: 3,
        triggeringCasterConSaveSucceeded: false,
        counterspellSpellCastReaction: CounterspellSpellCastNotCountered,
      }, Set(Goblin)))
    val resolved = resolveDirectSpellReactionOffer(awaiting, Goblin)
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
        triggeringSpellLevel: 1,
        triggeringSpellUsesSlot: true,
        counterspellSlotLevel: 3,
        triggeringCasterConSaveSucceeded: true,
        counterspellSpellCastReaction: CounterspellSpellCastNotCountered,
      }, Set(Goblin)))
    val resolved = resolveDirectSpellReactionOffer(awaiting, Goblin)
    all {
      assert(resolved.interruptStack == []),
      assert(not(resolved.goblin.reactionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Fighter)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Goblin)),
      assert(not(resolved.actionAvailable)),
      assert(resolved.goblin.hp == 6),
    }
  }

  run test_counterspell_reaction_spell_can_be_counterspelled_before_slot_commit = {
    val awaiting = openReactionWindow(initialState, directCounterspellFrame({
        triggeringCaster: Fighter,
        triggeringCastingResource: CounterspellMagicAction,
        triggeringSpellLevel: 1,
        triggeringSpellUsesSlot: false,
        counterspellSlotLevel: 3,
        triggeringCasterConSaveSucceeded: true,
        counterspellSpellCastReaction: CounterspellSpellCastCounteredByReaction({
          reactor: Fighter,
          counterspellSlotLevel: 3,
          counterspellCasterConSaveSucceeded: false,
        }),
      }, Set(Goblin)))
    val resolved = resolveDirectSpellReactionOffer(awaiting, Goblin)
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
        triggeringSpellLevel: 3,
        triggeringSpellUsesSlot: true,
        counterspellSlotLevel: 3,
        triggeringCasterConSaveSucceeded: true,
        counterspellSpellCastReaction: CounterspellSpellCastCounteredByReaction({
          reactor: Fighter,
          counterspellSlotLevel: 3,
          counterspellCasterConSaveSucceeded: true,
        }),
      }, Set(Goblin)))
    val resolved = resolveDirectSpellReactionOffer(awaiting, Goblin)
    all {
      assert(resolved.interruptStack == []),
      assert(not(resolved.fighter.reactionAvailable)),
      assert(not(resolved.goblin.reactionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Fighter)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Goblin)),
    }
  }
}
