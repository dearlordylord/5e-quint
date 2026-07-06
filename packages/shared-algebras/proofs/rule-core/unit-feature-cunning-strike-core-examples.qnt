// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.cunning-strike

module unitFeatureCunningStrikeCoreExamples {
  import creatureSizeOrder.* from "./creature-size-order"
  import unitFeatureCunningStrikeCore.* from "./unit-feature-cunning-strike-core"

  run test_cunning_strike_projects_cost_save_condition_size_and_movement_facts = {
    val facts = {
      dealtSneakAttackDamage: true,
      sneakAttackDiceAvailable: 3,
    }
    all {
      assert(cunningStrikeCostDice(CunningStrikePoison) == 1),
      assert(cunningStrikeCostDieSize == 6),
      assert(cunningStrikeAvailable(facts, CunningStrikePoison)),
      assert(cunningStrikeSneakAttackDiceAfterCost(facts, CunningStrikeTrip) == 2),
      assert(cunningStrikeSaveDc(4, 3) == 15),
      assert(cunningStrikeSaveRequirement(CunningStrikePoison) == CunningStrikeConstitutionSave),
      assert(cunningStrikeSaveRequirement(CunningStrikeWithdraw) == CunningStrikeNoSave),
      assert(cunningStrikeFailedSaveCondition(CunningStrikeTrip) == CunningStrikeProneCondition),
      assert(cunningStrikePoisonDurationMinutes == 1),
      assert(cunningStrikePoisonRequiresPoisonersKitOnPerson),
      assert(cunningStrikeTripEligibleByEffectiveSize(LargeSize)),
      assert(not(cunningStrikeTripEligibleByEffectiveSize(HugeSize))),
      assert(cunningStrikeWithdrawMovementFeet(30) == 15),
      assert(not(cunningStrikeWithdrawProvokesOpportunityAttacks)),
    }
  }
}
