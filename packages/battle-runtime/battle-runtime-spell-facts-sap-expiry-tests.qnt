// -*- mode: Bluespec; -*-

module battleRuntimeSpellFactsSapExpiryTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTimedEffects.* from "./battle-runtime-timed-effects"

  run test_spell_facts_sap_expiry = {
    val fighterSourcedRiders = Set(
      RayOfEnfeeblementNextAttackDisadvantage({ source: Fighter }),
    )
    all {
      assert(activeEffectsWithoutExpiredSapStartOfTurnRiders(fighterSourcedRiders, Fighter) == Set()),
      assert(activeEffectsWithoutExpiredSapStartOfTurnRiders(fighterSourcedRiders, Goblin) == fighterSourcedRiders),
    }
  }
}
