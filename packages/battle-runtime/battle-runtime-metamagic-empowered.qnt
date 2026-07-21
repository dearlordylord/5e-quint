// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.METAMAGIC_EMPOWERED_DAMAGE_DICE_REROLL
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.metamagic-damage-dice-reroll

module battleRuntimeMetamagicEmpowered {
  import unitFeatureMetamagicOptionFactCore.* from "../shared-algebras/proofs/rule-core/unit-feature-metamagic-option-fact-core"
  import unitFeatureMetamagicSpellModificationAdmissionCore.* from "../shared-algebras/proofs/rule-core/unit-feature-metamagic-spell-modification-admission-core"
  import battleRuntimeModel.* from "./battle-runtime-model"

  type BattleRuntimeEmpoweredSpellDamageRerollResult = {
    finalDamageTotal: int,
    selectedDice: int,
    sorceryPointsRemaining: int,
  }
  type BattleRuntimeEmpoweredSpellDamageDieReroll = {
    original: int,
    replacement: int,
  }
  type BattleRuntimeEmpoweredSpellDamageRerollProcedure =
    | EmpoweredSpellAttackDamageProcedure
    | EmpoweredSpellAttackSequenceProcedure
    | NonEmpoweredSpellDamageProcedure
  pure def empoweredSpellProcedureSupportsDamageDiceReroll(
    procedure: BattleRuntimeEmpoweredSpellDamageRerollProcedure,
  ): bool =
    match procedure {
      | EmpoweredSpellAttackDamageProcedure => true
      | EmpoweredSpellAttackSequenceProcedure => false
      | NonEmpoweredSpellDamageProcedure => false
    }
  pure def empoweredSpellSelectedMetamagicOptions(
    castOptions: Set[BattleRuntimeMetamagicOptionFact],
  ): Set[BattleRuntimeMetamagicOptionFact] =
    castOptions.union(Set(empoweredSpellMetamagicFact))
  pure def empoweredSpellMaximumSelectedDice(charismaModifier: int): int =
    if (charismaModifier < 1) 1 else charismaModifier
  pure def empoweredSpellSelectedDamageDiceCount(
    selectedRerolls: BattleRuntimeEmpoweredSpellDamageDieReroll -> int,
  ): int =
    selectedRerolls.keys().fold(0, (total, reroll) => total + selectedRerolls.get(reroll))
  pure def empoweredSpellSelectedOriginalTotal(
    selectedRerolls: BattleRuntimeEmpoweredSpellDamageDieReroll -> int,
  ): int =
    selectedRerolls.keys().fold(0, (total, reroll) => total + reroll.original * selectedRerolls.get(reroll))
  pure def empoweredSpellReplacementTotal(
    selectedRerolls: BattleRuntimeEmpoweredSpellDamageDieReroll -> int,
  ): int =
    selectedRerolls.keys().fold(0, (total, reroll) => total + reroll.replacement * selectedRerolls.get(reroll))
  pure def empoweredSpellOriginalDamageTotal(
    originalDamageDice: int -> int,
  ): int =
    originalDamageDice.keys().fold(0, (total, result) => total + result * originalDamageDice.get(result))
  pure def empoweredSpellSelectedOriginalCount(
    selectedRerolls: BattleRuntimeEmpoweredSpellDamageDieReroll -> int,
    original: int,
  ): int =
    selectedRerolls.keys().fold(0, (total, reroll) =>
      if (reroll.original == original)
        total + selectedRerolls.get(reroll)
      else
        total
    )
  pure def empoweredSpellOriginalDamageDieCount(
    originalDamageDice: int -> int,
    original: int,
  ): int =
    if (originalDamageDice.keys().contains(original)) originalDamageDice.get(original) else 0
  pure def empoweredSpellSelectedDamageRerollsValid(
    originalDamageDice: int -> int,
    selectedRerolls: BattleRuntimeEmpoweredSpellDamageDieReroll -> int,
    damageDieSize: int,
  ): bool =
    originalDamageDice.keys().size() > 0 and
    originalDamageDice.keys().forall(result =>
      result >= 1 and
      result <= damageDieSize and
      originalDamageDice.get(result) > 0
    ) and
    selectedRerolls.keys().size() > 0 and
    selectedRerolls.keys().forall(reroll =>
      selectedRerolls.get(reroll) > 0 and
      reroll.original >= 1 and
      reroll.original <= damageDieSize and
      reroll.replacement >= 1 and
      reroll.replacement <= damageDieSize and
      empoweredSpellSelectedOriginalCount(selectedRerolls, reroll.original) <=
        empoweredSpellOriginalDamageDieCount(originalDamageDice, reroll.original)
    )
  pure def empoweredSpellCanRerollDamageDice(
    procedure: BattleRuntimeEmpoweredSpellDamageRerollProcedure,
    originalDamageDice: int -> int,
    selectedRerolls: BattleRuntimeEmpoweredSpellDamageDieReroll -> int,
    damageDieSize: int,
    charismaModifier: int,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    castOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): bool = {
    val selectedDice = empoweredSpellSelectedDamageDiceCount(selectedRerolls)
    knownOptions.contains(empoweredSpellMetamagicFact) and
    not(castOptions.contains(empoweredSpellMetamagicFact)) and
    empoweredSpellSelectedDamageRerollsValid(originalDamageDice, selectedRerolls, damageDieSize) and
    selectedDice <= empoweredSpellMaximumSelectedDice(charismaModifier) and
    selectedMetamagicOptionsCanStack(empoweredSpellSelectedMetamagicOptions(castOptions)) and
    selectedMetamagicOptionsAffordable(empoweredSpellSelectedMetamagicOptions(castOptions), sorceryPointsRemaining) and
    empoweredSpellProcedureSupportsDamageDiceReroll(procedure)
  }
  pure def resolveEmpoweredSpellDamageReroll(
    procedure: BattleRuntimeEmpoweredSpellDamageRerollProcedure,
    originalDamageDice: int -> int,
    damageDieSize: int,
    selectedRerolls: BattleRuntimeEmpoweredSpellDamageDieReroll -> int,
    charismaModifier: int,
    knownOptions: Set[BattleRuntimeMetamagicOptionFact],
    castOptions: Set[BattleRuntimeMetamagicOptionFact],
    sorceryPointsRemaining: int,
  ): BattleRuntimeEmpoweredSpellDamageRerollResult = {
    val selectedDice = empoweredSpellSelectedDamageDiceCount(selectedRerolls)
    val originalDamageTotal = empoweredSpellOriginalDamageTotal(originalDamageDice)
    val admitted = empoweredSpellCanRerollDamageDice(
      procedure,
      originalDamageDice,
      selectedRerolls,
      damageDieSize,
      charismaModifier,
      knownOptions,
      castOptions,
      sorceryPointsRemaining,
    )
    {
      finalDamageTotal:
        if (admitted)
          originalDamageTotal - empoweredSpellSelectedOriginalTotal(selectedRerolls) + empoweredSpellReplacementTotal(selectedRerolls)
        else
          originalDamageTotal,
      selectedDice: if (admitted) selectedDice else 0,
      sorceryPointsRemaining:
        if (admitted)
          sorceryPointsRemaining - selectedMetamagicSorceryPointCost(empoweredSpellSelectedMetamagicOptions(castOptions))
        else
          sorceryPointsRemaining,
    }
  }
}
