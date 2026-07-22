// -*- mode: Bluespec; -*-

module battleRuntimeSpellFactsConcentrationCleanupTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"

  run test_spell_facts_concentration_cleanup =
    assert(activeEffectsWithoutSpellEffectConcentration(Set(RayOfEnfeeblementD20Lifecycle({ source: Fighter, durationTicks: 10 }))) == Set())
}
