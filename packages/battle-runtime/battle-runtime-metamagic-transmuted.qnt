// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.METAMAGIC_TRANSMUTED_DAMAGE_TYPE_SUBSTITUTION
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.metamagic-damage-type-substitution

module battleRuntimeMetamagicTransmuted {
  import unitFeatureMetamagicOptionFactCore.* from "../shared-algebras/proofs/rule-core/unit-feature-metamagic-option-fact-core"
  import unitFeatureMetamagicSpellModificationAdmissionCore.* from "../shared-algebras/proofs/rule-core/unit-feature-metamagic-spell-modification-admission-core"
  import battleRuntimeModel.* from "./battle-runtime-model"

  type BattleRuntimeTransmutedDamageProcedure =
    | TransmutedSaveGatedDamageProcedure
    | TransmutedSpellAttackDamageProcedure
    | TransmutedSpellAttackSequenceProcedure
    | NonTransmutedDamageProcedure
  pure def transmutedSpellDamageTypeAllowed(damageType: DamageType): bool =
    damageType == Acid or
    damageType == Cold or
    damageType == Fire or
    damageType == Lightning or
    damageType == Poison or
    damageType == Thunder
  pure def transmutedSpellProcedureSupportsDamageSubstitution(
    procedure: BattleRuntimeTransmutedDamageProcedure,
  ): bool =
    match procedure {
      | TransmutedSaveGatedDamageProcedure => true
      | TransmutedSpellAttackDamageProcedure => true
      | TransmutedSpellAttackSequenceProcedure => true
      | NonTransmutedDamageProcedure => false
    }
  pure def transmutedSpellCanModifyDamageSpell(
    procedure: BattleRuntimeTransmutedDamageProcedure,
    sourceDamageType: DamageType,
    targetDamageType: DamageType,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): bool =
    selectedOptions == Set(transmutedSpellMetamagicFact) and
    selectedMetamagicSpellModificationAdmission(
      knownOptions,
      selectedOptions,
      sorceryPointsRemaining,
    ) and
    transmutedSpellProcedureSupportsDamageSubstitution(procedure) and
    transmutedSpellDamageTypeAllowed(sourceDamageType) and
    transmutedSpellDamageTypeAllowed(targetDamageType) and
    sourceDamageType != targetDamageType
  pure def transmutedSpellDamageTypeProjection(
    procedure: BattleRuntimeTransmutedDamageProcedure,
    sourceDamageType: DamageType,
    targetDamageType: DamageType,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): DamageType =
    if (
      transmutedSpellCanModifyDamageSpell(
        procedure,
        sourceDamageType,
        targetDamageType,
        knownOptions,
        selectedOptions,
        sorceryPointsRemaining,
      )
    )
      targetDamageType
    else
      sourceDamageType
}
