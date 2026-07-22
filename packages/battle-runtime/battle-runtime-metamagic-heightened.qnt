// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.METAMAGIC_HEIGHTENED_SAVE_DISADVANTAGE
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.metamagic-heightened-save-disadvantage

module battleRuntimeMetamagicHeightened {
  import unitFeatureMetamagicOptionFactCore.* from "../shared-algebras/proofs/rule-core/unit-feature-metamagic-option-fact-core"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeMetamagicSaveCommon.* from "./battle-runtime-metamagic-save-common"
  import battleRuntimeSavingThrowRollMode.* from "./battle-runtime-saving-throw-roll-mode"

  pure def heightenedSpellCanModifySaveSpell(
    procedure: BattleRuntimeSaveMetamagicProcedure,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): bool =
    namedSaveMetamagicCanModifySaveSpell(
      procedure,
      knownOptions,
      selectedOptions,
      heightenedSpellMetamagicFact,
      sorceryPointsRemaining,
    )

  pure def heightenedSpellTargetSelectionValid(
    spellTargets: Set[Actor],
    target: Actor,
  ): bool =
    spellTargets.contains(target)

  pure def savingThrowRollModeWithHeightenedSpell(
    baseMode: SavingThrowRollMode,
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    target: Actor,
    heightenedTarget: Actor,
  ): SavingThrowRollMode =
    if (
      selectedOptions == Set(heightenedSpellMetamagicFact) and
      target == heightenedTarget
    )
      combineSavingThrowRollModes(baseMode, DisadvantageSavingThrow)
    else
      baseMode
}
