// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.cunning-strike
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.cunning-strike
module battleRuntimeCunningStrike {
  // Literal projection witness for Cunning Strike level-5 options.
  // RAW trace:
  // - .references/srd-5.2.1/Classes/Rogue.md:97-109: the trigger is dealing
  //   Sneak Attack damage; each level-5 option costs 1d6 removed before the
  //   attack damage roll; the effect occurs immediately after damage.
  // - .references/srd-5.2.1/Classes/Rogue.md:111-120: Poison requires a
  //   Poisoner's Kit on the Rogue's person, a Constitution Saving Throw, the
  //   Poisoned condition for 1 minute, and end-turn repeat saves that end the
  //   condition on success.
  // - .references/srd-5.2.1/Classes/Rogue.md:122-123: Trip gates on Large or
  //   smaller targets, then uses a Dexterity Saving Throw before Prone.
  // - .references/srd-5.2.1/Classes/Rogue.md:125: Withdraw moves up to half
  //   Speed immediately after the attack without provoking Opportunity Attacks.
  // UBIQUITOUS_LANGUAGE.md: Saving Throw, Condition, Size, Speed, Movement,
  // Opportunity Attack, Equipment.
  type CunningStrikeOptionKind =
    EquipmentGatedConditionSave |
    SizeGatedConditionSave |
    PostDamageMovement

  type CunningStrikeOptionProjection = {
    kind: CunningStrikeOptionKind,
    dieCostDice: int,
    dieSize: int,
    happensImmediatelyAfterDamage: bool,
  }

  type CunningStrikeConditionSaveProjection = {
    option: CunningStrikeOptionProjection,
    requiresToolOnPerson: bool,
    toolId: str,
    saveAbility: str,
    saveDcBase: int,
    saveDcAbility: str,
    condition: str,
    durationMinutes: int,
    repeatSaveCadence: str,
    repeatSaveSuccessEndsCondition: bool,
  }

  type CunningStrikeSizeGatedSaveProjection = {
    option: CunningStrikeOptionProjection,
    maxTargetSizeRank: int,
    saveAbility: str,
    saveDcBase: int,
    saveDcAbility: str,
    condition: str,
  }

  type CunningStrikeMovementProjection = {
    option: CunningStrikeOptionProjection,
    distanceDivisor: int,
    spendsTurnMovement: bool,
    provokesOpportunityAttacks: bool,
  }

  pure val tinySizeRank: int = 0
  pure val smallSizeRank: int = 1
  pure val mediumSizeRank: int = 2
  pure val largeSizeRank: int = 3
  pure val hugeSizeRank: int = 4

  pure val commonOptionCostDice: int = 1
  pure val commonOptionDieSize: int = 6

  pure def option(kind: CunningStrikeOptionKind): CunningStrikeOptionProjection = {
    kind: kind,
    dieCostDice: commonOptionCostDice,
    dieSize: commonOptionDieSize,
    happensImmediatelyAfterDamage: true,
  }

  pure def sneakAttackDiceAfterCunningStrikeCost(selectedSneakAttackDice: int): int =
    selectedSneakAttackDice - commonOptionCostDice

  pure def tripEligibleByEffectiveSize(targetSizeRank: int): bool =
    targetSizeRank <= largeSizeRank

  pure def withdrawMovementFeet(speedFeet: int): int =
    speedFeet / 2

  pure val poisonProjection: CunningStrikeConditionSaveProjection = {
    option: option(EquipmentGatedConditionSave),
    requiresToolOnPerson: true,
    toolId: "poisoners_kit",
    saveAbility: "con",
    saveDcBase: 8,
    saveDcAbility: "dex",
    condition: "poisoned",
    durationMinutes: 1,
    repeatSaveCadence: "endOfTargetTurn",
    repeatSaveSuccessEndsCondition: true,
  }

  pure val tripProjection: CunningStrikeSizeGatedSaveProjection = {
    option: option(SizeGatedConditionSave),
    maxTargetSizeRank: largeSizeRank,
    saveAbility: "dex",
    saveDcBase: 8,
    saveDcAbility: "dex",
    condition: "prone",
  }

  pure val withdrawProjection: CunningStrikeMovementProjection = {
    option: option(PostDamageMovement),
    distanceDivisor: 2,
    spendsTurnMovement: false,
    provokesOpportunityAttacks: false,
  }

  run test_cunning_strike_cost_is_removed_before_damage = {
    all {
      assert(sneakAttackDiceAfterCunningStrikeCost(3) == 2),
      assert(poisonProjection.option.dieCostDice == 1),
      assert(tripProjection.option.dieSize == 6),
      assert(withdrawProjection.option.happensImmediatelyAfterDamage),
    }
  }

  run test_cunning_strike_poison_projection = {
    all {
      assert(poisonProjection.requiresToolOnPerson),
      assert(poisonProjection.toolId == "poisoners_kit"),
      assert(poisonProjection.saveAbility == "con"),
      assert(poisonProjection.saveDcBase == 8),
      assert(poisonProjection.saveDcAbility == "dex"),
      assert(poisonProjection.condition == "poisoned"),
      assert(poisonProjection.durationMinutes == 1),
      assert(poisonProjection.repeatSaveCadence == "endOfTargetTurn"),
      assert(poisonProjection.repeatSaveSuccessEndsCondition),
    }
  }

  run test_cunning_strike_trip_uses_effective_large_or_smaller_size = {
    all {
      assert(tripEligibleByEffectiveSize(tinySizeRank)),
      assert(tripEligibleByEffectiveSize(smallSizeRank)),
      assert(tripEligibleByEffectiveSize(mediumSizeRank)),
      assert(tripEligibleByEffectiveSize(largeSizeRank)),
      assert(not(tripEligibleByEffectiveSize(hugeSizeRank))),
      assert(tripProjection.saveAbility == "dex"),
      assert(tripProjection.condition == "prone"),
    }
  }

  run test_cunning_strike_withdraw_projection = {
    all {
      assert(withdrawMovementFeet(30) == 15),
      assert(withdrawProjection.distanceDivisor == 2),
      assert(not(withdrawProjection.spendsTurnMovement)),
      assert(not(withdrawProjection.provokesOpportunityAttacks)),
    }
  }
}
