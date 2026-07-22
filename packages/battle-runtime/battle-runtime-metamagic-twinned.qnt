// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.METAMAGIC_TWINNED_EFFECTIVE_LEVEL_EXTRA_TARGET
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.metamagic-effective-level-extra-target

module battleRuntimeMetamagicTwinned {
  import unitFeatureMetamagicOptionFactCore.* from "../shared-algebras/proofs/rule-core/unit-feature-metamagic-option-fact-core"
  import unitFeatureMetamagicSpellModificationAdmissionCore.* from "../shared-algebras/proofs/rule-core/unit-feature-metamagic-spell-modification-admission-core"
  import battleRuntimeModel.* from "./battle-runtime-model"

  type BattleRuntimeTwinnedTargetCountResult = {
    actualSlotLevel: int,
    effectiveSpellLevel: int,
    maximumTargets: int,
    sorceryPointsRemaining: int,
  }
  type BattleRuntimeTwinnedTargetCountProcedure =
    | TwinnedOneAdditionalCreatureTargetProcedure
    | NonTwinnedTargetCountProcedure
  pure def twinnedSpellProcedureSupportsTargetCountProjection(
    procedure: BattleRuntimeTwinnedTargetCountProcedure,
  ): bool =
    match procedure {
      | TwinnedOneAdditionalCreatureTargetProcedure => true
      | NonTwinnedTargetCountProcedure => false
    }
  pure def twinnedSpellCanModifyTargetCountSpell(
    procedure: BattleRuntimeTwinnedTargetCountProcedure,
    actualSlotLevel: int,
    effectiveSpellLevel: int,
    currentMaximumTargets: int,
    effectiveMaximumTargets: int,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): bool =
    selectedOptions == Set(twinnedSpellMetamagicFact) and
    selectedMetamagicSpellModificationAdmission(
      knownOptions,
      selectedOptions,
      sorceryPointsRemaining,
    ) and
    twinnedSpellProcedureSupportsTargetCountProjection(procedure) and
    actualSlotLevel >= 1 and
    actualSlotLevel < 9 and
    effectiveSpellLevel == actualSlotLevel + 1 and
    currentMaximumTargets >= 1 and
    effectiveMaximumTargets == currentMaximumTargets + 1
  pure def resolveTwinnedTargetCountProjection(
    procedure: BattleRuntimeTwinnedTargetCountProcedure,
    actualSlotLevel: int,
    effectiveSpellLevel: int,
    currentMaximumTargets: int,
    effectiveMaximumTargets: int,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): BattleRuntimeTwinnedTargetCountResult = {
    val selectedCost = selectedMetamagicSorceryPointCost(selectedOptions)
    if (
      twinnedSpellCanModifyTargetCountSpell(
        procedure,
        actualSlotLevel,
        effectiveSpellLevel,
        currentMaximumTargets,
        effectiveMaximumTargets,
        knownOptions,
        selectedOptions,
        sorceryPointsRemaining,
      )
    ) {
      {
        actualSlotLevel: actualSlotLevel,
        effectiveSpellLevel: effectiveSpellLevel,
        maximumTargets: effectiveMaximumTargets,
        sorceryPointsRemaining: sorceryPointsRemaining - selectedCost,
      }
    } else {
      {
        actualSlotLevel: actualSlotLevel,
        effectiveSpellLevel: actualSlotLevel,
        maximumTargets: currentMaximumTargets,
        sorceryPointsRemaining: sorceryPointsRemaining,
      }
    }
  }
}
