// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

module battleRuntimeOpportunityAttackDenialRouteFacts {
  type ReactionInterdictionSourceFact =
    | HostAttackHitDamageOutcome

  type ReactionInterdictionCarrierFact =
    | HostOutcomeTargetCarrier

  type ReactionInterdictionScopeFact =
    | AffectedTargetReactionsOnly

  type ReactionInterdictionTriggerFamilyFact =
    | OpportunityAttackTriggerFamily

  type ReactionInterdictionExpirationBoundaryFact =
    | UntilAffectedTargetNextTurnStarts

  type ReactionInterdictionRouteFact =
    | RouteReactionInterdictionSource({
        source: ReactionInterdictionSourceFact,
      })
    | RouteReactionInterdictionCarrier({
        carrier: ReactionInterdictionCarrierFact,
      })
    | RouteReactionInterdictionScope({
        scope: ReactionInterdictionScopeFact,
      })
    | RouteReactionInterdictionTriggerFamily({
        triggerFamily: ReactionInterdictionTriggerFamilyFact,
      })
    | RouteReactionInterdictionExpirationBoundary({
        boundary: ReactionInterdictionExpirationBoundaryFact,
      })
    | RouteReactionInterdictionAdmitted
    | RouteReactionInterdictionProjectedToMovementDiscovery
    | RouteReactionInterdictionProjectedToReactionDiscovery
    | RouteReactionInterdictionExpired
    | RouteReactionInterdictionCleanedUp
}
