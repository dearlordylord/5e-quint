// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.metamagic-cast-governor-quickened

module battleRuntimeMetamagicQuickenedSaveCondition {
  import unitFeatureMetamagicOptionFactCore.* from "../shared-algebras/proofs/rule-core/unit-feature-metamagic-option-fact-core"
  import unitFeatureMetamagicSpellModificationAdmissionCore.* from "../shared-algebras/proofs/rule-core/unit-feature-metamagic-spell-modification-admission-core"
  import unitFeatureQuickenedActionSpellProcedureSupportCore.* from "../shared-algebras/proofs/rule-core/unit-feature-quickened-action-spell-procedure-support-core"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeMetamagicQuickenedCommon.* from "./battle-runtime-metamagic-quickened-common"
  import battleRuntimeSaveConditionColorSpray.* from "./battle-runtime-save-condition-color-spray"
  pure def quickenedSpellCanModifySaveGatedCondition(
    state: BattleState,
    invocation: SaveGatedConditionInvocation,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): bool =
    quickenedActionSpellAdmission(
      state,
      QuickenedSaveGatedConditionProcedure,
      true,
      knownOptions,
      selectedOptions,
      sorceryPointsRemaining,
    )
  pure def resolveQuickenedColorSpray(
    state: BattleState,
    fighterSavingThrowSucceeded: bool,
    goblinSavingThrowSucceeded: bool,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): BattleRuntimeQuickenedMetamagicResult = {
    val selectedCost = selectedMetamagicSorceryPointCost(selectedOptions)
    val canModify = quickenedSpellCanModifySaveGatedCondition(
      state,
      ColorSpraySaveGate,
      knownOptions,
      selectedOptions,
      sorceryPointsRemaining,
    )
    val actionProbe = { ...state, actionAvailable: true }
    if (canModify)
      quickenedActionSpellResult(
        state,
        resolveColorSpray(actionProbe, fighterSavingThrowSucceeded, goblinSavingThrowSucceeded),
        selectedCost,
        sorceryPointsRemaining,
      )
    else
      { state: state, sorceryPointsRemaining: sorceryPointsRemaining }
  }
}
