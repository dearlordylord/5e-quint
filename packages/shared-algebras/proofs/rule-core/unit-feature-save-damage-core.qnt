// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.passive-saving-throw-roll-mode unit-feature.save-damage-replacement
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES

module unitFeatureSaveDamageCore {
  import hitPointDamage.* from "./hit-point-damage"

  // RAW anchors:
  // - Classes/Barbarian.md: Danger Sense.
  // - Classes/Rogue.md and Classes/Monk.md: Evasion.
  // - Playing-the-Game.md: Saving Throws and Damage.
  // - Rules-Glossary.md: Saving Throw and Incapacitated.
  // - UBIQUITOUS_LANGUAGE.md: Saving Throw and Damage.

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

  type PassiveSavingThrowRollModeFacts = {
    savingThrowAbility: SavingThrowAbilityFact,
    incapacitated: bool,
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
    if (facts.savingThrowAbility == DexteritySavingThrowFact and not(facts.incapacitated))
      AdvantageSavingThrowMode
    else
      NormalSavingThrowMode
}
