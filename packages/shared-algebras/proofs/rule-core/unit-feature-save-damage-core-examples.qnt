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
        savingThrowAbility: DexteritySavingThrowFact,
        incapacitated: false,
      }) == AdvantageSavingThrowMode),
      assert(passiveSavingThrowRollMode({
        savingThrowAbility: DexteritySavingThrowFact,
        incapacitated: true,
      }) == NormalSavingThrowMode),
      assert(passiveSavingThrowRollMode({
        savingThrowAbility: ConstitutionSavingThrowFact,
        incapacitated: false,
      }) == NormalSavingThrowMode),
    }
  }
}
