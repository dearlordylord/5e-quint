// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.cunning-strike
module battleRuntimeCunningStrike {
  import creatureSizeOrder.* from "../shared-algebras/proofs/rule-core/creature-size-order"

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
  type CunningStrikeCost =
    | OneSneakAttackD6Cost

  type CunningStrikeTiming =
    | ImmediatelyAfterAttackDamage

  type CunningStrikeRequiredTool =
    | PoisonersKitOnPerson

  type CunningStrikeAbility =
    | DexterityAbility
    | ConstitutionAbility

  type CunningStrikeSaveDc =
    | DexterityBasedSaveDcBaseEight

  type CunningStrikeSavingThrow = {
    ability: CunningStrikeAbility,
    dc: CunningStrikeSaveDc,
  }

  type CunningStrikeCondition =
    | PoisonedCondition
    | ProneCondition

  type CunningStrikeRepeatSave =
    | EndOfAffectedTargetTurnSuccessEndsCondition

  type CunningStrikePersistentCondition =
    | PoisonedOneMinuteWithRepeatSave({ repeatSave: CunningStrikeRepeatSave })

  type CunningStrikeEquipmentGatedConditionSaveSemantics =
    | PoisonersKitConstitutionSavePoisonedOneMinuteRepeat

  type CunningStrikeSizeGatedConditionSaveSemantics =
    | LargeOrSmallerDexteritySaveProne

  type CunningStrikePostDamageMovementSemantics =
    | HalfSpeedMovementWithoutOpportunityAttacks

  type CunningStrikeProjection =
    | EquipmentGatedConditionSaveProjection({
        cost: CunningStrikeCost,
        timing: CunningStrikeTiming,
        semantics: CunningStrikeEquipmentGatedConditionSaveSemantics,
      })
    | SizeGatedConditionSaveProjection({
        cost: CunningStrikeCost,
        timing: CunningStrikeTiming,
        semantics: CunningStrikeSizeGatedConditionSaveSemantics,
      })
    | PostDamageMovementProjection({
        cost: CunningStrikeCost,
        timing: CunningStrikeTiming,
        semantics: CunningStrikePostDamageMovementSemantics,
      })

  pure def costDice(cost: CunningStrikeCost): int =
    match cost {
      | OneSneakAttackD6Cost => 1
    }

  pure def costDieSize(cost: CunningStrikeCost): int =
    match cost {
      | OneSneakAttackD6Cost => 6
    }

  pure def saveDcBase(saveDc: CunningStrikeSaveDc): int =
    match saveDc {
      | DexterityBasedSaveDcBaseEight => 8
    }

  pure def saveDcAbility(saveDc: CunningStrikeSaveDc): CunningStrikeAbility =
    match saveDc {
      | DexterityBasedSaveDcBaseEight => DexterityAbility
    }

  pure def persistentConditionKind(
    condition: CunningStrikePersistentCondition,
  ): CunningStrikeCondition =
    match condition {
      | PoisonedOneMinuteWithRepeatSave(_) => PoisonedCondition
    }

  pure def persistentConditionDurationMinutes(
    condition: CunningStrikePersistentCondition,
  ): int =
    match condition {
      | PoisonedOneMinuteWithRepeatSave(_) => 1
    }

  pure def persistentConditionRepeatSave(
    condition: CunningStrikePersistentCondition,
  ): CunningStrikeRepeatSave =
    match condition {
      | PoisonedOneMinuteWithRepeatSave(data) => data.repeatSave
    }

  pure def equipmentConditionSaveRequiredTool(
    semantics: CunningStrikeEquipmentGatedConditionSaveSemantics,
  ): CunningStrikeRequiredTool =
    match semantics {
      | PoisonersKitConstitutionSavePoisonedOneMinuteRepeat => PoisonersKitOnPerson
    }

  pure def equipmentConditionSaveSavingThrow(
    semantics: CunningStrikeEquipmentGatedConditionSaveSemantics,
  ): CunningStrikeSavingThrow =
    match semantics {
      | PoisonersKitConstitutionSavePoisonedOneMinuteRepeat => {
          ability: ConstitutionAbility,
          dc: commonSavingThrowDc,
        }
    }

  pure def equipmentConditionSaveFailedCondition(
    semantics: CunningStrikeEquipmentGatedConditionSaveSemantics,
  ): CunningStrikePersistentCondition =
    match semantics {
      | PoisonersKitConstitutionSavePoisonedOneMinuteRepeat =>
          PoisonedOneMinuteWithRepeatSave({
            repeatSave: EndOfAffectedTargetTurnSuccessEndsCondition,
          })
    }

  pure def sizeGatedConditionSaveMaxTargetSize(
    semantics: CunningStrikeSizeGatedConditionSaveSemantics,
  ): RuleSize =
    match semantics {
      | LargeOrSmallerDexteritySaveProne => LargeSize
    }

  pure def sizeGatedConditionSaveSavingThrow(
    semantics: CunningStrikeSizeGatedConditionSaveSemantics,
  ): CunningStrikeSavingThrow =
    match semantics {
      | LargeOrSmallerDexteritySaveProne => {
          ability: DexterityAbility,
          dc: commonSavingThrowDc,
        }
    }

  pure def sizeGatedConditionSaveFailedCondition(
    semantics: CunningStrikeSizeGatedConditionSaveSemantics,
  ): CunningStrikeCondition =
    match semantics {
      | LargeOrSmallerDexteritySaveProne => ProneCondition
    }

  pure def projectionCost(projection: CunningStrikeProjection): CunningStrikeCost =
    match projection {
      | EquipmentGatedConditionSaveProjection(data) => data.cost
      | SizeGatedConditionSaveProjection(data) => data.cost
      | PostDamageMovementProjection(data) => data.cost
    }

  pure def projectionTiming(projection: CunningStrikeProjection): CunningStrikeTiming =
    match projection {
      | EquipmentGatedConditionSaveProjection(data) => data.timing
      | SizeGatedConditionSaveProjection(data) => data.timing
      | PostDamageMovementProjection(data) => data.timing
    }

  pure def happensImmediatelyAfterDamage(projection: CunningStrikeProjection): bool =
    projectionTiming(projection) == ImmediatelyAfterAttackDamage

  pure def sneakAttackDiceAfterCunningStrikeCost(selectedSneakAttackDice: int): int =
    selectedSneakAttackDice - costDice(OneSneakAttackD6Cost)

  pure def tripEligibleByEffectiveSize(targetSize: RuleSize): bool =
    sizeRank(targetSize) <= sizeRank(LargeSize)

  pure def withdrawMovementFeet(speedFeet: int): int =
    speedFeet / 2

  pure def movementDistanceDivisor(
    semantics: CunningStrikePostDamageMovementSemantics,
  ): int =
    match semantics {
      | HalfSpeedMovementWithoutOpportunityAttacks => 2
    }

  pure def movementSpendsTurnMovement(
    semantics: CunningStrikePostDamageMovementSemantics,
  ): bool =
    match semantics {
      | HalfSpeedMovementWithoutOpportunityAttacks => false
    }

  pure def movementProvokesOpportunityAttacks(
    semantics: CunningStrikePostDamageMovementSemantics,
  ): bool =
    match semantics {
      | HalfSpeedMovementWithoutOpportunityAttacks => false
    }

  pure val commonSavingThrowDc: CunningStrikeSaveDc =
    DexterityBasedSaveDcBaseEight

  pure val poisonProjection: CunningStrikeProjection =
    EquipmentGatedConditionSaveProjection({
      cost: OneSneakAttackD6Cost,
      timing: ImmediatelyAfterAttackDamage,
      semantics: PoisonersKitConstitutionSavePoisonedOneMinuteRepeat,
    })

  pure val tripProjection: CunningStrikeProjection =
    SizeGatedConditionSaveProjection({
      cost: OneSneakAttackD6Cost,
      timing: ImmediatelyAfterAttackDamage,
      semantics: LargeOrSmallerDexteritySaveProne,
    })

  pure val withdrawProjection: CunningStrikeProjection =
    PostDamageMovementProjection({
      cost: OneSneakAttackD6Cost,
      timing: ImmediatelyAfterAttackDamage,
      semantics: HalfSpeedMovementWithoutOpportunityAttacks,
    })
}
