// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.metamagic-cast-governor-quickened

module battleRuntimeMetamagicQuickenedDirectCondition {
  import unitFeatureMetamagicOptionFactCore.* from "../shared-algebras/proofs/rule-core/unit-feature-metamagic-option-fact-core"
  import unitFeatureMetamagicSpellModificationAdmissionCore.* from "../shared-algebras/proofs/rule-core/unit-feature-metamagic-spell-modification-admission-core"
  import unitFeatureQuickenedActionSpellProcedureSupportCore.* from "../shared-algebras/proofs/rule-core/unit-feature-quickened-action-spell-procedure-support-core"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeMetamagicQuickenedCommon.* from "./battle-runtime-metamagic-quickened-common"
  import battleRuntimeInvisibility.* from "./battle-runtime-invisibility"

  pure def quickenedSpellCanModifyDirectCondition(
    state: BattleState,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): bool =
    quickenedActionSpellAdmission(state, QuickenedDirectConditionProcedure, true, knownOptions, selectedOptions, sorceryPointsRemaining)
  pure def resolveQuickenedInvisibility(
    state: BattleState,
    targets: Set[Actor],
    slotLevel: int,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): BattleRuntimeQuickenedMetamagicResult = {
    val selectedCost = selectedMetamagicSorceryPointCost(selectedOptions)
    val actionProbe = { ...state, actionAvailable: true }
    if (quickenedSpellCanModifyDirectCondition(state, knownOptions, selectedOptions, sorceryPointsRemaining))
      quickenedActionSpellResult(
        state,
        resolveInvisibilityConditionSpell(actionProbe, targets, slotLevel),
        selectedCost,
        sorceryPointsRemaining,
      )
    else
      { state: state, sorceryPointsRemaining: sorceryPointsRemaining }
  }
}
