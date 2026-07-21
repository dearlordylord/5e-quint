// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.METAMAGIC_CAREFUL_SAVE_PROTECTION
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.metamagic-careful-save-protection

module battleRuntimeMetamagicCareful {
  import unitFeatureMetamagicOptionFactCore.* from "../shared-algebras/proofs/rule-core/unit-feature-metamagic-option-fact-core"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeMetamagicSaveCommon.* from "./battle-runtime-metamagic-save-common"

  pure def carefulSpellCanModifySaveSpell(
    procedure: BattleRuntimeSaveMetamagicProcedure,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): bool =
    namedSaveMetamagicCanModifySaveSpell(
      procedure,
      knownOptions,
      selectedOptions,
      carefulSpellMetamagicFact,
      sorceryPointsRemaining,
    )

  pure def carefulSpellMaxProtectedTargets(charismaModifier: int): int =
    if (charismaModifier < 1) 1 else charismaModifier

  pure def carefulSpellProtectedTargetSelectionValid(
    spellTargets: Set[Actor],
    protectedTargets: Set[Actor],
    charismaModifier: int,
  ): bool =
    protectedTargets.size() >= 1 and
    protectedTargets.size() <= carefulSpellMaxProtectedTargets(charismaModifier) and
    protectedTargets.forall(target => spellTargets.contains(target))

  pure def carefulSpellSuppressesSuccessfulHalfDamage(
    procedure: BattleRuntimeSaveMetamagicProcedure,
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    protectedTargets: Set[Actor],
    target: Actor,
    saveSucceeded: bool,
  ): bool =
    selectedOptions == Set(carefulSpellMetamagicFact) and
    saveSucceeded and
    protectedTargets.contains(target) and
    saveMetamagicProcedureHasHalfDamageSuccess(procedure)

  pure def saveMetamagicProcedureHasHalfDamageSuccess(
    procedure: BattleRuntimeSaveMetamagicProcedure,
  ): bool =
    match procedure {
      | SaveGatedDamageProcedure(data) => data.success == HalfDamageOnSaveSuccess
      | SaveGatedNonDamageProcedure => false
      | SleepTargetAdmissionProcedure => false
      | NonSaveMetamagicProcedure => false
    }
}
