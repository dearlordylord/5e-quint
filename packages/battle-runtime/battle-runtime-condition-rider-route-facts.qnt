// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// Typed source facts for generic condition-rider routes. These facts describe
// reducer-visible procedure shape and lifecycle ownership, not authored spell or
// unit identity.
module battleRuntimeConditionRiderRouteFacts {
  type ConditionRiderHostOutcomeFact =
    | HostAttackHitDamageOutcome
    | HostFailedSavingThrowOutcome

  type ConditionRiderCarrierFact =
    | AffectedTargetConditionCarrier

  type ConditionRiderConditionKindFact =
    | PoisonedCondition
    | RestrainedCondition

  type ConditionRiderAdmissionFact =
    | ConditionApplied
    | ConditionRejectedByImmunity

  type ConditionRiderBoundaryFact =
    | UntilDurationExpires
    | AffectedTargetEndTurnRepeatSave

  type ConditionRiderCleanupOwnerFact =
    | BattleTurnBoundaryCleanupOwner
    | BattleConditionLifecycleCleanupOwner
    | BattleActiveEffectCleanupOwner

  type ConditionRiderRouteFact =
    | RouteConditionRiderHostOutcome({
        outcome: ConditionRiderHostOutcomeFact,
      })
    | RouteConditionRiderCarrier({ carrier: ConditionRiderCarrierFact })
    | RouteConditionRiderConditionKind({
        condition: ConditionRiderConditionKindFact,
      })
    | RouteConditionRiderAdmission({ admission: ConditionRiderAdmissionFact })
    | RouteConditionRiderBoundary({ boundary: ConditionRiderBoundaryFact })
    | RouteConditionRiderRepeatSaveFrontierOpened
    | RouteConditionRiderRepeatSaveSucceeded
    | RouteConditionRiderExpired
    | RouteConditionRiderCleanedUpBy({
        owner: ConditionRiderCleanupOwnerFact,
      })
}
