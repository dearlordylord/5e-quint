// -*- mode: Bluespec; -*-

module battleRuntimeSpellFactsSapExpiryTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeRayOfEnfeeblement.* from "./battle-runtime-ray-of-enfeeblement"
  import battleRuntimeTimedEffects.* from "./battle-runtime-timed-effects"

  run test_spell_facts_sap_expiry = {
    val raySuccess = resolveRayOfEnfeeblementD20Lifecycle(initialState, Goblin, true)
    all {
      assert(activeEffectsWithoutExpiredSapStartOfTurnRiders(raySuccess.goblin.activeEffects, Fighter) == Set()),
      assert(activeEffectsWithoutExpiredSapStartOfTurnRiders(raySuccess.goblin.activeEffects, Goblin) == raySuccess.goblin.activeEffects),
    }
  }
}
