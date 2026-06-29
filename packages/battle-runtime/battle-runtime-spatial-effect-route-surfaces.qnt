// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// Generic spatial-effect reducer route surfaces shared by the generic route
// driver and selected-row witnesses. This module carries no authored spell
// identity.
module battleRuntimeSpatialEffectRouteSurfaces {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"
  import battleRuntimeSpatialEffectRouteFacts.* from "./battle-runtime-spatial-effect-route-facts"

  pure val spatialEffectNoHoles: Set[BattleHoleFamilyKind] = Set()
  pure val spatialEffectTargetChoiceHoles: Set[BattleHoleFamilyKind] =
    Set(TargetChoiceHoleKind)
  pure val spatialEffectSavingThrowOutcomeHoles: Set[BattleHoleFamilyKind] =
    Set(SavingThrowOutcomeHoleKind)
  pure val spatialEffectMovementHoles: Set[BattleHoleFamilyKind] =
    Set(MovementHoleKind)
  pure val spatialEffectRolledDiceHoles: Set[BattleHoleFamilyKind] =
    Set(RolledDiceHoleKind)

  pure def spatialEffectStartRoute: ReducerRouteEvent =
    routeStartBattle(BattleActionEconomyOwner)

  pure def spatialEffectDiscoverRoute(
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeDiscoverBattleActs(SpatialEffectRouteSubject, holes, owner)

  pure def spatialEffectResolveRoute(
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

  pure def spatialEffectResolveRouteWithoutFill(
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubjectWithoutFill(
      SpatialEffectRouteSubject,
      holes,
      owner,
    )

  pure def spatialEffectAreaAdmissionRoute: List[ReducerRouteEvent] =
    List(
      spatialEffectDiscoverRoute(
        spatialEffectTargetChoiceHoles,
        BattleSpellSlotAndActionEconomyOwner,
      ),
      spatialEffectResolveRoute(
        TargetChoiceFillKind,
        spatialEffectNoHoles,
        BattleAreaShapeOwner,
      ),
      spatialEffectResolveRouteWithoutFill(
        spatialEffectNoHoles,
        BattleActiveEffectOwner,
      ),
    )

  pure def spatialEffectConcentrationRoute: List[ReducerRouteEvent] =
    List(
      spatialEffectResolveRouteWithoutFill(
        spatialEffectNoHoles,
        BattleConcentrationOwner,
      ),
    )

  pure def spatialEffectHazardProjectionRoute: List[ReducerRouteEvent] =
    List(
      spatialEffectResolveRouteWithoutFill(
        spatialEffectNoHoles,
        BattleAreaHazardOwner,
      ),
      spatialEffectResolveRouteWithoutFill(
        spatialEffectNoHoles,
        BattleCreatureSpaceMovementOwner,
      ),
    )

  pure def spatialEffectConcentrationBackedAreaHazardAdmissionRoute:
    List[ReducerRouteEvent] =
    spatialEffectAreaAdmissionRoute
      .concat(spatialEffectConcentrationRoute)
      .concat(spatialEffectHazardProjectionRoute)

  pure def spatialEffectHazardSavingThrowRoute: List[ReducerRouteEvent] =
    List(
      spatialEffectDiscoverRoute(
        spatialEffectSavingThrowOutcomeHoles,
        BattleAreaHazardOwner,
      ),
      spatialEffectResolveRoute(
        SavingThrowOutcomeFillKind,
        spatialEffectNoHoles,
        BattleSavingThrowOutcomeOwner,
      ),
      spatialEffectResolveRouteWithoutFill(
        spatialEffectNoHoles,
        BattleConditionLifecycleOwner,
      ),
    )

  pure def spatialEffectHazardSavingThrowDamageRoute:
    List[ReducerRouteEvent] =
    List(
      spatialEffectDiscoverRoute(
        spatialEffectSavingThrowOutcomeHoles,
        BattleAreaHazardOwner,
      ),
      spatialEffectResolveRoute(
        SavingThrowOutcomeFillKind,
        spatialEffectRolledDiceHoles,
        BattleSavingThrowOutcomeOwner,
      ),
      spatialEffectResolveRoute(
        RolledDiceFillKind,
        spatialEffectNoHoles,
        BattleHitPointOwner,
      ),
    )

  pure def spatialEffectHazardDifficultTerrainMovementRoute:
    List[ReducerRouteEvent] =
    List(
      spatialEffectDiscoverRoute(
        spatialEffectMovementHoles,
        BattleAreaHazardOwner,
      ),
      spatialEffectResolveRoute(
        MovementFillKind,
        spatialEffectNoHoles,
        BattleMovementResourceOwner,
      ),
    )

  pure def spatialEffectHazardMovementDamageRoute:
    List[ReducerRouteEvent] =
    List(
      spatialEffectDiscoverRoute(
        spatialEffectMovementHoles,
        BattleAreaHazardOwner,
      ),
      spatialEffectResolveRoute(
        MovementFillKind,
        spatialEffectRolledDiceHoles,
        BattleMovementResourceOwner,
      ),
      spatialEffectResolveRoute(
        RolledDiceFillKind,
        spatialEffectNoHoles,
        BattleHitPointOwner,
      ),
    )

  pure def spatialEffectLightProjectionRoute: List[ReducerRouteEvent] =
    List(
      spatialEffectResolveRouteWithoutFill(
        spatialEffectNoHoles,
        BattleLightProjectionOwner,
      ),
    )

  pure def spatialEffectObscurementProjectionRoute:
    List[ReducerRouteEvent] =
    List(
      spatialEffectResolveRouteWithoutFill(
        spatialEffectNoHoles,
        BattleObscurementProjectionOwner,
      ),
      spatialEffectResolveRouteWithoutFill(
        spatialEffectNoHoles,
        BattleSightProjectionOwner,
      ),
    )

  pure def spatialEffectConcentrationBreakHazardCleanupRoute:
    List[ReducerRouteEvent] =
    List(
      spatialEffectResolveRouteWithoutFill(
        spatialEffectNoHoles,
        BattleConcentrationOwner,
      ),
      spatialEffectResolveRouteWithoutFill(
        spatialEffectNoHoles,
        BattleAreaHazardOwner,
      ),
      spatialEffectResolveRouteWithoutFill(
        spatialEffectNoHoles,
        BattleActiveEffectOwner,
      ),
    )

  pure def spatialEffectConcentrationBackedAreaHazardBaseFacts:
    List[SpatialEffectRouteFact] =
    List(
      RouteSpatialEffectBattleEffect({ effect: AreaHazardEffectAdmitted }),
      RouteSpatialEffectBattleEffect({ effect: ConcentrationBackedEffect }),
      RouteSpatialEffectGeometry({ geometry: AreaShapeWitness }),
    )

  pure def spatialEffectDifficultTerrainHazardFacts:
    List[SpatialEffectRouteFact] =
    List(RouteSpatialEffectHazard({ hazard: DifficultTerrainProjection }))

  pure def spatialEffectHazardSaveFacts: List[SpatialEffectRouteFact] =
    List(
      RouteSpatialEffectGeometry({ geometry: AreaMembershipWitness }),
      RouteSpatialEffectHazard({ hazard: EntrySavingThrowTrigger }),
      RouteSpatialEffectHazard({ hazard: StartTurnSavingThrowTrigger }),
      RouteSpatialEffectHazard({ hazard: PerTurnTriggerLimit }),
    )

  pure def spatialEffectHazardDifficultTerrainMovementFacts:
    List[SpatialEffectRouteFact] =
    List(
      RouteSpatialEffectGeometry({ geometry: MovementPathWitness }),
      RouteSpatialEffectHazard({ hazard: DifficultTerrainProjection }),
    )

  pure def spatialEffectHazardMovementDamageFacts:
    List[SpatialEffectRouteFact] =
    List(
      RouteSpatialEffectGeometry({ geometry: MovementPathWitness }),
      RouteSpatialEffectHazard({ hazard: MovementDamageTrigger }),
    )

  pure def spatialEffectHazardSavingThrowDamageFacts:
    List[SpatialEffectRouteFact] =
    List(
      RouteSpatialEffectGeometry({ geometry: AreaMembershipWitness }),
      RouteSpatialEffectHazard({ hazard: SaveTriggeredDamageTrigger }),
    )

  pure def spatialEffectConcentrationBreakHazardCleanupFacts:
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
}
