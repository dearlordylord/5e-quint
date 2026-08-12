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

  run test_direct_shield_rejects_malformed_continuation_without_spend = {
    // The former Shield + after-damage continuation frame is now
    // unconstructable. An AfterDamage request preserves this historical
    // scenario's owner-boundary rejection and no-spend assertions.
    val awaiting = openReactionWindow(initialState, {
      request: AfterDamageInterruptionReactionRequest({
        damageSource: Goblin,
        damaged: Fighter,
        eligibleReactors: Set(Fighter),
      }),
      offeredReactors: Set(),
    })
    all {
      assert(resolveDirectShieldReactionOffer(awaiting, Fighter) == awaiting),
      assert(declineDirectShieldReactionOfferAndResume(awaiting, Fighter) == awaiting),
    }
  }

  run test_reaction_spell_trigger_procedure_matrix_rejects_mismatched_frames = {
    // Trigger/procedure mismatches are now unconstructable. The historical
    // scenario instead proves each request discriminator derives its one
    // canonical trigger and procedure.
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
      assert(reactionFrameProcedure(shieldFrame) == ShieldReactionProcedure),
      assert(reactionFrameTrigger(counterspellFrame) == SpellCast),
      assert(reactionFrameProcedure(counterspellFrame) == CounterspellReactionProcedure({
        triggeringCaster: Goblin,
        triggeringCastingResource: CounterspellMagicAction,
        triggeringSpellLevel: 1,
        triggeringSpellUsesSlot: true,
        counterspellSlotLevel: 3,
        triggeringCasterConSaveSucceeded: false,
        counterspellSpellCastReaction: CounterspellSpellCastNotCountered,
      })),
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
