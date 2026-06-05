// -*- mode: Bluespec; -*-

module unitFeatureQuickenedActionSpellProcedureSupportCoreExamples {
  import unitFeatureMetamagicOptionFactCore.* from "./unit-feature-metamagic-option-fact-core"
  import unitFeatureQuickenedActionSpellProcedureSupportCore.* from "./unit-feature-quickened-action-spell-procedure-support-core"

  run test_quickened_action_spell_procedure_support_admits_profile_subset = {
    all {
      assert(quickenedActionSpellProcedureSupportsBonusActionRewrite(
        QuickenedDirectRestorationProcedure,
      )),
      assert(quickenedActionSpellProcedureSupportsBonusActionRewrite(
        QuickenedScalarBuffProcedure,
      )),
      assert(quickenedActionSpellProcedureSupportsBonusActionRewrite(
        QuickenedSpellAttackProcedure,
      )),
      assert(selectedMetamagicOptionsSupportedByQuickenedActionSpell(
        QuickenedDirectRestorationProcedure,
        Set(quickenedSpellMetamagicFact),
      )),
      assert(selectedMetamagicOptionsSupportedByQuickenedActionSpell(
        QuickenedScalarBuffProcedure,
        Set(quickenedSpellMetamagicFact),
      )),
      assert(selectedMetamagicOptionsSupportedByQuickenedActionSpell(
        QuickenedSpellAttackProcedure,
        Set(quickenedSpellMetamagicFact),
      )),
    }
  }

  run test_quickened_action_spell_procedure_support_closes_deferred_classes = {
    all {
      assert(not(quickenedActionSpellProcedureSupportsBonusActionRewrite(
        QuickenedDamageProcedure,
      ))),
      assert(not(quickenedActionSpellProcedureSupportsBonusActionRewrite(
        QuickenedControlProcedure,
      ))),
      assert(not(quickenedActionSpellProcedureSupportsBonusActionRewrite(
        QuickenedOngoingEffectProcedure,
      ))),
      assert(not(quickenedActionSpellProcedureSupportsBonusActionRewrite(
        QuickenedOtherActionProcedure,
      ))),
      assert(not(selectedMetamagicOptionsSupportedByQuickenedActionSpell(
        QuickenedDamageProcedure,
        Set(quickenedSpellMetamagicFact),
      ))),
    }
  }

  run test_quickened_action_spell_procedure_support_requires_quickened_selection = {
    all {
      assert(not(selectedMetamagicOptionsSupportedByQuickenedActionSpell(
        QuickenedDirectRestorationProcedure,
        Set(empoweredSpellMetamagicFact),
      ))),
      assert(not(selectedMetamagicOptionsSupportedByQuickenedActionSpell(
        QuickenedScalarBuffProcedure,
        Set(quickenedSpellMetamagicFact, empoweredSpellMetamagicFact),
      ))),
    }
  }
}
