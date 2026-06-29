// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Spells/Gaining-and-Casting.md#Areas of Effect,
//   #Targets, #Saving Throws, and #Reaction and Bonus Action Triggers define
//   the generic spell invocation frontiers represented here.
// - .references/srd-5.2.1/Playing-the-Game.md#Movement and Position,
//   #Vision and Light, #Difficult Terrain, and #Reactions define movement,
//   illumination, obscurement, terrain cost, and reaction timing.
// - .references/srd-5.2.1/Rules-Glossary.md#Area of Effect, #Cover,
//   #Dim Light, #Heavily Obscured, #Invisible [Condition], #Long Jump, and
//   #Reaction define table geometry, sight, movement, and reaction vocabulary.
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Dancing Lights,
//   Descriptions-E-L.md#Faerie Fire / #Feather Fall / #Fog Cloud / #Grease /
//   #Jump / #Light, Descriptions-M-P.md#Produce Flame, and
//   Descriptions-S-Z.md#Thunderwave provide SRD examples of these generic
//   route shapes.
// - UBIQUITOUS_LANGUAGE.md: Spell Invocation, Spell Effect, Area of Effect,
//   Movement, Reaction, Saving Throw, Illumination, Obscurement, Attack Roll,
//   Boundary Crossing, and Table Decision.
module battleRuntimeLevel1SpatialWitnessSelectedIdentityRouteMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"

  type Level1SpatialCompositionRouteSurface =
    | FreshSpatialCompositionRouteSurface
    | MovableMultiEmitterLightRouteSurface
    | OutlineSightAdvantageRouteSurface
    | FallMitigationRouteSurface
    | AreaObscurementCleanupRouteSurface
    | AreaHazardSaveRouteSurface
    | AreaHazardMovementRouteSurface
    | MovementReplacementRouteSurface
    | ObjectLightEmitterRouteSurface
    | HeldLightEmitterRouteSurface
    | SavePushPresentationRouteSurface

  var qSurface: Level1SpatialCompositionRouteSurface
  var qRoute: List[ReducerRouteEvent]

  pure val noHoles: Set[BattleHoleFamilyKind] = Set()
  pure val targetChoiceHoles: Set[BattleHoleFamilyKind] =
    Set(TargetChoiceHoleKind)
  pure val savingThrowOutcomeHoles: Set[BattleHoleFamilyKind] =
    Set(SavingThrowOutcomeHoleKind)
  pure val movementHoles: Set[BattleHoleFamilyKind] =
    Set(MovementHoleKind)
  pure val interruptDecisionHoles: Set[BattleHoleFamilyKind] =
    Set(InterruptDecisionHoleKind)
  pure val outlineAdmissionHoles: Set[BattleHoleFamilyKind] =
    Set(TargetChoiceHoleKind, SavingThrowOutcomeHoleKind)
  pure val savingThrowMovementHoles: Set[BattleHoleFamilyKind] =
    Set(SavingThrowOutcomeHoleKind, MovementHoleKind)

  pure def startRoute: ReducerRouteEvent =
    routeStartBattle(BattleActionEconomyOwner)

  pure def discoverRoute(
    subject: ReducerRouteSubjectFamily,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeDiscoverBattleActs(subject, holes, owner)

  pure def resolveRoute(
    subject: ReducerRouteSubjectFamily,
    fill: BattleFillKind,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubject(subject, fill, holes, owner)

  pure def resolveRouteWithoutFill(
    subject: ReducerRouteSubjectFamily,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubjectWithoutFill(subject, holes, owner)

  pure def resolveInterruptRoute(
    subject: ReducerRouteSubjectFamily,
    fill: BattleFillKind,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleInterrupt(subject, fill, holes, owner)

  pure def spatialDiscover(
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    discoverRoute(SpatialEffectRouteSubject, holes, owner)

  pure def spatialResolve(
    fill: BattleFillKind,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    resolveRoute(SpatialEffectRouteSubject, fill, holes, owner)

  pure def spatialResolveWithoutFill(
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    resolveRouteWithoutFill(SpatialEffectRouteSubject, noHoles, owner)

  pure def objectLightDiscover(
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    discoverRoute(ObjectLightRiderRouteSubject, holes, owner)

  pure def objectLightResolve(
    fill: BattleFillKind,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    resolveRoute(ObjectLightRiderRouteSubject, fill, holes, owner)

  pure def objectLightResolveWithoutFill(
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    resolveRouteWithoutFill(ObjectLightRiderRouteSubject, noHoles, owner)

  pure def movementPresentationDiscover(
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    discoverRoute(MovementPresentationRouteSubject, holes, owner)

  pure def movementPresentationResolve(
    fill: BattleFillKind,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    resolveRoute(MovementPresentationRouteSubject, fill, holes, owner)

  pure def movementPresentationResolveWithoutFill(
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    resolveRouteWithoutFill(MovementPresentationRouteSubject, noHoles, owner)

  pure def movableMultiEmitterLightRoute: List[ReducerRouteEvent] =
    List(
      startRoute,
      spatialDiscover(noHoles, BattleSpellSlotAndActionEconomyOwner),
      spatialResolveWithoutFill(BattleActiveEffectOwner),
      spatialResolveWithoutFill(BattleConcentrationOwner),
      spatialResolveWithoutFill(BattleLightProjectionOwner),
      spatialDiscover(targetChoiceHoles, BattleSpellSlotAndActionEconomyOwner),
      spatialResolve(TargetChoiceFillKind, noHoles, BattleAreaShapeOwner),
      spatialResolveWithoutFill(BattleLightProjectionOwner),
    )

  pure def outlineSightAdvantageRoute: List[ReducerRouteEvent] =
    List(
      startRoute,
      spatialDiscover(
        outlineAdmissionHoles,
        BattleSpellSlotAndActionEconomyOwner,
      ),
      spatialResolve(
        TargetChoiceFillKind,
        savingThrowOutcomeHoles,
        BattleAreaShapeOwner,
      ),
      spatialResolve(
        SavingThrowOutcomeFillKind,
        noHoles,
        BattleSavingThrowOutcomeOwner,
      ),
      spatialResolveWithoutFill(BattleActiveEffectOwner),
      spatialResolveWithoutFill(BattleConcentrationOwner),
      spatialResolveWithoutFill(BattleLightProjectionOwner),
      spatialResolveWithoutFill(BattleSightProjectionOwner),
      spatialResolveWithoutFill(BattleAttackRollModeOwner),
    )

  pure def fallMitigationRoute: List[ReducerRouteEvent] =
    List(
      startRoute,
      discoverRoute(
        ReactionFallMitigationRouteSubject,
        interruptDecisionHoles,
        BattleInterruptStackOwner,
      ),
      resolveInterruptRoute(
        ReactionFallMitigationRouteSubject,
        InterruptDecisionFillKind,
        noHoles,
        BattleSpellSlotAndActionEconomyOwner,
      ),
      resolveRouteWithoutFill(
        ReactionFallMitigationRouteSubject,
        noHoles,
        BattleActiveEffectOwner,
      ),
      resolveRouteWithoutFill(
        ReactionFallMitigationRouteSubject,
        noHoles,
        BattleMovementResourceOwner,
      ),
      resolveRouteWithoutFill(
        ReactionFallMitigationRouteSubject,
        noHoles,
        BattleHitPointOwner,
      ),
    )

  pure def areaObscurementCleanupRoute: List[ReducerRouteEvent] =
    List(
      startRoute,
      spatialDiscover(targetChoiceHoles, BattleSpellSlotAndActionEconomyOwner),
      spatialResolve(TargetChoiceFillKind, noHoles, BattleAreaShapeOwner),
      spatialResolveWithoutFill(BattleActiveEffectOwner),
      spatialResolveWithoutFill(BattleConcentrationOwner),
      spatialResolveWithoutFill(BattleObscurementProjectionOwner),
      spatialResolveWithoutFill(BattleSightProjectionOwner),
      spatialResolveWithoutFill(BattleObscurementProjectionOwner),
      spatialResolveWithoutFill(BattleActiveEffectOwner),
      spatialResolveWithoutFill(BattleConcentrationOwner),
    )

  pure def areaHazardSaveRoute: List[ReducerRouteEvent] =
    List(
      startRoute,
      spatialDiscover(targetChoiceHoles, BattleSpellSlotAndActionEconomyOwner),
      spatialResolve(TargetChoiceFillKind, noHoles, BattleAreaShapeOwner),
      spatialResolveWithoutFill(BattleActiveEffectOwner),
      spatialResolveWithoutFill(BattleAreaHazardOwner),
      spatialResolveWithoutFill(BattleCreatureSpaceMovementOwner),
      spatialDiscover(savingThrowOutcomeHoles, BattleAreaHazardOwner),
      spatialResolve(
        SavingThrowOutcomeFillKind,
        noHoles,
        BattleSavingThrowOutcomeOwner,
      ),
      spatialResolveWithoutFill(BattleConditionLifecycleOwner),
    )

  pure def areaHazardMovementRoute: List[ReducerRouteEvent] =
    List(
      startRoute,
      spatialDiscover(targetChoiceHoles, BattleSpellSlotAndActionEconomyOwner),
      spatialResolve(TargetChoiceFillKind, noHoles, BattleAreaShapeOwner),
      spatialResolveWithoutFill(BattleActiveEffectOwner),
      spatialResolveWithoutFill(BattleAreaHazardOwner),
      spatialResolveWithoutFill(BattleCreatureSpaceMovementOwner),
      spatialDiscover(movementHoles, BattleAreaHazardOwner),
      spatialResolve(MovementFillKind, noHoles, BattleMovementResourceOwner),
      spatialResolveWithoutFill(BattleTurnBoundaryOwner),
      spatialResolveWithoutFill(BattleAreaHazardOwner),
      spatialResolveWithoutFill(BattleActiveEffectOwner),
    )

  pure def movementReplacementRoute: List[ReducerRouteEvent] =
    List(
      startRoute,
      movementPresentationDiscover(movementHoles, BattleMovementResourceOwner),
      movementPresentationResolve(
        MovementFillKind,
        noHoles,
        BattleMovementResourceOwner,
      ),
      movementPresentationResolveWithoutFill(BattleTablePresentationOwner),
      movementPresentationResolveWithoutFill(BattleConditionLifecycleOwner),
    )

  pure def objectLightEmitterRoute: List[ReducerRouteEvent] =
    List(
      startRoute,
      objectLightDiscover(
        targetChoiceHoles,
        BattleSpellSlotAndActionEconomyOwner,
      ),
      objectLightResolve(
        TargetChoiceFillKind,
        noHoles,
        BattleObjectTargetBoundaryOwner,
      ),
      objectLightResolveWithoutFill(BattleActiveEffectOwner),
      objectLightResolveWithoutFill(BattleLightProjectionOwner),
      objectLightResolveWithoutFill(BattleActiveEffectOwner),
    )

  pure def heldLightEmitterRoute: List[ReducerRouteEvent] =
    List(
      startRoute,
      objectLightResolveWithoutFill(BattleActiveEffectOwner),
      objectLightResolveWithoutFill(BattleLightProjectionOwner),
      objectLightResolveWithoutFill(BattleActiveEffectOwner),
    )

  pure def savePushPresentationRoute: List[ReducerRouteEvent] =
    List(
      startRoute,
      movementPresentationDiscover(
        savingThrowMovementHoles,
        BattleSavingThrowOutcomeOwner,
      ),
      movementPresentationResolve(
        SavingThrowOutcomeFillKind,
        movementHoles,
        BattleSavingThrowOutcomeOwner,
      ),
      movementPresentationResolve(
        MovementFillKind,
        noHoles,
        BattleMovementResourceOwner,
      ),
      movementPresentationResolveWithoutFill(BattleTablePresentationOwner),
      movementPresentationDiscover(noHoles, BattleObjectTargetBoundaryOwner),
      movementPresentationResolveWithoutFill(BattleObjectTargetBoundaryOwner),
      movementPresentationResolveWithoutFill(BattleTablePresentationOwner),
    )

  action recordRoute(
    surface: Level1SpatialCompositionRouteSurface,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qSurface' = surface,
    qRoute' = route,
  }

  action init = recordRoute(
    FreshSpatialCompositionRouteSurface,
    List(startRoute),
  )

  action doRouteMovableMultiEmitterLight =
    all {
      qSurface == FreshSpatialCompositionRouteSurface,
      recordRoute(
        MovableMultiEmitterLightRouteSurface,
        movableMultiEmitterLightRoute,
      ),
    }

  action doRouteOutlineSightAdvantage =
    all {
      qSurface == FreshSpatialCompositionRouteSurface,
      recordRoute(
        OutlineSightAdvantageRouteSurface,
        outlineSightAdvantageRoute,
      ),
    }

  action doRouteFallMitigation =
    all {
      qSurface == FreshSpatialCompositionRouteSurface,
      recordRoute(FallMitigationRouteSurface, fallMitigationRoute),
    }

  action doRouteAreaObscurementCleanup =
    all {
      qSurface == FreshSpatialCompositionRouteSurface,
      recordRoute(
        AreaObscurementCleanupRouteSurface,
        areaObscurementCleanupRoute,
      ),
    }

  action doRouteAreaHazardSave =
    all {
      qSurface == FreshSpatialCompositionRouteSurface,
      recordRoute(AreaHazardSaveRouteSurface, areaHazardSaveRoute),
    }

  action doRouteAreaHazardMovement =
    all {
      qSurface == FreshSpatialCompositionRouteSurface,
      recordRoute(AreaHazardMovementRouteSurface, areaHazardMovementRoute),
    }

  action doRouteMovementReplacement =
    all {
      qSurface == FreshSpatialCompositionRouteSurface,
      recordRoute(MovementReplacementRouteSurface, movementReplacementRoute),
    }

  action doRouteObjectLightEmitter =
    all {
      qSurface == FreshSpatialCompositionRouteSurface,
      recordRoute(ObjectLightEmitterRouteSurface, objectLightEmitterRoute),
    }

  action doRouteHeldLightEmitter =
    all {
      qSurface == FreshSpatialCompositionRouteSurface,
      recordRoute(HeldLightEmitterRouteSurface, heldLightEmitterRoute),
    }

  action doRouteSavePushPresentation =
    all {
      qSurface == FreshSpatialCompositionRouteSurface,
      recordRoute(
        SavePushPresentationRouteSurface,
        savePushPresentationRoute,
      ),
    }

  action doStutterAfterTerminalSurface =
    all {
      qSurface != FreshSpatialCompositionRouteSurface,
      recordRoute(qSurface, qRoute),
    }

  action step = any {
    doRouteMovableMultiEmitterLight,
    doRouteOutlineSightAdvantage,
    doRouteFallMitigation,
    doRouteAreaObscurementCleanup,
    doRouteAreaHazardSave,
    doRouteAreaHazardMovement,
    doRouteMovementReplacement,
    doRouteObjectLightEmitter,
    doRouteHeldLightEmitter,
    doRouteSavePushPresentation,
    doStutterAfterTerminalSurface,
  }
}
