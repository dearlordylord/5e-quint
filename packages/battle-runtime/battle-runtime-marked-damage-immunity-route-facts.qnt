// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// Typed source facts for generic marked-damage and condition-immunity active
// effect routes. These facts describe reducer-visible procedure shape and
// lifecycle ownership, not authored spell or catalog identity.
module battleRuntimeMarkedDamageImmunityRouteFacts {
  type MarkedDamageRiderHostFact =
    | AttackRollHitMarkedTarget

  type MarkedDamageRiderDamageFact =
    | ExtraDamageOnMarkedTargetHit

  type MarkedDamageRiderTransferFact =
    | TransferAwaitsMarkedTargetDrop
    | TransferAvailableAfterMarkedTargetDrops
    | TransferAvailableOnSameTurn
    | TransferAvailableOnLaterTurn
    | TransferConsumesBonusAction
    | TransferResetsAwaitingMarkedTargetDrop

  type TargetedAbilityCheckRollModeFact =
    | TargetScopedSelectedAbility
    | MatchingTargetSelectedAbilityCheckDisadvantage
    | NonmatchingAbilityCheckNormal
    | NonmarkedActorAbilityCheckNormal
    | ConcentrationCleanupRestoresNormalAbilityCheck

  type MarkedDamageRiderOwnerFact =
    | MarkedRiderBattleActiveEffectProjectionOwner
    | MarkedRiderBattleConcentrationOwner
    | MarkedRiderBattleAbilityCheckRollModeOwner
    | MarkedRiderBattleActiveEffectCleanupOwner

  type MarkedDamageRiderRouteFact =
    | RouteMarkedDamageRiderHost({ host: MarkedDamageRiderHostFact })
    | RouteMarkedDamageRiderDamage({
        damage: MarkedDamageRiderDamageFact,
      })
    | RouteMarkedDamageRiderTransfer({
        transfer: MarkedDamageRiderTransferFact,
      })
    | RouteMarkedDamageRiderTargetedAbilityCheckRollMode({
        rollMode: TargetedAbilityCheckRollModeFact,
      })
    | RouteMarkedDamageRiderOwner({ owner: MarkedDamageRiderOwnerFact })

  type ConditionImmunityTemporaryHitPointEffectFact =
    | ConditionImmunityApplied
    | ConditionApplicationRejectedByImmunity
    | TurnStartTemporaryHitPointGrantScheduled
    | TurnStartTemporaryHitPointsGranted
    | TemporaryHitPointsUseNonStackingChoice
    | ConcentrationCleanupPreventsLaterTurnStartGrant

  type ConditionImmunityTemporaryHitPointConditionFact =
    | FrightenedConditionImmunity

  type ConditionImmunityTemporaryHitPointOwnerFact =
    | BattleActiveEffectProjectionOwner
    | BattleConditionLifecycleProjectionOwner
    | BattleTemporaryHitPointProjectionOwner
    | BattleTurnBoundaryProjectionOwner
    | ImmunityBattleConcentrationCleanupOwner
    | ImmunityBattleActiveEffectCleanupOwner

  type ConditionImmunityTemporaryHitPointRouteFact =
    | RouteConditionImmunityTemporaryHitPointEffect({
        effect: ConditionImmunityTemporaryHitPointEffectFact,
      })
    | RouteConditionImmunityTemporaryHitPointCondition({
        condition: ConditionImmunityTemporaryHitPointConditionFact,
      })
    | RouteConditionImmunityTemporaryHitPointOwner({
        owner: ConditionImmunityTemporaryHitPointOwnerFact,
      })

  type MarkedDamageImmunityRouteFact =
    | RouteMarkedDamageRiderFact({ fact: MarkedDamageRiderRouteFact })
    | RouteConditionImmunityTemporaryHitPointFact({
        fact: ConditionImmunityTemporaryHitPointRouteFact,
      })
}
