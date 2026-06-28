// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// Typed source facts for generic movement/presentation routes. The variants
// intentionally separate reducer-owned movement-resource facts, table-owned
// presentation facts, and object-boundary facts.
module battleRuntimeMovementPresentationRouteFacts {
  type MovementPresentationResourceFact =
    | MovementReplacementFixedBudgetSpend
    | MovementReplacementDistanceProjection
    | ForcedMovementNoOwnMovementResource
    | ForcedMovementDistanceProjection

  type MovementPresentationTableFact =
    | TableSuppliedMovementPathWitness
    | LandingSpacePresentationWitness
    | DirectionAwayFromSourcePresentationWitness
    | AreaGeometryPresentationWitness
    | AudibleEffectPresentationWitness

  type MovementPresentationObjectBoundaryFact =
    | ObjectUnsecuredBoundary
    | ObjectEntirelyWithinAreaBoundary
    | ObjectPushProjection

  type MovementPresentationRouteFact =
    | RouteMovementPresentationResource({
        resource: MovementPresentationResourceFact,
      })
    | RouteMovementPresentationTable({
        presentation: MovementPresentationTableFact,
      })
    | RouteMovementPresentationObjectBoundary({
        boundary: MovementPresentationObjectBoundaryFact,
      })
}
