// -*- mode: Bluespec; -*-

module unitFeatureMetamagicOptionFactCoreExamples {
  import unitFeatureMetamagicOptionFactCore.* from "./unit-feature-metamagic-option-fact-core"

  run test_metamagic_option_facts_project_supported_effect_kinds_and_costs = {
    all {
      assert(battleRuntimeMetamagicOptionEffectSupported(quickenedSpellMetamagicFact)),
      assert(battleRuntimeMetamagicOptionEffectSupported(distantSpellMetamagicFact)),
      assert(battleRuntimeMetamagicOptionEffectSupported(empoweredSpellMetamagicFact)),
      assert(battleRuntimeMetamagicOptionEffectSupported(carefulSpellMetamagicFact)),
      assert(battleRuntimeMetamagicOptionEffectSupported(heightenedSpellMetamagicFact)),
      assert(battleRuntimeMetamagicOptionEffectSupported(transmutedSpellMetamagicFact)),
      assert(battleRuntimeMetamagicOptionSorceryPointCost(quickenedSpellMetamagicFact) == 2),
      assert(battleRuntimeMetamagicOptionSorceryPointCost(distantSpellMetamagicFact) == 1),
      assert(battleRuntimeMetamagicOptionSorceryPointCost(empoweredSpellMetamagicFact) == 1),
      assert(battleRuntimeMetamagicOptionSorceryPointCost(carefulSpellMetamagicFact) == 1),
      assert(battleRuntimeMetamagicOptionSorceryPointCost(heightenedSpellMetamagicFact) == 2),
      assert(battleRuntimeMetamagicOptionSorceryPointCost(transmutedSpellMetamagicFact) == 1),
    }
  }

}
