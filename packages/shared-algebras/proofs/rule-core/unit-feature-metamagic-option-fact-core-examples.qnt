// -*- mode: Bluespec; -*-

module unitFeatureMetamagicOptionFactCoreExamples {
  import unitFeatureMetamagicOptionFactCore.* from "./unit-feature-metamagic-option-fact-core"

  run test_metamagic_option_facts_project_supported_effect_kinds_and_costs = {
    all {
      assert(battleRuntimeMetamagicOptionEffectSupported(quickenedSpellMetamagicFact)),
      assert(battleRuntimeMetamagicOptionEffectSupported(empoweredSpellMetamagicFact)),
      assert(battleRuntimeMetamagicOptionEffectSupported(carefulSpellMetamagicFact)),
      assert(battleRuntimeMetamagicOptionEffectSupported(heightenedSpellMetamagicFact)),
      assert(battleRuntimeMetamagicOptionSorceryPointCost(quickenedSpellMetamagicFact) == 2),
      assert(battleRuntimeMetamagicOptionSorceryPointCost(empoweredSpellMetamagicFact) == 1),
      assert(battleRuntimeMetamagicOptionSorceryPointCost(carefulSpellMetamagicFact) == 1),
      assert(battleRuntimeMetamagicOptionSorceryPointCost(heightenedSpellMetamagicFact) == 2),
    }
  }

  run test_metamagic_selected_sorcery_point_cost_sums_selected_options = {
    all {
      assert(selectedMetamagicSorceryPointCost(Set()) == 0),
      assert(selectedMetamagicSorceryPointCost(Set(quickenedSpellMetamagicFact)) == 2),
      assert(selectedMetamagicSorceryPointCost(
        Set(quickenedSpellMetamagicFact, empoweredSpellMetamagicFact)
      ) == 3),
    }
  }
}
