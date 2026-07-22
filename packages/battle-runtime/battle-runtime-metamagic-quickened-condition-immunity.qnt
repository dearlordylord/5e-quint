// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-save-gated-condition-immunity unit-feature.metamagic-cast-governor-quickened

module battleRuntimeMetamagicQuickenedConditionImmunity {
  import unitFeatureMetamagicOptionFactCore.* from "../shared-algebras/proofs/rule-core/unit-feature-metamagic-option-fact-core"
  import unitFeatureMetamagicSpellModificationAdmissionCore.* from "../shared-algebras/proofs/rule-core/unit-feature-metamagic-spell-modification-admission-core"
  import unitFeatureQuickenedActionSpellProcedureSupportCore.* from "../shared-algebras/proofs/rule-core/unit-feature-quickened-action-spell-procedure-support-core"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeMetamagicQuickenedCommon.* from "./battle-runtime-metamagic-quickened-common"
  import battleRuntimeSaveConditionCalmEmotions.* from "./battle-runtime-save-condition-calm-emotions"

  pure def quickenedSpellCanModifySaveGatedConditionImmunity(
    state: BattleState,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): bool =
    quickenedActionSpellAdmission(state, QuickenedSaveGatedConditionImmunityProcedure, true, knownOptions, selectedOptions, sorceryPointsRemaining)
  pure def resolveQuickenedCalmEmotions(
    state: BattleState,
    fighterIncluded: bool,
    fighterSavingThrowSucceeded: bool,
    goblinIncluded: bool,
    goblinSavingThrowSucceeded: bool,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): BattleRuntimeQuickenedMetamagicResult = {
    val selectedCost = selectedMetamagicSorceryPointCost(selectedOptions)
    val actionProbe = { ...state, actionAvailable: true }
    if (quickenedSpellCanModifySaveGatedConditionImmunity(state, knownOptions, selectedOptions, sorceryPointsRemaining))
      quickenedActionSpellResult(
        state,
        resolveCalmEmotions(actionProbe, fighterIncluded, HumanoidCreature, fighterSavingThrowSucceeded, goblinIncluded, HumanoidCreature, goblinSavingThrowSucceeded),
        selectedCost,
        sorceryPointsRemaining,
      )
    else
      { state: state, sorceryPointsRemaining: sorceryPointsRemaining }
  }
}
