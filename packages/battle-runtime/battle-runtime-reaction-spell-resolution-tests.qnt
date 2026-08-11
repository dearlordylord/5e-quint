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


  run test_shield_reaction_spell_interrupts_spell_attack_hit = {
    val awaiting = resolveRayOfFrost(initialState, 15, 10, 4, true)
    val resolved = resolveDirectShieldReactionOffer(awaiting, Goblin)
    all {
      assert(pendingReactionFrame(awaiting.interruptStack[0]) == HasPendingReactionFrame({
        trigger: AttackHit,
        procedure: ShieldReactionProcedure,
        eligibleReactors: Set(Goblin),
        offeredReactors: Set(),
        continuation: ResumeRayOfFrost,
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
      assert(resolved.fighter.activeEffects.contains(ShieldArmorClassBonus)),
      assert(not(resolved.fighter.reactionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Fighter)),
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

  run test_direct_shield_rejects_malformed_continuation_without_spend = {
    val awaiting = openReactionWindow(initialState, {
      trigger: AttackHit,
      procedure: ShieldReactionProcedure,
      eligibleReactors: Set(Fighter),
      offeredReactors: Set(),
      continuation: ResumeAfterDamage,
    })
    all {
      assert(resolveDirectShieldReactionOffer(awaiting, Fighter) == awaiting),
      assert(declineDirectShieldReactionOfferAndResume(awaiting, Fighter) == awaiting),
    }
  }

  run test_reaction_spell_trigger_procedure_matrix_rejects_mismatched_frames = {
    val spellCastShield = openReactionWindow(initialState, {
      trigger: SpellCast,
      procedure: ShieldReactionProcedure,
      eligibleReactors: Set(Fighter),
      offeredReactors: Set(),
      continuation: ResumeRayOfFrost,
    })
    val attackHitCounterspell = openReactionWindow(initialState, {
      trigger: AttackHit,
      procedure: CounterspellReactionProcedure({
        triggeringCaster: Goblin,
        triggeringCastingResource: CounterspellMagicAction,
        triggeringSpellLevel: 1,
        triggeringSpellUsesSlot: true,
        counterspellSlotLevel: 3,
        triggeringCasterConSaveSucceeded: false,
        counterspellSpellCastReaction: CounterspellSpellCastNotCountered,
      }),
      eligibleReactors: Set(Fighter),
      offeredReactors: Set(),
      continuation: ResumeRayOfFrost,
    })
    all {
      assert(spellCastShield == initialState),
      assert(attackHitCounterspell == initialState),
    }
  }

  run test_counterspell_reaction_spell_failed_save_ends_spell_cast_window_and_wastes_casting_action = {
    val awaiting = openReactionWindow(initialState, {
      trigger: SpellCast,
      procedure: CounterspellReactionProcedure({
        triggeringCaster: Fighter,
        triggeringCastingResource: CounterspellMagicAction,
        triggeringSpellLevel: 1,
        triggeringSpellUsesSlot: true,
        counterspellSlotLevel: 3,
        triggeringCasterConSaveSucceeded: false,
        counterspellSpellCastReaction: CounterspellSpellCastNotCountered,
      }),
      eligibleReactors: Set(Goblin),
      offeredReactors: Set(),
      continuation: ResumeRayOfFrost,
    })
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
    val awaiting = openReactionWindow(initialState, {
      trigger: SpellCast,
      procedure: CounterspellReactionProcedure({
        triggeringCaster: Fighter,
        triggeringCastingResource: CounterspellMagicAction,
        triggeringSpellLevel: 1,
        triggeringSpellUsesSlot: true,
        counterspellSlotLevel: 3,
        triggeringCasterConSaveSucceeded: true,
        counterspellSpellCastReaction: CounterspellSpellCastNotCountered,
      }),
      eligibleReactors: Set(Goblin),
      offeredReactors: Set(),
      continuation: ResumeRayOfFrost,
    })
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
    val awaiting = openReactionWindow(initialState, {
      trigger: SpellCast,
      procedure: CounterspellReactionProcedure({
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
      }),
      eligibleReactors: Set(Goblin),
      offeredReactors: Set(),
      continuation: ResumeRayOfFrost,
    })
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
    val awaiting = openReactionWindow(reactionSpellState, {
      trigger: SpellCast,
      procedure: CounterspellReactionProcedure({
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
      }),
      eligibleReactors: Set(Goblin),
      offeredReactors: Set(),
      continuation: ResumeRayOfFrost,
    })
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
