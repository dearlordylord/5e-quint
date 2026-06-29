// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md#Vision and Light defines
//   Lightly Obscured and Heavily Obscured areas plus Bright, Dim, and Darkness
//   illumination.
// - .references/srd-5.2.1/Playing-the-Game.md#Making an Attack and
//   .references/srd-5.2.1/Rules-Glossary.md#Invisible [Condition] define
//   sight-dependent attack Advantage/Disadvantage.
// - .references/srd-5.2.1/Rules-Glossary.md#Area of Effect and #Cover define
//   table-owned area geometry and Total Cover obstruction.
// - .references/srd-5.2.1/Playing-the-Game.md#Difficult Terrain and
//   .references/srd-5.2.1/Rules-Glossary.md#Difficult Terrain define movement
//   cost through hazardous or obstructed spaces.
// - .references/srd-5.2.1/Rules-Glossary.md#Concentration defines that when
//   an effect's creator loses Concentration, that effect ends.
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Dancing Lights,
//   Descriptions-E-L.md#Faerie Fire / #Fog Cloud / #Grease, and
//   Descriptions-S-Z.md#Sleet Storm / #Spike Growth / #Web provide SRD
//   examples of the generic route facts modeled here.
// - UBIQUITOUS_LANGUAGE.md: Table Decision, Illumination, Obscurement,
//   Area of Effect, Spell Effect, Attack Roll, Movement, and Action Lifecycle.
module battleRuntimeSpatialEffectsRouteMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"
  import battleRuntimeSpatialEffectRouteFacts.* from "./battle-runtime-spatial-effect-route-facts"

  type SpatialEffectRouteSurface =
    | FreshSpatialEffectRouteSurface
    | MovableMultiEmitterLightActiveRouteSurface
    | MovableMultiEmitterLightMovedRouteSurface
    | OutlineSightEffectActiveRouteSurface
    | OutlineSightEffectProjectedRouteSurface
    | AreaObscurementActiveRouteSurface
    | AreaObscurementDurationCleanedRouteSurface
    | AreaObscurementDispersedRouteSurface
    | AreaHazardActiveRouteSurface
    | AreaHazardSaveResolvedRouteSurface
    | AreaHazardDifficultTerrainMovementResolvedRouteSurface
    | AreaHazardMovementDamageResolvedRouteSurface
    | AreaHazardCleanedRouteSurface
    | ConcentrationBackedAreaHazardActiveRouteSurface
    | ConcentrationBackedAreaHazardCleanedRouteSurface
    | TableSpatialWitnessRouteSurface

  var qSurface: SpatialEffectRouteSurface
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

  pure def effectAdmissionRoute: List[ReducerRouteEvent] =
    List(
      discoverRoute(noHoles, BattleSpellSlotAndActionEconomyOwner),
      resolveRouteWithoutFill(noHoles, BattleActiveEffectOwner),
    )

  pure def concentrationRoute: List[ReducerRouteEvent] =
    List(resolveRouteWithoutFill(noHoles, BattleConcentrationOwner))

  pure def lightProjectionRoute: List[ReducerRouteEvent] =
    List(resolveRouteWithoutFill(noHoles, BattleLightProjectionOwner))

  pure def moveEmitterRoute: List[ReducerRouteEvent] =
    List(
      discoverRoute(targetChoiceHoles, BattleSpellSlotAndActionEconomyOwner),
      resolveRoute(TargetChoiceFillKind, noHoles, BattleAreaShapeOwner),
      resolveRouteWithoutFill(noHoles, BattleLightProjectionOwner),
    )

  pure def outlineAdmissionRoute: List[ReducerRouteEvent] =
    List(
      discoverRoute(
        Set(TargetChoiceHoleKind, SavingThrowOutcomeHoleKind),
        BattleSpellSlotAndActionEconomyOwner,
      ),
      resolveRoute(
        TargetChoiceFillKind,
        savingThrowOutcomeHoles,
        BattleAreaShapeOwner,
      ),
      resolveRoute(
        SavingThrowOutcomeFillKind,
        noHoles,
        BattleSavingThrowOutcomeOwner,
      ),
      resolveRouteWithoutFill(noHoles, BattleActiveEffectOwner),
    )

  pure def outlineProjectionRoute: List[ReducerRouteEvent] =
    List(
      resolveRouteWithoutFill(noHoles, BattleLightProjectionOwner),
      resolveRouteWithoutFill(noHoles, BattleSightProjectionOwner),
      resolveRouteWithoutFill(noHoles, BattleAttackRollModeOwner),
    )

  pure def areaAdmissionRoute: List[ReducerRouteEvent] =
    List(
      discoverRoute(targetChoiceHoles, BattleSpellSlotAndActionEconomyOwner),
      resolveRoute(TargetChoiceFillKind, noHoles, BattleAreaShapeOwner),
      resolveRouteWithoutFill(noHoles, BattleActiveEffectOwner),
    )

  pure def obscurementProjectionRoute: List[ReducerRouteEvent] =
    List(
      resolveRouteWithoutFill(noHoles, BattleObscurementProjectionOwner),
      resolveRouteWithoutFill(noHoles, BattleSightProjectionOwner),
    )

  pure def hazardProjectionRoute: List[ReducerRouteEvent] =
    List(
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

  pure def hazardDifficultTerrainMovementRoute: List[ReducerRouteEvent] =
    List(
      discoverRoute(movementHoles, BattleAreaHazardOwner),
      resolveRoute(
        MovementFillKind,
        noHoles,
        BattleMovementResourceOwner,
      ),
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

  pure def obscurementDurationCleanupRoute: List[ReducerRouteEvent] =
    List(
      resolveRouteWithoutFill(noHoles, BattleTurnBoundaryOwner),
      resolveRouteWithoutFill(noHoles, BattleObscurementProjectionOwner),
      resolveRouteWithoutFill(noHoles, BattleActiveEffectOwner),
      resolveRouteWithoutFill(noHoles, BattleConcentrationOwner),
    )

  pure def obscurementDispersalCleanupRoute: List[ReducerRouteEvent] =
    List(
      resolveRouteWithoutFill(noHoles, BattleObscurementProjectionOwner),
      resolveRouteWithoutFill(noHoles, BattleActiveEffectOwner),
      resolveRouteWithoutFill(noHoles, BattleConcentrationOwner),
    )

  pure def hazardCleanupRoute: List[ReducerRouteEvent] =
    List(
      resolveRouteWithoutFill(noHoles, BattleTurnBoundaryOwner),
      resolveRouteWithoutFill(noHoles, BattleAreaHazardOwner),
      resolveRouteWithoutFill(noHoles, BattleActiveEffectOwner),
    )

  pure def concentrationBreakHazardCleanupRoute: List[ReducerRouteEvent] =
    List(
      resolveRouteWithoutFill(noHoles, BattleConcentrationOwner),
      resolveRouteWithoutFill(noHoles, BattleAreaHazardOwner),
      resolveRouteWithoutFill(noHoles, BattleActiveEffectOwner),
    )

  pure def tableSpatialWitnessRoute: List[ReducerRouteEvent] =
    List(
      resolveRouteWithoutFill(noHoles, BattleAreaShapeOwner),
      resolveRouteWithoutFill(noHoles, BattleSightProjectionOwner),
      resolveRouteWithoutFill(noHoles, BattleAreaHazardOwner),
    )

  pure def movableMultiEmitterLightFacts: List[SpatialEffectRouteFact] =
    List(
      RouteSpatialEffectBattleEffect({
        effect: MovableMultiEmitterEffectAdmitted,
      }),
      RouteSpatialEffectBattleEffect({ effect: ConcentrationBackedEffect }),
      RouteSpatialEffectLight({ light: MultiEmitterDimLightProjection }),
      RouteSpatialEffectPresentation({
        presentation: EmitterAppearancePresentation,
      }),
    )

  pure def movableEmitterMovedFacts: List[SpatialEffectRouteFact] =
    List(
      RouteSpatialEffectLight({ light: EmitterPositionMoved }),
      RouteSpatialEffectGeometry({ geometry: MovementPathWitness }),
    )

  pure def outlineAdmissionFacts: List[SpatialEffectRouteFact] =
    List(
      RouteSpatialEffectBattleEffect({ effect: OutlineEffectAdmitted }),
      RouteSpatialEffectBattleEffect({ effect: ConcentrationBackedEffect }),
      RouteSpatialEffectGeometry({ geometry: AreaShapeWitness }),
      RouteSpatialEffectGeometry({ geometry: AreaMembershipWitness }),
      RouteSpatialEffectLight({ light: DimLightProjection }),
      RouteSpatialEffectPresentation({ presentation: ColorChoicePresentation }),
      RouteSpatialEffectPresentation({
        presentation: VisibleOutlinePresentation,
      }),
      RouteSpatialEffectObject({ object: OutlinedObjectWitness }),
    )

  pure def outlineProjectionFacts: List[SpatialEffectRouteFact] =
    List(
      RouteSpatialEffectSight({ sight: AttackerCanSeeTargetWitness }),
      RouteSpatialEffectSight({ sight: InvisibleBenefitDeniedProjection }),
      RouteSpatialEffectSight({ sight: AttackRollAdvantageProjection }),
      RouteSpatialEffectObject({ object: ObjectSightTargetWitness }),
      RouteSpatialEffectObject({
        object: ObjectInvisibleBenefitDeniedProjection,
      }),
    )

  pure def areaObscurementFacts: List[SpatialEffectRouteFact] =
    List(
      RouteSpatialEffectBattleEffect({
        effect: AreaObscurementEffectAdmitted,
      }),
      RouteSpatialEffectBattleEffect({ effect: ConcentrationBackedEffect }),
      RouteSpatialEffectGeometry({ geometry: AreaShapeWitness }),
      RouteSpatialEffectSight({ sight: HeavilyObscuredProjection }),
    )

  pure def areaHazardFacts: List[SpatialEffectRouteFact] =
    List(
      RouteSpatialEffectBattleEffect({ effect: AreaHazardEffectAdmitted }),
      RouteSpatialEffectGeometry({ geometry: AreaShapeWitness }),
      RouteSpatialEffectHazard({ hazard: DifficultTerrainProjection }),
    )

  pure def concentrationBackedAreaHazardFacts:
    List[SpatialEffectRouteFact] =
    List(
      RouteSpatialEffectBattleEffect({ effect: AreaHazardEffectAdmitted }),
      RouteSpatialEffectBattleEffect({ effect: ConcentrationBackedEffect }),
      RouteSpatialEffectGeometry({ geometry: AreaShapeWitness }),
      RouteSpatialEffectHazard({ hazard: DifficultTerrainProjection }),
    )

  pure def hazardSaveFacts: List[SpatialEffectRouteFact] =
    List(
      RouteSpatialEffectGeometry({ geometry: AreaMembershipWitness }),
      RouteSpatialEffectHazard({ hazard: EntrySavingThrowTrigger }),
      RouteSpatialEffectHazard({ hazard: StartTurnSavingThrowTrigger }),
      RouteSpatialEffectHazard({ hazard: PerTurnTriggerLimit }),
    )

  pure def hazardDifficultTerrainMovementFacts: List[SpatialEffectRouteFact] =
    List(
      RouteSpatialEffectGeometry({ geometry: MovementPathWitness }),
      RouteSpatialEffectHazard({ hazard: DifficultTerrainProjection }),
    )

  pure def hazardMovementDamageFacts: List[SpatialEffectRouteFact] =
    List(
      RouteSpatialEffectGeometry({ geometry: MovementPathWitness }),
      RouteSpatialEffectHazard({ hazard: MovementDamageTrigger }),
    )

  pure def obscurementDurationCleanupFacts: List[SpatialEffectRouteFact] =
    List(
      RouteSpatialEffectCleanedUpBy({
        cleanup: DurationCleanup,
        owner: BattleObscurementCleanupOwner,
      }),
      RouteSpatialEffectCleanedUpBy({
        cleanup: DurationCleanup,
        owner: BattleActiveEffectCleanupOwner,
      }),
      RouteSpatialEffectCleanedUpBy({
        cleanup: DurationCleanup,
        owner: BattleConcentrationCleanupOwner,
      }),
    )

  pure def obscurementDispersalCleanupFacts: List[SpatialEffectRouteFact] =
    List(
      RouteSpatialEffectGeometry({ geometry: StrongWindWitness }),
      RouteSpatialEffectCleanedUpBy({
        cleanup: DispersalCleanup,
        owner: BattleObscurementCleanupOwner,
      }),
      RouteSpatialEffectCleanedUpBy({
        cleanup: DispersalCleanup,
        owner: BattleActiveEffectCleanupOwner,
      }),
      RouteSpatialEffectCleanedUpBy({
        cleanup: DispersalCleanup,
        owner: BattleConcentrationCleanupOwner,
      }),
    )

  pure def hazardCleanupFacts: List[SpatialEffectRouteFact] =
    List(
      RouteSpatialEffectHazard({ hazard: AreaRemovedCleanup }),
      RouteSpatialEffectCleanedUpBy({
        cleanup: RemovalCleanup,
        owner: BattleAreaHazardCleanupOwner,
      }),
      RouteSpatialEffectCleanedUpBy({
        cleanup: DurationCleanup,
        owner: BattleActiveEffectCleanupOwner,
      }),
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

  pure def tableSpatialWitnessFacts: List[SpatialEffectRouteFact] =
    List(
      RouteSpatialEffectGeometry({ geometry: AreaShapeWitness }),
      RouteSpatialEffectGeometry({ geometry: AreaMembershipWitness }),
      RouteSpatialEffectGeometry({ geometry: TotalCoverBlockerWitness }),
      RouteSpatialEffectGeometry({ geometry: MovementPathWitness }),
      RouteSpatialEffectObject({ object: OutlinedObjectWitness }),
      RouteSpatialEffectSight({ sight: AttackerCanSeeTargetWitness }),
      RouteSpatialEffectSight({ sight: LightlyObscuredProjection }),
      RouteSpatialEffectHazard({ hazard: DifficultTerrainProjection }),
      RouteSpatialEffectPresentation({ presentation: ColorChoicePresentation }),
    )

  action recordSurface(
    surface: SpatialEffectRouteSurface,
    route: List[ReducerRouteEvent],
    facts: List[SpatialEffectRouteFact],
  ): bool = all {
    qSurface' = surface,
    qRoute' = route,
    qFacts' = facts,
  }

  action init = recordSurface(
    FreshSpatialEffectRouteSurface,
    List(startRoute),
    List(),
  )

  action doAdmitMovableMultiEmitterLight = all {
    qSurface == FreshSpatialEffectRouteSurface,
    recordSurface(
      MovableMultiEmitterLightActiveRouteSurface,
      qRoute
        .concat(effectAdmissionRoute)
        .concat(concentrationRoute)
        .concat(lightProjectionRoute),
      movableMultiEmitterLightFacts,
    ),
  }

  action doMoveMovableMultiEmitterLight = all {
    qSurface == MovableMultiEmitterLightActiveRouteSurface,
    recordSurface(
      MovableMultiEmitterLightMovedRouteSurface,
      qRoute.concat(moveEmitterRoute),
      qFacts.concat(movableEmitterMovedFacts),
    ),
  }

  action doAdmitOutlineSightEffect = all {
    qSurface == FreshSpatialEffectRouteSurface,
    recordSurface(
      OutlineSightEffectActiveRouteSurface,
      qRoute.concat(outlineAdmissionRoute).concat(concentrationRoute),
      outlineAdmissionFacts,
    ),
  }

  action doProjectOutlineSightAttackAdvantage = all {
    qSurface == OutlineSightEffectActiveRouteSurface,
    recordSurface(
      OutlineSightEffectProjectedRouteSurface,
      qRoute.concat(outlineProjectionRoute),
      qFacts.concat(outlineProjectionFacts),
    ),
  }

  action doAdmitAreaObscurement = all {
    qSurface == FreshSpatialEffectRouteSurface,
    recordSurface(
      AreaObscurementActiveRouteSurface,
      qRoute
        .concat(areaAdmissionRoute)
        .concat(concentrationRoute)
        .concat(obscurementProjectionRoute),
      areaObscurementFacts,
    ),
  }

  action doCleanupAreaObscurementByDuration = all {
    qSurface == AreaObscurementActiveRouteSurface,
    recordSurface(
      AreaObscurementDurationCleanedRouteSurface,
      qRoute.concat(obscurementDurationCleanupRoute),
      qFacts.concat(obscurementDurationCleanupFacts),
    ),
  }

  action doDisperseAreaObscurementByStrongWind = all {
    qSurface == AreaObscurementActiveRouteSurface,
    recordSurface(
      AreaObscurementDispersedRouteSurface,
      qRoute.concat(obscurementDispersalCleanupRoute),
      qFacts.concat(obscurementDispersalCleanupFacts),
    ),
  }

  action doAdmitAreaHazard = all {
    qSurface == FreshSpatialEffectRouteSurface,
    recordSurface(
      AreaHazardActiveRouteSurface,
      qRoute.concat(areaAdmissionRoute).concat(hazardProjectionRoute),
      areaHazardFacts,
    ),
  }

  action doAdmitConcentrationBackedAreaHazard = all {
    qSurface == FreshSpatialEffectRouteSurface,
    recordSurface(
      ConcentrationBackedAreaHazardActiveRouteSurface,
      qRoute
        .concat(areaAdmissionRoute)
        .concat(concentrationRoute)
        .concat(hazardProjectionRoute),
      concentrationBackedAreaHazardFacts,
    ),
  }

  action doResolveAreaHazardSavingThrowTrigger = all {
    qSurface == AreaHazardActiveRouteSurface,
    recordSurface(
      AreaHazardSaveResolvedRouteSurface,
      qRoute.concat(hazardSavingThrowRoute),
      qFacts.concat(hazardSaveFacts),
    ),
  }

  action doResolveAreaHazardDifficultTerrainMovement = all {
    qSurface == AreaHazardActiveRouteSurface,
    recordSurface(
      AreaHazardDifficultTerrainMovementResolvedRouteSurface,
      qRoute.concat(hazardDifficultTerrainMovementRoute),
      qFacts.concat(hazardDifficultTerrainMovementFacts),
    ),
  }

  action doResolveAreaHazardMovementDamageTrigger = all {
    qSurface == AreaHazardActiveRouteSurface,
    recordSurface(
      AreaHazardMovementDamageResolvedRouteSurface,
      qRoute.concat(hazardMovementDamageRoute),
      qFacts.concat(hazardMovementDamageFacts),
    ),
  }

  action doCleanupAreaHazard = all {
    qSurface.in(Set(
      AreaHazardActiveRouteSurface,
      AreaHazardSaveResolvedRouteSurface,
      AreaHazardDifficultTerrainMovementResolvedRouteSurface,
      AreaHazardMovementDamageResolvedRouteSurface,
    )),
    recordSurface(
      AreaHazardCleanedRouteSurface,
      qRoute.concat(hazardCleanupRoute),
      qFacts.concat(hazardCleanupFacts),
    ),
  }

  action doCleanupConcentrationBackedAreaHazardAfterConcentrationBreak = all {
    qSurface == ConcentrationBackedAreaHazardActiveRouteSurface,
    recordSurface(
      ConcentrationBackedAreaHazardCleanedRouteSurface,
      qRoute.concat(concentrationBreakHazardCleanupRoute),
      qFacts.concat(concentrationBreakHazardCleanupFacts),
    ),
  }

  action doRecordTableOwnedSpatialWitnesses = all {
    qSurface == FreshSpatialEffectRouteSurface,
    recordSurface(
      TableSpatialWitnessRouteSurface,
      qRoute.concat(tableSpatialWitnessRoute),
      tableSpatialWitnessFacts,
    ),
  }

  action doStutterAfterTerminalSurface = all {
    qSurface.in(Set(
      MovableMultiEmitterLightMovedRouteSurface,
      OutlineSightEffectProjectedRouteSurface,
      AreaObscurementDurationCleanedRouteSurface,
      AreaObscurementDispersedRouteSurface,
      AreaHazardCleanedRouteSurface,
      ConcentrationBackedAreaHazardCleanedRouteSurface,
      TableSpatialWitnessRouteSurface,
    )),
    recordSurface(qSurface, qRoute, qFacts),
  }

  action step = any {
    doAdmitMovableMultiEmitterLight,
    doMoveMovableMultiEmitterLight,
    doAdmitOutlineSightEffect,
    doProjectOutlineSightAttackAdvantage,
    doAdmitAreaObscurement,
    doCleanupAreaObscurementByDuration,
    doDisperseAreaObscurementByStrongWind,
    doAdmitAreaHazard,
    doResolveAreaHazardSavingThrowTrigger,
    doResolveAreaHazardDifficultTerrainMovement,
    doResolveAreaHazardMovementDamageTrigger,
    doCleanupAreaHazard,
    doAdmitConcentrationBackedAreaHazard,
    doCleanupConcentrationBackedAreaHazardAfterConcentrationBreak,
    doRecordTableOwnedSpatialWitnesses,
    doStutterAfterTerminalSurface,
  }
}
