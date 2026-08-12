// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.reaction-counterspell

module battleRuntimeSaveGatedCounterspellResolutionTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeSaveGatedCounterspellResolution.* from "./battle-runtime-save-gated-counterspell-resolution"

  run test_counterspell_successful_save_resumes_ice_knife = {
    val awaiting = openReactionWindow(initialState, {
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
        continuation: CounterspellResumesIceKnife,
      }),
    })
    val resolved = resolveSaveGatedCounterspellReactionOffer(awaiting, Goblin)
    all {
      assert(resolved.interruptStack == []),
      assert(not(resolved.goblin.reactionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Fighter)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Goblin)),
      assert(not(resolved.actionAvailable)),
    }
  }

  run test_declined_counterspell_resumes_ice_knife_into_shield_window = {
    val awaiting = openReactionWindow(initialState, {
      request: SpellCastCounterspellReactionRequest({
        counterspell: {
          triggeringCaster: Fighter,
          triggeringCastingResource: CounterspellMagicAction,
          triggeringSpellLevel: 1,
          triggeringSpellUsesSlot: true,
          counterspellSlotLevel: 3,
          triggeringCasterConSaveSucceeded: false,
          counterspellSpellCastReaction: CounterspellSpellCastNotCountered,
        },
        continuation: CounterspellResumesIceKnife,
      }),
    })
    val resumed = declineSaveGatedCounterspellReactionOfferAndResume(
      awaiting,
      Goblin,
    )
    all {
      assert(battleActorHasCommittedSpellSlotUse(resumed, Fighter)),
      assert(not(battleActorHasCommittedSpellSlotUse(resumed, Goblin))),
      assert(resumed.interruptStack == [PendingReaction({
        request: AttackHitShieldReactionRequest(ShieldResumesIceKnife),
      })]),
      assert(resumed.actionAvailable),
      assert(resumed.goblin.reactionAvailable),
    }
  }
}
