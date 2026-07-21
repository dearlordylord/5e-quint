// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.METAMAGIC_DISTANT_CAST_RANGE_INCREASE
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.metamagic-cast-range-increase

module battleRuntimeMetamagicDistant {
  import unitFeatureMetamagicOptionFactCore.* from "../shared-algebras/proofs/rule-core/unit-feature-metamagic-option-fact-core"
  import unitFeatureMetamagicSpellModificationAdmissionCore.* from "../shared-algebras/proofs/rule-core/unit-feature-metamagic-spell-modification-admission-core"
  import battleRuntimeModel.* from "./battle-runtime-model"

  type BattleRuntimeDistantRangeResult = {
    rangeFeet: int,
    sorceryPointsRemaining: int,
  }
  type BattleRuntimeDistantRangeProcedure =
    | DistantRangeBearingTargetProcedure
    | NonDistantRangeProcedure
  type BattleRuntimeSpellRangeShape =
    | SpellRangeFeet({ feet: int })
    | SpellRangeTouch
    | SpellRangeSelf
  pure def distantSpellProcedureSupportsRangeProjection(
    procedure: BattleRuntimeDistantRangeProcedure,
  ): bool =
    match procedure {
      | DistantRangeBearingTargetProcedure => true
      | NonDistantRangeProcedure => false
    }
  pure def distantSpellRangeShapeAdmitted(spellRange: BattleRuntimeSpellRangeShape): bool =
    match spellRange {
      | SpellRangeTouch => true
      | SpellRangeFeet(data) => data.feet >= 5
      | SpellRangeSelf => false
    }
  pure def distantSpellEffectiveRangeFeet(spellRange: BattleRuntimeSpellRangeShape): int =
    match spellRange {
      | SpellRangeTouch => 30
      | SpellRangeFeet(data) => data.feet * 2
      | SpellRangeSelf => 0
    }
  pure def distantSpellCanModifyRangeSpell(
    procedure: BattleRuntimeDistantRangeProcedure,
    spellRange: BattleRuntimeSpellRangeShape,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): bool =
    selectedOptions == Set(distantSpellMetamagicFact) and
    selectedMetamagicSpellModificationAdmission(
      knownOptions,
      selectedOptions,
      sorceryPointsRemaining,
    ) and
    distantSpellProcedureSupportsRangeProjection(procedure) and
    distantSpellRangeShapeAdmitted(spellRange)
  pure def resolveDistantSpellRangeProjection(
    procedure: BattleRuntimeDistantRangeProcedure,
    spellRange: BattleRuntimeSpellRangeShape,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    selectedOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): BattleRuntimeDistantRangeResult = {
    val selectedCost = selectedMetamagicSorceryPointCost(selectedOptions)
    if (
      distantSpellCanModifyRangeSpell(
        procedure,
        spellRange,
        knownOptions,
        selectedOptions,
        sorceryPointsRemaining,
      )
    ) {
      {
        rangeFeet: distantSpellEffectiveRangeFeet(spellRange),
        sorceryPointsRemaining: sorceryPointsRemaining - selectedCost,
      }
    } else {
      {
        rangeFeet: 0,
        sorceryPointsRemaining: sorceryPointsRemaining,
      }
    }
  }
}
