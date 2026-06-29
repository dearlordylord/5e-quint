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
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"
  import battleRuntimeSpatialEffectRouteFacts.* from "./battle-runtime-spatial-effect-route-facts"

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

  pure val noHoles: Set[BattleHoleFamilyKind] = Set()
  pure val targetChoiceHoles: Set[BattleHoleFamilyKind] =
    Set(TargetChoiceHoleKind)
  pure val savingThrowOutcomeHoles: Set[BattleHoleFamilyKind] =
    Set(SavingThrowOutcomeHoleKind)
  pure val movementHoles: Set[BattleHoleFamilyKind] = Set(MovementHoleKind)
  pure val rolledDiceHoles: Set[BattleHoleFamilyKind] = Set(RolledDiceHoleKind)

  pure def startRoute: ReducerRouteEvent =
    routeStartBattle(BattleActionEconomyOwner)

  pure def discoverRoute(
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeDiscoverBattleActs(SpatialEffectRouteSubject, holes, owner)

  pure def resolveRoute(
    fill: BattleFillKind,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubject(
      SpatialEffectRouteSubject,
      fill,
      holes,
      owner,
    )

  pure def resolveRouteWithoutFill(
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubjectWithoutFill(
      SpatialEffectRouteSubject,
      holes,
      owner,
    )

  pure def concentrationBackedAreaHazardAdmissionRoute:
    List[ReducerRouteEvent] =
    List(
      discoverRoute(targetChoiceHoles, BattleSpellSlotAndActionEconomyOwner),
      resolveRoute(TargetChoiceFillKind, noHoles, BattleAreaShapeOwner),
      resolveRouteWithoutFill(noHoles, BattleActiveEffectOwner),
      resolveRouteWithoutFill(noHoles, BattleConcentrationOwner),
      resolveRouteWithoutFill(noHoles, BattleAreaHazardOwner),
      resolveRouteWithoutFill(noHoles, BattleCreatureSpaceMovementOwner),
    )

  pure def hazardSavingThrowRoute: List[ReducerRouteEvent] =
    List(
      discoverRoute(savingThrowOutcomeHoles, BattleAreaHazardOwner),
      resolveRoute(
        SavingThrowOutcomeFillKind,
        noHoles,
        BattleSavingThrowOutcomeOwner,
      ),
      resolveRouteWithoutFill(noHoles, BattleConditionLifecycleOwner),
    )

  pure def hazardLightProjectionRoute: List[ReducerRouteEvent] =
    List(resolveRouteWithoutFill(noHoles, BattleLightProjectionOwner))

  pure def hazardObscurementProjectionRoute: List[ReducerRouteEvent] =
    List(
      resolveRouteWithoutFill(noHoles, BattleObscurementProjectionOwner),
      resolveRouteWithoutFill(noHoles, BattleSightProjectionOwner),
    )

  pure def hazardMovementDamageRoute: List[ReducerRouteEvent] =
    List(
      discoverRoute(movementHoles, BattleAreaHazardOwner),
      resolveRoute(
        MovementFillKind,
        rolledDiceHoles,
        BattleMovementResourceOwner,
      ),
      resolveRoute(RolledDiceFillKind, noHoles, BattleHitPointOwner),
    )

  pure def concentrationBreakHazardCleanupRoute: List[ReducerRouteEvent] =
    List(
      resolveRouteWithoutFill(noHoles, BattleConcentrationOwner),
      resolveRouteWithoutFill(noHoles, BattleAreaHazardOwner),
      resolveRouteWithoutFill(noHoles, BattleActiveEffectOwner),
    )

  pure def concentrationBackedAreaHazardBaseFacts:
    List[SpatialEffectRouteFact] =
    List(
      RouteSpatialEffectBattleEffect({ effect: AreaHazardEffectAdmitted }),
      RouteSpatialEffectBattleEffect({ effect: ConcentrationBackedEffect }),
      RouteSpatialEffectGeometry({ geometry: AreaShapeWitness }),
    )

  pure def difficultTerrainHazardFacts: List[SpatialEffectRouteFact] =
    List(
      RouteSpatialEffectHazard({ hazard: DifficultTerrainProjection }),
    )

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

  pure def hazardMovementDamageFacts: List[SpatialEffectRouteFact] =
    List(
      RouteSpatialEffectGeometry({ geometry: MovementPathWitness }),
      RouteSpatialEffectHazard({ hazard: MovementDamageTrigger }),
    )

  pure def concentrationBreakHazardCleanupFacts:
    List[SpatialEffectRouteFact] =
    List(
      RouteSpatialEffectHazard({ hazard: AreaRemovedCleanup }),
      RouteSpatialEffectCleanedUpBy({
        cleanup: ConcentrationBreakCleanup,
        owner: BattleConcentrationCleanupOwner,
      }),
      RouteSpatialEffectCleanedUpBy({
        cleanup: ConcentrationBreakCleanup,
        owner: BattleAreaHazardCleanupOwner,
      }),
      RouteSpatialEffectCleanedUpBy({
        cleanup: ConcentrationBreakCleanup,
        owner: BattleActiveEffectCleanupOwner,
      }),
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
    List(startRoute),
    List(),
  )

  action doDiscoverFlamingSphereHazard = all {
    qSurface == FreshSelectedConcentrationHazardRouteSurface,
    recordRoute(
      FlamingSphereHazardRow,
      SelectedConcentrationHazardSaveRouteSurface,
      qRoute
        .concat(concentrationBackedAreaHazardAdmissionRoute)
        .concat(hazardSavingThrowRoute)
        .concat(concentrationBreakHazardCleanupRoute),
      concentrationBackedAreaHazardBaseFacts
        .concat(flamingSphereHazardSaveFacts)
        .concat(concentrationBreakHazardCleanupFacts),
    ),
  }

  action doDiscoverMoonbeamMovableZone = all {
    qSurface == FreshSelectedConcentrationHazardRouteSurface,
    recordRoute(
      MoonbeamMovableZoneRow,
      SelectedConcentrationHazardSaveRouteSurface,
      qRoute
        .concat(concentrationBackedAreaHazardAdmissionRoute)
        .concat(hazardLightProjectionRoute)
        .concat(hazardSavingThrowRoute)
        .concat(concentrationBreakHazardCleanupRoute),
      concentrationBackedAreaHazardBaseFacts
        .concat(moonbeamHazardSaveFacts)
        .concat(concentrationBreakHazardCleanupFacts),
    ),
  }

  action doDiscoverSpikeGrowthMovementHazard = all {
    qSurface == FreshSelectedConcentrationHazardRouteSurface,
    recordRoute(
      SpikeGrowthMovementHazardRow,
      SelectedConcentrationHazardMovementDamageRouteSurface,
      qRoute
        .concat(concentrationBackedAreaHazardAdmissionRoute)
        .concat(hazardMovementDamageRoute)
        .concat(concentrationBreakHazardCleanupRoute),
      concentrationBackedAreaHazardBaseFacts
        .concat(difficultTerrainHazardFacts)
        .concat(hazardMovementDamageFacts)
        .concat(concentrationBreakHazardCleanupFacts),
    ),
  }

  action doDiscoverWebRestraintHazard = all {
    qSurface == FreshSelectedConcentrationHazardRouteSurface,
    recordRoute(
      WebRestraintHazardRow,
      SelectedConcentrationHazardSaveRouteSurface,
      qRoute
        .concat(concentrationBackedAreaHazardAdmissionRoute)
        .concat(hazardObscurementProjectionRoute)
        .concat(hazardSavingThrowRoute)
        .concat(concentrationBreakHazardCleanupRoute),
      concentrationBackedAreaHazardBaseFacts
        .concat(difficultTerrainHazardFacts)
        .concat(webHazardSaveFacts)
        .concat(concentrationBreakHazardCleanupFacts),
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
