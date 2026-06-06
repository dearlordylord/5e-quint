// -*- mode: Bluespec; -*-

module unitFeatureSaveDamageCoreExamples {
  import unitFeatureSaveDamageCore.* from "./unit-feature-save-damage-core"

  run test_evasion_replaces_dexterity_saving_throw_damage_only_when_not_incapacitated = {
    val success = saveDamageAfterSuccessToZeroFailureToHalfReplacement({
      savingThrowAbility: DexteritySavingThrowFact,
      normalSuccessfulSavingThrowDamage: HalfDamageOnSuccessfulSavingThrow,
      savingThrowSucceeded: true,
      incapacitated: false,
    }, 20)
    val failure = saveDamageAfterSuccessToZeroFailureToHalfReplacement({
      savingThrowAbility: DexteritySavingThrowFact,
      normalSuccessfulSavingThrowDamage: HalfDamageOnSuccessfulSavingThrow,
      savingThrowSucceeded: false,
      incapacitated: false,
    }, 20)
    val incapacitated = saveDamageAfterSuccessToZeroFailureToHalfReplacement({
      savingThrowAbility: DexteritySavingThrowFact,
      normalSuccessfulSavingThrowDamage: HalfDamageOnSuccessfulSavingThrow,
      savingThrowSucceeded: true,
      incapacitated: true,
    }, 20)
    all {
      assert(success == 0),
      assert(failure == 10),
      assert(incapacitated == 10),
    }
  }

  run test_danger_sense_grants_dexterity_saving_throw_advantage_when_not_incapacitated = {
    all {
      assert(passiveSavingThrowRollMode({
        profile: DexterityNotIncapacitatedSavingThrowAdvantageProfile,
        savingThrowAbility: DexteritySavingThrowFact,
        savingThrowCondition: NoSavingThrowConditionFact,
        incapacitated: false,
      }) == AdvantageSavingThrowMode),
      assert(passiveSavingThrowRollMode({
        profile: DexterityNotIncapacitatedSavingThrowAdvantageProfile,
        savingThrowAbility: DexteritySavingThrowFact,
        savingThrowCondition: NoSavingThrowConditionFact,
        incapacitated: true,
      }) == NormalSavingThrowMode),
      assert(passiveSavingThrowRollMode({
        profile: DexterityNotIncapacitatedSavingThrowAdvantageProfile,
        savingThrowAbility: ConstitutionSavingThrowFact,
        savingThrowCondition: NoSavingThrowConditionFact,
        incapacitated: false,
      }) == NormalSavingThrowMode),
    }
  }

  run test_dwarven_resilience_grants_saving_throw_advantage_for_poisoned_condition_scope = {
    all {
      assert(passiveSavingThrowRollMode({
        profile: PoisonedConditionSavingThrowAdvantageProfile,
        savingThrowAbility: ConstitutionSavingThrowFact,
        savingThrowCondition: PoisonedSavingThrowConditionFact,
        incapacitated: false,
      }) == AdvantageSavingThrowMode),
      assert(passiveSavingThrowRollMode({
        profile: PoisonedConditionSavingThrowAdvantageProfile,
        savingThrowAbility: WisdomSavingThrowFact,
        savingThrowCondition: NoSavingThrowConditionFact,
        incapacitated: false,
      }) == NormalSavingThrowMode),
      assert(passiveSavingThrowRollMode({
        profile: PoisonedConditionSavingThrowAdvantageProfile,
        savingThrowAbility: ConstitutionSavingThrowFact,
        savingThrowCondition: PoisonedSavingThrowConditionFact,
        incapacitated: true,
      }) == AdvantageSavingThrowMode),
    }
  }

  run test_powerful_build_grants_ability_check_advantage_to_end_grappled_only = {
    all {
      assert(passiveAbilityCheckRollMode({
        profile: GrappledConditionEndAbilityCheckAdvantageProfile,
        abilityCheckConditionEnd: GrappledAbilityCheckConditionEndFact,
      }) == AdvantageAbilityCheckMode),
      assert(passiveAbilityCheckRollMode({
        profile: GrappledConditionEndAbilityCheckAdvantageProfile,
        abilityCheckConditionEnd: NoAbilityCheckConditionEndFact,
      }) == NormalAbilityCheckMode),
    }
  }
}
