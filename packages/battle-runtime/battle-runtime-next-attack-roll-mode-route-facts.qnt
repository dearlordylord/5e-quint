// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// Typed source facts for generic next-Attack-Roll roll-mode routes. These are
// reducer-route evidence facts, not authored spell or feature identity.
module battleRuntimeNextAttackRollModeRouteFacts {
  type NextAttackRollModeSourceFact =
    | HostAttackHitDamageOutcome
    | HostSaveEffectOutcome
    | HostAssistActionOutcome
    | HostBonusActionFeatureOutcome

  type NextAttackRollModeCarrierFact =
    | HostOutcomeTargetCarrier
    | DistractedEnemyCarrier
    | ActingBeneficiaryCarrier

  type NextAttackRollModeAttackerFact =
    | SourceAttacker
    | AffectedTargetAttacker
    | SourceAllyAttacker

  type NextAttackRollModeTargetScopeFact =
    | AttackAgainstAffectedTargetOnly
    | AttackAgainstAnyTarget

  type NextAttackRollModeExpirationBoundaryFact =
    | BeforeSourceNextTurnStarts
    | BeforeSourceNextTurnEnds
    | BeforeBeneficiaryCurrentTurnEnds
    | BeforeAffectedTargetNextTurnEnds

  type NextAttackRollModeDirectionFact =
    | NextAttackRollAdvantage
    | NextAttackRollDisadvantage

  type NextAttackRollModeRouteFact =
    | RouteNextAttackRollModeSource({ source: NextAttackRollModeSourceFact })
    | RouteNextAttackRollModeCarrier({ carrier: NextAttackRollModeCarrierFact })
    | RouteNextAttackRollModeAttacker({ attacker: NextAttackRollModeAttackerFact })
    | RouteNextAttackRollModeTargetScope({
        targetScope: NextAttackRollModeTargetScopeFact,
      })
    | RouteNextAttackRollModeExpirationBoundary({
        boundary: NextAttackRollModeExpirationBoundaryFact,
      })
    | RouteNextAttackRollModeDirection({
        direction: NextAttackRollModeDirectionFact,
      })
    | RouteNextAttackRollModeAdmitted
    | RouteNextAttackRollModeProjected
    | RouteNextAttackRollModeConsumed
    | RouteNextAttackRollModeExpired
    | RouteNextAttackRollModeCleanedUp
}
