// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.metamagic-cast-governor-quickened

module battleRuntimeMetamagicQuickenedRollModifier {
  import unitFeatureMetamagicOptionFactCore.* from "../shared-algebras/proofs/rule-core/unit-feature-metamagic-option-fact-core"
  import unitFeatureMetamagicSpellModificationAdmissionCore.* from "../shared-algebras/proofs/rule-core/unit-feature-metamagic-spell-modification-admission-core"
  import unitFeatureQuickenedActionSpellProcedureSupportCore.* from "../shared-algebras/proofs/rule-core/unit-feature-quickened-action-spell-procedure-support-core"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeMetamagicQuickenedCommon.* from "./battle-runtime-metamagic-quickened-common"
  import battleRuntimeRollModifierChoice.* from "./battle-runtime-roll-modifier-choice"

  pure def quickenedSpellCanModifyRollModifier(
    state: BattleState,
    invocation: RollModifierSpell,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): bool =
    quickenedActionSpellAdmission(
      state,
      QuickenedRollModifierProcedure,
      true,
      knownOptions,
      selectedOptions,
      sorceryPointsRemaining,
    )
  pure def resolveQuickenedRollModifierChoiceSpell(
    state: BattleState,
    invocation: RollModifierSpell,
    selectedTargets: Set[Actor],
    failedSaveTargets: Set[Actor],
    slotLevel: int,
    chosenAbility: Ability,
    chosenSkill: AbilityCheckSkill,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): BattleRuntimeQuickenedMetamagicResult = {
    val selectedCost = selectedMetamagicSorceryPointCost(selectedOptions)
    val canModify = quickenedSpellCanModifyRollModifier(
      state,
      invocation,
      knownOptions,
      selectedOptions,
      sorceryPointsRemaining,
    )
    val actionProbe = { ...state, actionAvailable: true }
    if (canModify)
      quickenedActionSpellResult(
        state,
        resolveRollModifierChoiceSpell(
          actionProbe,
          invocation,
          selectedTargets,
          failedSaveTargets,
          slotLevel,
          chosenAbility,
          chosenSkill,
        ),
        selectedCost,
        sorceryPointsRemaining,
      )
    else
      { state: state, sorceryPointsRemaining: sorceryPointsRemaining }
  }
}
