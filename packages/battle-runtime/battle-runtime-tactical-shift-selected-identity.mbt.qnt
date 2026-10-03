// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.bonus-action-healing-movement-rider
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// Literal projection driver for fixed SRD Tactical Shift facts and both
// turn-owner orders through a movement-damage hazard. The semantic rule proof
// remains in unit-feature-pool-cost-core-examples.qnt.

module battleRuntimeTacticalShiftSelectedIdentityMbt {
  type TacticalShiftWitnessState = {
    qHp: int,
    qRiderMovementCostFeet: int,
    qRiderTravelDistanceFeet: int,
    qMovementBudgetFeet: int,
    qMovementSpentFeet: int,
    qOpportunityAttackCount: int,
    qBonusActionAvailable: bool,
    qSecondWindUsesRemaining: int,
  }

  var qState: TacticalShiftWitnessState

  action init = qState' = {
    qHp: 4,
    qRiderMovementCostFeet: 0,
    qRiderTravelDistanceFeet: 0,
    qMovementBudgetFeet: 0,
    qMovementSpentFeet: 0,
    qOpportunityAttackCount: 0,
    qBonusActionAvailable: true,
    qSecondWindUsesRemaining: 3,
  }

  action doResolveTacticalShift = all {
    qState.qHp == 4,
    qState' = {
      qHp: 12,
      qRiderMovementCostFeet: 10,
      qRiderTravelDistanceFeet: 10,
      qMovementBudgetFeet: 15,
      qMovementSpentFeet: 0,
      qOpportunityAttackCount: 0,
      qBonusActionAvailable: false,
      qSecondWindUsesRemaining: 2,
    },
  }

  action doResolveTacticalShiftHealFirstHazard = all {
    qState.qHp == 4,
    qState' = {
      qHp: 6,
      qRiderMovementCostFeet: 15,
      qRiderTravelDistanceFeet: 10,
      qMovementBudgetFeet: 15,
      qMovementSpentFeet: 0,
      qOpportunityAttackCount: 0,
      qBonusActionAvailable: false,
      qSecondWindUsesRemaining: 2,
    },
  }

  action doResolveTacticalShiftMoveFirstHazard = all {
    qState.qHp == 4,
    qState' = {
      qHp: 8,
      qRiderMovementCostFeet: 15,
      qRiderTravelDistanceFeet: 10,
      qMovementBudgetFeet: 15,
      qMovementSpentFeet: 0,
      qOpportunityAttackCount: 0,
      qBonusActionAvailable: false,
      qSecondWindUsesRemaining: 2,
    },
  }

  action step = any {
    doResolveTacticalShift,
    doResolveTacticalShiftHealFirstHazard,
    doResolveTacticalShiftMoveFirstHazard,
  }
}
