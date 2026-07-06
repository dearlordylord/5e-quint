// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.cunning-strike
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS

module unitFeatureCunningStrikeCore {
  import creatureSizeOrder.* from "./creature-size-order"

  // RAW anchors:
  // - .references/srd-5.2.1/Classes/Rogue.md:97-107: Cunning Strike trigger,
  //   1d6 die cost before damage, immediate timing, Dexterity-based save DC,
  //   Poison, Trip, and Withdraw.
  // - UBIQUITOUS_LANGUAGE.md: Sneak Attack, Saving Throw, Condition, Poisoned,
  //   Prone, Size, Speed, Movement, Opportunity Attack, and Equipment.

  type CunningStrikeOption =
    | CunningStrikePoison
    | CunningStrikeTrip
    | CunningStrikeWithdraw

  type CunningStrikeSaveRequirement =
    | CunningStrikeNoSave
    | CunningStrikeConstitutionSave
    | CunningStrikeDexteritySave

  type CunningStrikeConditionProjection =
    | CunningStrikeNoCondition
    | CunningStrikePoisonedCondition
    | CunningStrikeProneCondition

  type CunningStrikeFacts = {
    dealtSneakAttackDamage: bool,
    sneakAttackDiceAvailable: int,
  }

  pure def cunningStrikeCostDice(option: CunningStrikeOption): int =
    match option {
      | CunningStrikePoison => 1
      | CunningStrikeTrip => 1
      | CunningStrikeWithdraw => 1
    }

  pure def cunningStrikeCostDieSize: int = 6

  pure def cunningStrikeAvailable(facts: CunningStrikeFacts, option: CunningStrikeOption): bool =
    all {
      facts.dealtSneakAttackDamage,
      facts.sneakAttackDiceAvailable >= cunningStrikeCostDice(option),
    }

  pure def cunningStrikeSneakAttackDiceAfterCost(
    facts: CunningStrikeFacts,
    option: CunningStrikeOption,
  ): int =
    facts.sneakAttackDiceAvailable - cunningStrikeCostDice(option)

  pure def cunningStrikeSaveDc(dexterityModifier: int, proficiencyBonus: int): int =
    8 + dexterityModifier + proficiencyBonus

  pure def cunningStrikeSaveRequirement(option: CunningStrikeOption): CunningStrikeSaveRequirement =
    match option {
      | CunningStrikePoison => CunningStrikeConstitutionSave
      | CunningStrikeTrip => CunningStrikeDexteritySave
      | CunningStrikeWithdraw => CunningStrikeNoSave
    }

  pure def cunningStrikeFailedSaveCondition(option: CunningStrikeOption): CunningStrikeConditionProjection =
    match option {
      | CunningStrikePoison => CunningStrikePoisonedCondition
      | CunningStrikeTrip => CunningStrikeProneCondition
      | CunningStrikeWithdraw => CunningStrikeNoCondition
    }

  pure def cunningStrikePoisonDurationMinutes: int = 1

  pure def cunningStrikePoisonRequiresPoisonersKitOnPerson: bool = true

  pure def cunningStrikeTripEligibleByEffectiveSize(targetSize: RuleSize): bool =
    sizeRank(targetSize) <= sizeRank(LargeSize)

  pure def cunningStrikeWithdrawMovementFeet(speedFeet: int): int =
    speedFeet / 2

  pure def cunningStrikeWithdrawProvokesOpportunityAttacks: bool = false
}
