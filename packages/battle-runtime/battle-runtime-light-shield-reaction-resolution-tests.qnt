// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.reaction-shield

module battleRuntimeLightShieldReactionResolutionTests {
  import battleRuntimeLight.* from "./battle-runtime-light"
  import battleRuntimeLightSpellAttacks.* from "./battle-runtime-light-spell-attacks"
  import battleRuntimeLightSpellLifecycle.* from "./battle-runtime-light-spell-lifecycle"
  import battleRuntimeLightShieldReactionResolution.* from "./battle-runtime-light-shield-reaction-resolution"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"

  run test_light_shield_take_and_decline_replay_held_light_hurl = {
    val lit = resolveProduceFlameHeldLight(initialState)
    val hurlState = {
      ...lit,
      actionAvailable: true,
      bonusActionAvailable: true,
    }
    val awaiting = resolveProduceFlameHurl(hurlState, 15, 10, 5, true)
    val taken = resolveLightShieldReactionOffer(awaiting, Goblin)
    val declined = declineLightShieldReactionOfferAndResume(awaiting, Goblin)
    all {
      assert(taken.interruptStack == []),
      assert(taken.goblin.activeEffects.contains(ShieldArmorClassBonus)),
      assert(not(taken.goblin.reactionAvailable)),
      assert(taken.goblin.hp == 10),
      assert(not(taken.actionAvailable)),
      assert(declined.interruptStack == []),
      assert(declined.goblin.reactionAvailable),
      assert(declined.goblin.hp == 5),
      assert(not(declined.actionAvailable)),
    }
  }

  run test_light_shield_take_and_decline_replay_flame_blade_attack = {
    val blade = resolveFlameBlade(initialState, 2, 3)
    val nextTurn = endTurn(endTurn(blade))
    val awaiting = resolveFlameBladeAttack(nextTurn, 15, 10, 6, true)
    val taken = resolveLightShieldReactionOffer(awaiting, Goblin)
    val declined = declineLightShieldReactionOfferAndResume(awaiting, Goblin)
    all {
      assert(taken.interruptStack == []),
      assert(taken.goblin.activeEffects.contains(ShieldArmorClassBonus)),
      assert(not(taken.goblin.reactionAvailable)),
      assert(taken.goblin.hp == 10),
      assert(not(taken.actionAvailable)),
      assert(declined.interruptStack == []),
      assert(declined.goblin.reactionAvailable),
      assert(declined.goblin.hp == 1),
      assert(not(declined.actionAvailable)),
    }
  }
}
