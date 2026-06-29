// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Jump defines a
//   spell-granted movement replacement: jump up to 30 feet by spending 10 feet
//   of movement.
// - .references/srd-5.2.1/Rules-Glossary.md#Long Jump defines the
//   Difficult Terrain landing Dexterity (Acrobatics) check and Prone outcome.
// - .references/srd-5.2.1/Playing-the-Game.md#Movement and Position and
//   .references/srd-5.2.1/Rules-Glossary.md#Speed define movement budget,
//   special speeds, and movement-cost accounting.
// - .references/srd-5.2.1/Spells/Descriptions-S-Z.md#Thunderwave defines
//   failed-save creature push, unsecured-object push, and audible presentation.
// - .references/srd-5.2.1/Playing-the-Game.md#What Is an Object and
//   #Interacting with Objects define object boundaries as GM/table-facing facts.
// - UBIQUITOUS_LANGUAGE.md: Movement, Speed, Table Decision, Spell Effect,
//   Shove/Push distinction, and Boundary Crossing.
module battleRuntimeMovementPresentationRouteMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"
  import battleRuntimeMovementPresentationRouteFacts.* from "./battle-runtime-movement-presentation-route-facts"

  type MovementPresentationRouteSurface =
    | FreshMovementPresentationRouteSurface
    | MovementReplacementLandingAcceptedNoCheckRouteSurface
    | MovementReplacementLandingAcceptedDifficultTerrainAcrobaticsPassedRouteSurface
    | MovementReplacementLandingAcceptedDifficultTerrainAcrobaticsFailedProneRouteSurface
    | MovementReplacementLandingRejectedIllegalRouteSurface
    | ForcedCreatureMovementPresentationRouteSurface
    | ObjectPushPresentationRouteSurface

  var qSurface: MovementPresentationRouteSurface
  var qRoute: List[ReducerRouteEvent]
  var qFacts: List[MovementPresentationRouteFact]

  pure val noHoles: Set[BattleHoleFamilyKind] = Set()
  pure val movementHoles: Set[BattleHoleFamilyKind] = Set(MovementHoleKind)
  pure val savingThrowMovementHoles: Set[BattleHoleFamilyKind] =
    Set(SavingThrowOutcomeHoleKind, MovementHoleKind)

  pure def startRoute: ReducerRouteEvent =
    routeStartBattle(BattleActionEconomyOwner)

  pure def discoverRoute(
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeDiscoverBattleActs(MovementPresentationRouteSubject, holes, owner)

  pure def resolveRoute(
    fill: BattleFillKind,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubject(
      MovementPresentationRouteSubject,
      fill,
      holes,
      owner,
    )

  pure def resolveRouteWithoutFill(
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubjectWithoutFill(
      MovementPresentationRouteSubject,
      noHoles,
      owner,
    )

  pure def movementReplacementRoute: List[ReducerRouteEvent] =
    List(
      discoverRoute(movementHoles, BattleMovementResourceOwner),
      resolveRoute(MovementFillKind, noHoles, BattleMovementResourceOwner),
      resolveRouteWithoutFill(BattleTablePresentationOwner),
    )

  pure def movementReplacementFailedLandingProneRoute: List[ReducerRouteEvent] =
    movementReplacementRoute.append(
      resolveRouteWithoutFill(BattleConditionLifecycleOwner)
    )

  pure def movementReplacementIllegalLandingRejectedRoute: List[ReducerRouteEvent] =
    List(
      discoverRoute(noHoles, BattleTablePresentationOwner),
      resolveRouteWithoutFill(BattleTablePresentationOwner),
    )

  pure def forcedCreatureMovementRoute: List[ReducerRouteEvent] =
    List(
      discoverRoute(savingThrowMovementHoles, BattleSavingThrowOutcomeOwner),
      resolveRoute(
        SavingThrowOutcomeFillKind,
        movementHoles,
        BattleSavingThrowOutcomeOwner,
      ),
      resolveRoute(MovementFillKind, noHoles, BattleMovementResourceOwner),
      resolveRouteWithoutFill(BattleTablePresentationOwner),
    )

  pure def objectPushPresentationRoute: List[ReducerRouteEvent] =
    List(
      discoverRoute(noHoles, BattleObjectTargetBoundaryOwner),
      resolveRouteWithoutFill(BattleObjectTargetBoundaryOwner),
      resolveRouteWithoutFill(BattleTablePresentationOwner),
    )

  pure def movementReplacementAcceptedFacts(
    outcome: MovementReplacementLandingOutcomeFact
  ): List[MovementPresentationRouteFact] =
    List(
      RouteMovementPresentationResource({
        resource: MovementReplacementFixedBudgetSpend,
      }),
      RouteMovementPresentationResource({
        resource: MovementReplacementDistanceProjection,
      }),
      RouteMovementPresentationTable({
        presentation: TableSuppliedMovementPathWitness,
      }),
      RouteMovementPresentationTable({
        presentation: LandingSpacePresentationWitness,
      }),
      RouteMovementPresentationLandingOutcome({ outcome: outcome }),
    )

  pure def movementReplacementLandingRejectedIllegalFacts: List[MovementPresentationRouteFact] =
    List(
      RouteMovementPresentationLandingOutcome({
        outcome: LandingRejectedIllegal,
      }),
    )

  pure def forcedCreatureMovementFacts: List[MovementPresentationRouteFact] =
    List(
      RouteMovementPresentationResource({
        resource: ForcedMovementNoOwnMovementResource,
      }),
      RouteMovementPresentationResource({
        resource: ForcedMovementDistanceProjection,
      }),
      RouteMovementPresentationTable({
        presentation: DirectionAwayFromSourcePresentationWitness,
      }),
      RouteMovementPresentationTable({
        presentation: AreaGeometryPresentationWitness,
      }),
    )

  pure def objectPushPresentationFacts: List[MovementPresentationRouteFact] =
    List(
      RouteMovementPresentationObjectBoundary({
        boundary: ObjectUnsecuredBoundary,
      }),
      RouteMovementPresentationObjectBoundary({
        boundary: ObjectEntirelyWithinAreaBoundary,
      }),
      RouteMovementPresentationObjectBoundary({
        boundary: ObjectPushProjection,
      }),
      RouteMovementPresentationTable({
        presentation: DirectionAwayFromSourcePresentationWitness,
      }),
      RouteMovementPresentationTable({
        presentation: AudibleEffectPresentationWitness,
      }),
    )

  action recordSurface(
    surface: MovementPresentationRouteSurface,
    route: List[ReducerRouteEvent],
    facts: List[MovementPresentationRouteFact],
  ): bool = all {
    qSurface' = surface,
    qRoute' = route,
    qFacts' = facts,
  }

  action init = recordSurface(
    FreshMovementPresentationRouteSurface,
    List(startRoute),
    List(),
  )

  action doRouteMovementReplacementLandingAcceptedNoCheck = all {
    qSurface == FreshMovementPresentationRouteSurface,
    recordSurface(
      MovementReplacementLandingAcceptedNoCheckRouteSurface,
      qRoute.concat(movementReplacementRoute),
      movementReplacementAcceptedFacts(LandingAcceptedNoCheck),
    ),
  }

  action doRouteMovementReplacementLandingAcceptedDifficultTerrainAcrobaticsPassed = all {
    qSurface == FreshMovementPresentationRouteSurface,
    recordSurface(
      MovementReplacementLandingAcceptedDifficultTerrainAcrobaticsPassedRouteSurface,
      qRoute.concat(movementReplacementRoute),
      movementReplacementAcceptedFacts(
        LandingAcceptedDifficultTerrainAcrobaticsPassed
      ),
    ),
  }

  action doRouteMovementReplacementLandingAcceptedDifficultTerrainAcrobaticsFailedProne = all {
    qSurface == FreshMovementPresentationRouteSurface,
    recordSurface(
      MovementReplacementLandingAcceptedDifficultTerrainAcrobaticsFailedProneRouteSurface,
      qRoute.concat(movementReplacementFailedLandingProneRoute),
      movementReplacementAcceptedFacts(
        LandingAcceptedDifficultTerrainAcrobaticsFailedProne
      ),
    ),
  }

  action doRouteMovementReplacementLandingRejectedIllegal = all {
    qSurface == FreshMovementPresentationRouteSurface,
    recordSurface(
      MovementReplacementLandingRejectedIllegalRouteSurface,
      qRoute.concat(movementReplacementIllegalLandingRejectedRoute),
      movementReplacementLandingRejectedIllegalFacts,
    ),
  }

  action doRouteForcedCreatureMovementPresentation = all {
    qSurface == FreshMovementPresentationRouteSurface,
    recordSurface(
      ForcedCreatureMovementPresentationRouteSurface,
      qRoute.concat(forcedCreatureMovementRoute),
      forcedCreatureMovementFacts,
    ),
  }

  action doRouteObjectPushPresentation = all {
    qSurface == FreshMovementPresentationRouteSurface,
    recordSurface(
      ObjectPushPresentationRouteSurface,
      qRoute.concat(objectPushPresentationRoute),
      objectPushPresentationFacts,
    ),
  }

  action step = any {
    doRouteMovementReplacementLandingAcceptedNoCheck,
    doRouteMovementReplacementLandingAcceptedDifficultTerrainAcrobaticsPassed,
    doRouteMovementReplacementLandingAcceptedDifficultTerrainAcrobaticsFailedProne,
    doRouteMovementReplacementLandingRejectedIllegal,
    doRouteForcedCreatureMovementPresentation,
    doRouteObjectPushPresentation,
  }
}
