// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.METAMAGIC_CAREFUL_SAVE_PROTECTION
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.METAMAGIC_HEIGHTENED_SAVE_DISADVANTAGE
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.metamagic-careful-save-protection
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.metamagic-heightened-save-disadvantage

module battleRuntimeMetamagicSaveCommon {
  import unitFeatureMetamagicOptionFactCore.* from "../shared-algebras/proofs/rule-core/unit-feature-metamagic-option-fact-core"
  import unitFeatureMetamagicSpellModificationAdmissionCore.* from "../shared-algebras/proofs/rule-core/unit-feature-metamagic-spell-modification-admission-core"
  import battleRuntimeModel.* from "./battle-runtime-model"

  type BattleRuntimeSaveMetamagicProcedure =
    | SaveGatedDamageProcedure({ success: SaveGatedDamageSuccess })
    | SaveGatedNonDamageProcedure
    | SleepTargetAdmissionProcedure
    | NonSaveMetamagicProcedure

  pure def saveMetamagicProcedureSupportsSaveMetamagic(
    procedure: BattleRuntimeSaveMetamagicProcedure,
  ): bool =
    match procedure {
      | SaveGatedDamageProcedure(_) => true
      | SaveGatedNonDamageProcedure => true
      | SleepTargetAdmissionProcedure => false
      | NonSaveMetamagicProcedure => false
    }

  pure def namedSaveMetamagicCanModifySaveSpell(
    procedure: BattleRuntimeSaveMetamagicProcedure,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    requiredOption: BattleRuntimeMetamagicOptionFact,
    sorceryPointsRemaining: int,
  ): bool =
    selectedOptions == Set(requiredOption) and
    selectedMetamagicSpellModificationAdmission(
      knownOptions,
      selectedOptions,
      sorceryPointsRemaining,
    ) and
    saveMetamagicProcedureSupportsSaveMetamagic(procedure)
}
