// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.passive-ability-check-roll-mode unit-feature.passive-saving-throw-roll-mode unit-feature.save-damage-replacement
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES

module unitFeatureSaveDamageCore {
  import hitPointDamage.* from "./hit-point-damage"

  // RAW anchors:
  // - Classes/Barbarian.md: Danger Sense.
  // - Classes/Rogue.md and Classes/Monk.md: Evasion.
  // - .references/srd-5.2.1/Character-Origins.md:139 Dwarven Resilience.
  // - .references/srd-5.2.1/Character-Origins.md:212 Goliath Powerful Build.
  // - Playing-the-Game.md: Saving Throws and Damage.
  // - Rules-Glossary.md: Saving Throw and Incapacitated.
  // - UBIQUITOUS_LANGUAGE.md: Ability Check, Saving Throw, Grappled, and Damage.

  type SavingThrowAbilityFact =
    | StrengthSavingThrowFact
    | DexteritySavingThrowFact
    | ConstitutionSavingThrowFact
    | IntelligenceSavingThrowFact
    | WisdomSavingThrowFact
    | CharismaSavingThrowFact

  type PassiveSavingThrowRollMode =
    | NormalSavingThrowMode
    | AdvantageSavingThrowMode

  type PassiveSavingThrowRollModeProfile =
    | DexterityNotIncapacitatedSavingThrowAdvantageProfile
    | PoisonedConditionSavingThrowAdvantageProfile

  type PassiveAbilityCheckRollMode =
    | NormalAbilityCheckMode
    | AdvantageAbilityCheckMode

  type PassiveAbilityCheckRollModeProfile =
    | GrappledConditionEndAbilityCheckAdvantageProfile

  type SavingThrowConditionFact =
    | NoSavingThrowConditionFact
    | PoisonedSavingThrowConditionFact

  type AbilityCheckConditionEndFact =
    | NoAbilityCheckConditionEndFact
    | GrappledAbilityCheckConditionEndFact

  type PassiveSavingThrowRollModeFacts = {
    profile: PassiveSavingThrowRollModeProfile,
    savingThrowAbility: SavingThrowAbilityFact,
    savingThrowCondition: SavingThrowConditionFact,
    incapacitated: bool,
  }

  type PassiveAbilityCheckRollModeFacts = {
    profile: PassiveAbilityCheckRollModeProfile,
    abilityCheckConditionEnd: AbilityCheckConditionEndFact,
  }

  type SuccessfulSavingThrowDamage =
    | NoDamageOnSuccessfulSavingThrow
    | HalfDamageOnSuccessfulSavingThrow

  type SaveDamageReplacementFacts = {
    savingThrowAbility: SavingThrowAbilityFact,
    normalSuccessfulSavingThrowDamage: SuccessfulSavingThrowDamage,
    savingThrowSucceeded: bool,
    incapacitated: bool,
  }

  pure def successfulSavingThrowDamageAmount(
    successDamage: SuccessfulSavingThrowDamage,
    failedSavingThrowDamage: int
  ): int =
    match successDamage {
      | NoDamageOnSuccessfulSavingThrow => 0
      | HalfDamageOnSuccessfulSavingThrow => nonnegative(failedSavingThrowDamage) / 2
    }

  pure def successToZeroFailureToHalfReplacementApplies(
    facts: SaveDamageReplacementFacts
  ): bool = all {
    facts.savingThrowAbility == DexteritySavingThrowFact,
    facts.normalSuccessfulSavingThrowDamage == HalfDamageOnSuccessfulSavingThrow,
    not(facts.incapacitated),
  }

  pure def saveDamageAfterSuccessToZeroFailureToHalfReplacement(
    facts: SaveDamageReplacementFacts,
    failedSavingThrowDamage: int
  ): int =
    if (successToZeroFailureToHalfReplacementApplies(facts)) {
      if (facts.savingThrowSucceeded) 0 else nonnegative(failedSavingThrowDamage) / 2
    } else {
      if (facts.savingThrowSucceeded) {
        successfulSavingThrowDamageAmount(
          facts.normalSuccessfulSavingThrowDamage,
          failedSavingThrowDamage
        )
      } else nonnegative(failedSavingThrowDamage)
    }

  pure def passiveSavingThrowRollMode(
    facts: PassiveSavingThrowRollModeFacts
  ): PassiveSavingThrowRollMode =
    match facts.profile {
      | DexterityNotIncapacitatedSavingThrowAdvantageProfile =>
        if (
          facts.savingThrowAbility == DexteritySavingThrowFact and
          not(facts.incapacitated)
        ) AdvantageSavingThrowMode else NormalSavingThrowMode
      | PoisonedConditionSavingThrowAdvantageProfile =>
        if (facts.savingThrowCondition == PoisonedSavingThrowConditionFact)
          AdvantageSavingThrowMode
        else
          NormalSavingThrowMode
    }

  pure def passiveAbilityCheckRollMode(
    facts: PassiveAbilityCheckRollModeFacts
  ): PassiveAbilityCheckRollMode =
    match facts.profile {
      | GrappledConditionEndAbilityCheckAdvantageProfile =>
        if (facts.abilityCheckConditionEnd == GrappledAbilityCheckConditionEndFact)
          AdvantageAbilityCheckMode
        else
          NormalAbilityCheckMode
    }
}
