// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.METAMAGIC_SEEKING_SPELL_ATTACK_REROLL
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.metamagic-missed-spell-attack-reroll

module battleRuntimeMetamagicSeeking {
  import unitFeatureMetamagicOptionFactCore.* from "../shared-algebras/proofs/rule-core/unit-feature-metamagic-option-fact-core"
  import unitFeatureMetamagicSpellModificationAdmissionCore.* from "../shared-algebras/proofs/rule-core/unit-feature-metamagic-spell-modification-admission-core"
  import battleRuntimeModel.* from "./battle-runtime-model"

  type BattleRuntimeSeekingSpellAttackRerollResult = {
    finalTotal: int,
    finalNaturalD20: int,
    hit: bool,
    critical: bool,
    sorceryPointsRemaining: int,
  }
  type BattleRuntimeSeekingSpellAttackRerollProcedure =
    | SeekingSpellAttackDamageProcedure
    | SeekingSpellAttackSequenceProcedure
    | NonSeekingSpellAttackProcedure
  pure def seekingSpellProcedureSupportsMissedSpellAttackReroll(
    procedure: BattleRuntimeSeekingSpellAttackRerollProcedure,
  ): bool =
    match procedure {
      | SeekingSpellAttackDamageProcedure => true
      | SeekingSpellAttackSequenceProcedure => false
      | NonSeekingSpellAttackProcedure => false
    }
  pure def seekingSpellAttackRollHits(
    total: int,
    naturalD20: int,
    armorClass: int,
  ): bool =
    if (naturalD20 == 1)
      false
    else if (naturalD20 == 20)
      true
    else
      total >= armorClass
  pure def seekingSpellAttackRollIsCritical(naturalD20: int): bool =
    naturalD20 == 20
  pure def seekingSpellSelectedMetamagicOptions(
    castOptions: Set[BattleRuntimeMetamagicOptionFact],
  ): Set[BattleRuntimeMetamagicOptionFact] =
    castOptions.union(Set(seekingSpellMetamagicFact))
  pure def seekingSpellCanRerollMissedSpellAttack(
    procedure: BattleRuntimeSeekingSpellAttackRerollProcedure,
    originalTotal: int,
    originalNaturalD20: int,
    armorClass: int,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    castOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): bool =
    knownOptions.contains(seekingSpellMetamagicFact) and
    not(castOptions.contains(seekingSpellMetamagicFact)) and
    selectedMetamagicOptionsCanStack(seekingSpellSelectedMetamagicOptions(castOptions)) and
    selectedMetamagicOptionsAffordable(seekingSpellSelectedMetamagicOptions(castOptions), sorceryPointsRemaining) and
    seekingSpellProcedureSupportsMissedSpellAttackReroll(procedure) and
    not(seekingSpellAttackRollHits(originalTotal, originalNaturalD20, armorClass))
  pure def resolveSeekingSpellAttackReroll(
    procedure: BattleRuntimeSeekingSpellAttackRerollProcedure,
    originalTotal: int,
    originalNaturalD20: int,
    replacementTotal: int,
    replacementNaturalD20: int,
    armorClass: int,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    castOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): BattleRuntimeSeekingSpellAttackRerollResult = {
    val admitted = seekingSpellCanRerollMissedSpellAttack(
      procedure,
      originalTotal,
      originalNaturalD20,
      armorClass,
      knownOptions,
      castOptions,
      sorceryPointsRemaining,
    )
    val finalTotal = if (admitted) replacementTotal else originalTotal
    val finalNaturalD20 =
      if (admitted) replacementNaturalD20 else originalNaturalD20
    {
      finalTotal: finalTotal,
      finalNaturalD20: finalNaturalD20,
      hit: seekingSpellAttackRollHits(finalTotal, finalNaturalD20, armorClass),
      critical: seekingSpellAttackRollIsCritical(finalNaturalD20),
      sorceryPointsRemaining:
        if (admitted)
          sorceryPointsRemaining - selectedMetamagicSorceryPointCost(seekingSpellSelectedMetamagicOptions(castOptions))
        else
          sorceryPointsRemaining,
    }
  }
}
