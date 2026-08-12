// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.reaction-shield

module battleRuntimeSaveGatedShieldReactionResolutionTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeSaveGatedShieldReactionResolution.* from "./battle-runtime-save-gated-shield-reaction-resolution"
  import battleRuntimeSaveGatedDamageResolution.* from "./battle-runtime-save-gated-damage-resolution"

  run test_save_gated_shield_take_and_decline_replay_ice_knife = {
    val awaiting = resolveIceKnife(initialState, 15, 10, 4, false, false, false, 6, true, true)
    val taken = resolveSaveGatedShieldReactionOffer(awaiting, Goblin)
    val declined = declineSaveGatedShieldReactionOfferAndResume(awaiting, Goblin)
    all {
      assert(taken.interruptStack == []),
      assert(taken.goblin.activeEffects.contains(ShieldArmorClassBonus)),
      assert(not(taken.goblin.reactionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(taken, Fighter)),
      assert(not(taken.actionAvailable)),
      assert(declined.interruptStack == []),
      assert(declined.goblin.reactionAvailable),
      assert(battleActorHasCommittedSpellSlotUse(declined, Fighter)),
      assert(not(declined.actionAvailable)),
    }
  }

  run test_ice_knife_spell_attack_hit_opens_shield_reaction_before_damage = {
    val awaiting = resolveIceKnife(initialState, 15, 10, 4, false, false, false, 6, true, true)
    all {
      assert(pendingReactionFrame(awaiting.interruptStack[0]) == HasPendingReactionFrame({
        trigger: AttackHit,
        procedure: ShieldReactionProcedure,
        eligibleReactors: Set(Goblin),
        offeredReactors: Set(),
        continuation: ResumeIceKnife,
      })),
      assert(awaiting.goblin.hp == 10),
      assert(awaiting.actionAvailable),
      assert(not(battleActorHasSpellSlotUse(awaiting, Fighter))),
    }
  }

  run test_save_gated_shield_rejects_non_ice_knife_continuation_without_spend = {
    val awaiting = openReactionWindow(initialState, {
      trigger: AttackHit,
      procedure: ShieldReactionProcedure,
      eligibleReactors: Set(Goblin),
      offeredReactors: Set(),
      continuation: ResumeRayOfFrost,
    })
    all {
      assert(resolveSaveGatedShieldReactionOffer(awaiting, Goblin) == awaiting),
      assert(declineSaveGatedShieldReactionOfferAndResume(awaiting, Goblin) == awaiting),
    }
  }
}
