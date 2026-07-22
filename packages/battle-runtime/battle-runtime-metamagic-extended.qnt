// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.METAMAGIC_EXTENDED_CAST_DURATION_CONCENTRATION
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.metamagic-cast-duration-and-concentration

module battleRuntimeMetamagicExtended {
  import unitFeatureMetamagicOptionFactCore.* from "../shared-algebras/proofs/rule-core/unit-feature-metamagic-option-fact-core"
  import unitFeatureMetamagicSpellModificationAdmissionCore.* from "../shared-algebras/proofs/rule-core/unit-feature-metamagic-spell-modification-admission-core"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSavingThrowRollMode.* from "./battle-runtime-saving-throw-roll-mode"

  type BattleRuntimeExtendedDurationResult = {
    durationTicks: int,
    concentrationSavingThrowMode: SavingThrowRollMode,
    sorceryPointsRemaining: int,
  }
  type BattleRuntimeExtendedDurationProcedure =
    | ExtendedDurationBearingProcedure
    | NonExtendedDurationProcedure
  type BattleRuntimeSpellDurationShape =
    | SpellTimedDurationTicks({ durationTicks: int })
    | SpellConcentrationDurationTicks({ durationTicks: int })
    | SpellInstantaneousDuration
  pure def extendedSpellProcedureSupportsDurationProjection(
    procedure: BattleRuntimeExtendedDurationProcedure,
  ): bool =
    match procedure {
      | ExtendedDurationBearingProcedure => true
      | NonExtendedDurationProcedure => false
    }
  pure def extendedSpellMaximumDurationTicks = 14400
  pure def extendedSpellMinimumEligibleDurationTicks = 10
  pure def extendedSpellDurationShapeAdmitted(duration: BattleRuntimeSpellDurationShape): bool =
    match duration {
      | SpellTimedDurationTicks(data) =>
        data.durationTicks >= extendedSpellMinimumEligibleDurationTicks
      | SpellConcentrationDurationTicks(data) =>
        data.durationTicks >= extendedSpellMinimumEligibleDurationTicks
      | SpellInstantaneousDuration => false
    }
  pure def extendedSpellBaseDurationTicks(duration: BattleRuntimeSpellDurationShape): int =
    match duration {
      | SpellTimedDurationTicks(data) => data.durationTicks
      | SpellConcentrationDurationTicks(data) => data.durationTicks
      | SpellInstantaneousDuration => 0
    }
  pure def extendedSpellEffectiveDurationTicks(duration: BattleRuntimeSpellDurationShape): int = {
    val doubled = extendedSpellBaseDurationTicks(duration) * 2
    if (doubled > extendedSpellMaximumDurationTicks)
      extendedSpellMaximumDurationTicks
    else
      doubled
  }
  pure def extendedSpellConcentrationMaintenanceSavingThrowMode(
    duration: BattleRuntimeSpellDurationShape,
  ): SavingThrowRollMode =
    match duration {
      | SpellConcentrationDurationTicks(_) => AdvantageSavingThrow
      | SpellTimedDurationTicks(_) => NormalSavingThrow
      | SpellInstantaneousDuration => NormalSavingThrow
    }
  pure def extendedSpellCanModifyDurationSpell(
    procedure: BattleRuntimeExtendedDurationProcedure,
    duration: BattleRuntimeSpellDurationShape,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): bool =
    selectedOptions == Set(extendedSpellMetamagicFact) and
    selectedMetamagicSpellModificationAdmission(
      knownOptions,
      selectedOptions,
      sorceryPointsRemaining,
    ) and
    extendedSpellProcedureSupportsDurationProjection(procedure) and
    extendedSpellDurationShapeAdmitted(duration)
  pure def resolveExtendedSpellDurationProjection(
    procedure: BattleRuntimeExtendedDurationProcedure,
    duration: BattleRuntimeSpellDurationShape,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): BattleRuntimeExtendedDurationResult = {
    val selectedCost = selectedMetamagicSorceryPointCost(selectedOptions)
    if (
      extendedSpellCanModifyDurationSpell(
        procedure,
        duration,
        knownOptions,
        selectedOptions,
        sorceryPointsRemaining,
      )
    ) {
      {
        durationTicks: extendedSpellEffectiveDurationTicks(duration),
        concentrationSavingThrowMode:
          extendedSpellConcentrationMaintenanceSavingThrowMode(duration),
        sorceryPointsRemaining: sorceryPointsRemaining - selectedCost,
      }
    } else {
      {
        durationTicks: 0,
        concentrationSavingThrowMode: NormalSavingThrow,
        sorceryPointsRemaining: sorceryPointsRemaining,
      }
    }
  }
}
