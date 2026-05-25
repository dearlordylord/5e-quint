// -*- mode: Bluespec; -*-

module unitFeatureMetamagicSpellModificationAdmissionCoreExamples {
  import unitFeatureMetamagicOptionFactCore.* from "./unit-feature-metamagic-option-fact-core"
  import unitFeatureMetamagicSpellModificationAdmissionCore.* from "./unit-feature-metamagic-spell-modification-admission-core"

  pure def metamagicAdmissionKnownOptions: Set[BattleRuntimeMetamagicOptionFact] =
    Set(
      quickenedSpellMetamagicFact,
      empoweredSpellMetamagicFact,
      heightenedSpellMetamagicFact,
    )

  run test_metamagic_spell_modification_admits_known_affordable_selection = {
    all {
      assert(selectedMetamagicOptionsKnown(
        metamagicAdmissionKnownOptions,
        Set(quickenedSpellMetamagicFact),
      )),
      assert(selectedMetamagicOptionsAffordable(
        Set(quickenedSpellMetamagicFact),
        2,
      )),
      assert(selectedMetamagicSpellModificationAdmission(
        metamagicAdmissionKnownOptions,
        Set(quickenedSpellMetamagicFact),
        2,
      )),
    }
  }

  run test_metamagic_spell_modification_rejects_unknown_selection = {
    all {
      assert(not(selectedMetamagicOptionsKnown(
        Set(quickenedSpellMetamagicFact),
        Set(quickenedSpellMetamagicFact, empoweredSpellMetamagicFact),
      ))),
      assert(not(selectedMetamagicSpellModificationAdmission(
        Set(quickenedSpellMetamagicFact),
        Set(quickenedSpellMetamagicFact, empoweredSpellMetamagicFact),
        3,
      ))),
    }
  }

  run test_metamagic_spell_modification_rejects_unaffordable_selection = {
    all {
      assert(selectedMetamagicSorceryPointCost(Set(quickenedSpellMetamagicFact)) == 2),
      assert(not(selectedMetamagicOptionsAffordable(
        Set(quickenedSpellMetamagicFact),
        1,
      ))),
      assert(not(selectedMetamagicSpellModificationAdmission(
        metamagicAdmissionKnownOptions,
        Set(quickenedSpellMetamagicFact),
        1,
      ))),
    }
  }

  run test_metamagic_spell_modification_admits_stacking_exception = {
    val selected = Set(quickenedSpellMetamagicFact, empoweredSpellMetamagicFact)
    all {
      assert(selectedMetamagicSorceryPointCost(selected) == 3),
      assert(selectedMetamagicOptionsCanStack(selected)),
      assert(selectedMetamagicSpellModificationAdmission(
        metamagicAdmissionKnownOptions,
        selected,
        3,
      )),
    }
  }

  run test_metamagic_spell_modification_rejects_non_stackable_pair = {
    val selected = Set(quickenedSpellMetamagicFact, heightenedSpellMetamagicFact)
    all {
      assert(not(selectedMetamagicOptionsCanStack(selected))),
      assert(not(selectedMetamagicSpellModificationAdmission(
        metamagicAdmissionKnownOptions,
        selected,
        4,
      ))),
    }
  }
}
