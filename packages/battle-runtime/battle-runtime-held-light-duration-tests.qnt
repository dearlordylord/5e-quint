// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-held-light-emitter

module battleRuntimeHeldLightDurationTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeLightEmitters.* from "./battle-runtime-light-emitters"
  import battleRuntimeLightSpellLifecycle.* from "./battle-runtime-light-spell-lifecycle"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"

  run test_produce_flame_held_light_expires_after_duration_tick = {
    val nearlyExpired = {
      ...resolveProduceFlameHeldLight(initialState),
      fighter: {
        ...initialState.fighter,
        activeEffects: Set(ProduceFlameHeldLight({ durationTicks: 1 })),
      },
    }
    val stillSameRound = endTurn(nearlyExpired)
    val nextRound = endTurn(stillSameRound)
    all {
      assert(activeEffectsContainProduceFlameHeldLight(stillSameRound.fighter.activeEffects)),
      assert(not(activeEffectsContainProduceFlameHeldLight(nextRound.fighter.activeEffects))),
      assert(battleRuntimeLightEmitters(stillSameRound).contains(produceFlameHeldLightEmitter(1))),
      assert(not(battleRuntimeLightEmitters(nextRound).contains(produceFlameHeldLightEmitter(1)))),
    }
  }
}
