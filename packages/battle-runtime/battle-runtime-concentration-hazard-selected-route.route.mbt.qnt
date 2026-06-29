// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Rules-Glossary.md#Concentration defines that when
//   an effect's creator loses Concentration, that effect ends.
// - .references/srd-5.2.1/Rules-Glossary.md#Difficult Terrain and
//   .references/srd-5.2.1/Playing-the-Game.md#Difficult Terrain define
//   movement-cost projection for hazardous spaces.
// - .references/srd-5.2.1/Spells/Gaining-and-Casting.md#Saving Throws defines
//   spell Saving Throw outcome frontiers.
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Flaming Sphere,
//   Descriptions-M-P.md#Moonbeam, and Descriptions-S-Z.md#Spike Growth /
//   #Web provide selected SRD concentration-backed hazard rows.
// - UBIQUITOUS_LANGUAGE.md: Spell Effect, Area of Effect, Concentration,
//   Movement, Difficult Terrain, Saving Throw, Restrained, and Table Decision.
module battleRuntimeConcentrationHazardSelectedRouteMbt {
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"
  import battleRuntimeSpatialEffectRouteFacts.* from "./battle-runtime-spatial-effect-route-facts"
  import battleRuntimeSpatialEffectRouteSurfaces.* from "./battle-runtime-spatial-effect-route-surfaces"

  type SelectedConcentrationHazardRow =
    | NoSelectedConcentrationHazardRow
    | FlamingSphereHazardRow
    | MoonbeamMovableZoneRow
    | SpikeGrowthMovementHazardRow
    | WebRestraintHazardRow

  type SelectedConcentrationHazardRouteSurface =
    | FreshSelectedConcentrationHazardRouteSurface
    | SelectedConcentrationHazardSaveRouteSurface
    | SelectedConcentrationHazardMovementDamageRouteSurface

  var qSelectedRow: SelectedConcentrationHazardRow
  var qSurface: SelectedConcentrationHazardRouteSurface
  var qRoute: List[ReducerRouteEvent]
  var qFacts: List[SpatialEffectRouteFact]

  pure def flamingSphereHazardSaveFacts: List[SpatialEffectRouteFact] =
    List(
      RouteSpatialEffectGeometry({ geometry: AreaMembershipWitness }),
      RouteSpatialEffectHazard({ hazard: AreaMovedSavingThrowTrigger }),
      RouteSpatialEffectHazard({ hazard: EndTurnSavingThrowTrigger }),
    )

  pure def moonbeamHazardSaveFacts: List[SpatialEffectRouteFact] =
    List(
      RouteSpatialEffectGeometry({ geometry: AreaMembershipWitness }),
      RouteSpatialEffectLight({ light: DimLightProjection }),
      RouteSpatialEffectHazard({ hazard: AreaCreatedSavingThrowTrigger }),
      RouteSpatialEffectHazard({ hazard: AreaMovedSavingThrowTrigger }),
      RouteSpatialEffectHazard({ hazard: EntrySavingThrowTrigger }),
      RouteSpatialEffectHazard({ hazard: EndTurnSavingThrowTrigger }),
      RouteSpatialEffectHazard({ hazard: PerTurnTriggerLimit }),
    )

  pure def webHazardSaveFacts: List[SpatialEffectRouteFact] =
    List(
      RouteSpatialEffectGeometry({ geometry: AreaMembershipWitness }),
      RouteSpatialEffectSight({ sight: LightlyObscuredProjection }),
      RouteSpatialEffectHazard({ hazard: EntrySavingThrowTrigger }),
      RouteSpatialEffectHazard({ hazard: StartTurnSavingThrowTrigger }),
      RouteSpatialEffectHazard({ hazard: FailedSaveRestraintTrigger }),
    )

  action recordRoute(
    selectedRow: SelectedConcentrationHazardRow,
    surface: SelectedConcentrationHazardRouteSurface,
    route: List[ReducerRouteEvent],
    facts: List[SpatialEffectRouteFact],
  ): bool = all {
    qSelectedRow' = selectedRow,
    qSurface' = surface,
    qRoute' = route,
    qFacts' = facts,
  }

  action init = recordRoute(
    NoSelectedConcentrationHazardRow,
    FreshSelectedConcentrationHazardRouteSurface,
    List(spatialEffectStartRoute),
    List(),
  )

  action doDiscoverFlamingSphereHazard = all {
    qSurface == FreshSelectedConcentrationHazardRouteSurface,
    recordRoute(
      FlamingSphereHazardRow,
      SelectedConcentrationHazardSaveRouteSurface,
      qRoute
        .concat(spatialEffectConcentrationBackedAreaHazardAdmissionRoute)
        .concat(spatialEffectHazardSavingThrowRoute)
        .concat(spatialEffectConcentrationBreakHazardCleanupRoute),
      spatialEffectConcentrationBackedAreaHazardBaseFacts
        .concat(flamingSphereHazardSaveFacts)
        .concat(spatialEffectConcentrationBreakHazardCleanupFacts),
    ),
  }

  action doDiscoverMoonbeamMovableZone = all {
    qSurface == FreshSelectedConcentrationHazardRouteSurface,
    recordRoute(
      MoonbeamMovableZoneRow,
      SelectedConcentrationHazardSaveRouteSurface,
      qRoute
        .concat(spatialEffectConcentrationBackedAreaHazardAdmissionRoute)
        .concat(spatialEffectLightProjectionRoute)
        .concat(spatialEffectHazardSavingThrowRoute)
        .concat(spatialEffectConcentrationBreakHazardCleanupRoute),
      spatialEffectConcentrationBackedAreaHazardBaseFacts
        .concat(moonbeamHazardSaveFacts)
        .concat(spatialEffectConcentrationBreakHazardCleanupFacts),
    ),
  }

  action doDiscoverSpikeGrowthMovementHazard = all {
    qSurface == FreshSelectedConcentrationHazardRouteSurface,
    recordRoute(
      SpikeGrowthMovementHazardRow,
      SelectedConcentrationHazardMovementDamageRouteSurface,
      qRoute
        .concat(spatialEffectConcentrationBackedAreaHazardAdmissionRoute)
        .concat(spatialEffectHazardMovementDamageRoute)
        .concat(spatialEffectConcentrationBreakHazardCleanupRoute),
      spatialEffectConcentrationBackedAreaHazardBaseFacts
        .concat(spatialEffectDifficultTerrainHazardFacts)
        .concat(spatialEffectHazardMovementDamageFacts)
        .concat(spatialEffectConcentrationBreakHazardCleanupFacts),
    ),
  }

  action doDiscoverWebRestraintHazard = all {
    qSurface == FreshSelectedConcentrationHazardRouteSurface,
    recordRoute(
      WebRestraintHazardRow,
      SelectedConcentrationHazardSaveRouteSurface,
      qRoute
        .concat(spatialEffectConcentrationBackedAreaHazardAdmissionRoute)
        .concat(spatialEffectObscurementProjectionRoute)
        .concat(spatialEffectHazardSavingThrowRoute)
        .concat(spatialEffectConcentrationBreakHazardCleanupRoute),
      spatialEffectConcentrationBackedAreaHazardBaseFacts
        .concat(spatialEffectDifficultTerrainHazardFacts)
        .concat(webHazardSaveFacts)
        .concat(spatialEffectConcentrationBreakHazardCleanupFacts),
    ),
  }

  action doStutterAfterTerminalSurface = all {
    qSurface != FreshSelectedConcentrationHazardRouteSurface,
    recordRoute(qSelectedRow, qSurface, qRoute, qFacts),
  }

  action step = any {
    doDiscoverFlamingSphereHazard,
    doDiscoverMoonbeamMovableZone,
    doDiscoverSpikeGrowthMovementHazard,
    doDiscoverWebRestraintHazard,
    doStutterAfterTerminalSurface,
  }
}
