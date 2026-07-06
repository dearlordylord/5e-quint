// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.cunning-strike

module battleRuntimeCunningStrikeTests {
  import creatureSizeOrder.* from "../shared-algebras/proofs/rule-core/creature-size-order"
  import battleRuntimeCunningStrike.* from "./battle-runtime-cunning-strike"

  run test_cunning_strike_cost_is_removed_before_damage = {
    all {
      assert(sneakAttackDiceAfterCunningStrikeCost(3) == 2),
      assert(costDice(projectionCost(poisonProjection)) == 1),
      assert(costDieSize(projectionCost(tripProjection)) == 6),
      assert(happensImmediatelyAfterDamage(withdrawProjection)),
    }
  }

  run test_cunning_strike_poison_projection = {
    val semantics = PoisonersKitConstitutionSavePoisonedOneMinuteRepeat
    val failedCondition = equipmentConditionSaveFailedCondition(semantics)
    all {
      assert(poisonProjection == EquipmentGatedConditionSaveProjection({
        cost: OneSneakAttackD6Cost,
        timing: ImmediatelyAfterAttackDamage,
        semantics: semantics,
      })),
      assert(equipmentConditionSaveRequiredTool(semantics) == PoisonersKitOnPerson),
      assert(equipmentConditionSaveSavingThrow(semantics) == {
        ability: ConstitutionAbility,
        dc: DexterityBasedSaveDcBaseEight,
      }),
      assert(persistentConditionKind(failedCondition) == PoisonedCondition),
      assert(persistentConditionDurationMinutes(failedCondition) == 1),
      assert(persistentConditionRepeatSave(failedCondition) == EndOfAffectedTargetTurnSuccessEndsCondition),
    }
  }

  run test_cunning_strike_trip_uses_effective_large_or_smaller_size = {
    val semantics = LargeOrSmallerDexteritySaveProne
    all {
      assert(tripEligibleByEffectiveSize(TinySize)),
      assert(tripEligibleByEffectiveSize(SmallSize)),
      assert(tripEligibleByEffectiveSize(MediumSize)),
      assert(tripEligibleByEffectiveSize(LargeSize)),
      assert(not(tripEligibleByEffectiveSize(HugeSize))),
      assert(saveDcBase(DexterityBasedSaveDcBaseEight) == 8),
      assert(saveDcAbility(DexterityBasedSaveDcBaseEight) == DexterityAbility),
      assert(tripProjection == SizeGatedConditionSaveProjection({
        cost: OneSneakAttackD6Cost,
        timing: ImmediatelyAfterAttackDamage,
        semantics: semantics,
      })),
      assert(sizeGatedConditionSaveMaxTargetSize(semantics) == LargeSize),
      assert(sizeGatedConditionSaveSavingThrow(semantics) == {
        ability: DexterityAbility,
        dc: DexterityBasedSaveDcBaseEight,
      }),
      assert(sizeGatedConditionSaveFailedCondition(semantics) == ProneCondition),
    }
  }

  run test_cunning_strike_withdraw_projection = {
    all {
      assert(withdrawMovementFeet(30) == 15),
      assert(withdrawProjection == PostDamageMovementProjection({
        cost: OneSneakAttackD6Cost,
        timing: ImmediatelyAfterAttackDamage,
        semantics: HalfSpeedMovementWithoutOpportunityAttacks,
      })),
      assert(movementDistanceDivisor(HalfSpeedMovementWithoutOpportunityAttacks) == 2),
      assert(not(movementSpendsTurnMovement(HalfSpeedMovementWithoutOpportunityAttacks))),
      assert(not(movementProvokesOpportunityAttacks(HalfSpeedMovementWithoutOpportunityAttacks))),
    }
  }
}
