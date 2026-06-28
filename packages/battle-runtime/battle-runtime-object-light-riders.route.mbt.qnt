// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md#What Is an Object defines
//   objects as discrete, inanimate items and excludes buildings/vehicles.
// - .references/srd-5.2.1/Playing-the-Game.md#Light defines Bright Light and
//   Dim Light as illumination radii produced by sources of illumination.
// - .references/srd-5.2.1/Rules-Glossary.md#Breaking Objects defines object
//   AC, HP, immunity, and damage-threshold facts as GM/table facts.
// - .references/srd-5.2.1/Rules-Glossary.md#Area of Effect and #Cover define
//   Total Cover/obstruction geometry as table-owned projection input.
// - .references/srd-5.2.1/Equipment.md#Candle, #Lamp, #Lantern, and #Torch
//   provide SRD examples of held/object light sources with Bright/Dim Light.
// - UBIQUITOUS_LANGUAGE.md: Table Decision, Illumination, Obscurement,
//   Spell Effect, Spell Invocation, and Action Lifecycle.
module battleRuntimeObjectLightRidersRouteMbt {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"
  import battleRuntimeObjectLightRiderRouteFacts.* from "./battle-runtime-object-light-rider-route-facts"

  type ObjectLightRouteSurface =
    | FreshObjectLightRouteSurface
    | ObjectAttachedEmitterActiveRouteSurface
    | HeldEmitterActiveRouteSurface
    | ObjectAttachedEmitterProjectedRouteSurface
    | HeldEmitterProjectedRouteSurface
    | ObjectAttachedEmitterReplacedRouteSurface
    | HeldEmitterHurledRouteSurface
    | ObjectAttachedEmitterExpiredRouteSurface
    | ObjectRejectedRouteSurface
    | TableWitnessRouteSurface

  var qSurface: ObjectLightRouteSurface
  var qRoute: List[ReducerRouteEvent]
  var qFacts: List[ObjectLightRouteFact]

  pure val noHoles: Set[BattleHoleFamilyKind] = Set()
  pure val targetChoiceHoles: Set[BattleHoleFamilyKind] =
    Set(TargetChoiceHoleKind)

  pure def startRoute: ReducerRouteEvent =
    routeStartBattle(BattleActionEconomyOwner)

  pure def discoverRoute(
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeDiscoverBattleActs(ObjectLightRiderRouteSubject, holes, owner)

  pure def resolveRoute(
    fill: BattleFillKind,
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubject(
      ObjectLightRiderRouteSubject,
      fill,
      holes,
      owner,
    )

  pure def resolveRouteWithoutFill(
    holes: Set[BattleHoleFamilyKind],
    owner: ReducerRouteOwnerGroup,
  ): ReducerRouteEvent =
    routeResolveBattleSubjectWithoutFill(
      ObjectLightRiderRouteSubject,
      holes,
      owner,
    )

  pure def objectAdmissionRoute: List[ReducerRouteEvent] =
    List(
      discoverRoute(targetChoiceHoles, BattleSpellSlotAndActionEconomyOwner),
      resolveRoute(
        TargetChoiceFillKind,
        noHoles,
        BattleObjectTargetBoundaryOwner,
      ),
    )

  pure def emitterAdmissionRoute: List[ReducerRouteEvent] =
    List(resolveRouteWithoutFill(noHoles, BattleActiveEffectOwner))

  pure def lightProjectionRoute: List[ReducerRouteEvent] =
    List(resolveRouteWithoutFill(noHoles, BattleLightProjectionOwner))

  pure def replacementCleanupRoute: List[ReducerRouteEvent] =
    List(resolveRouteWithoutFill(noHoles, BattleActiveEffectOwner))

  pure def hurlCleanupRoute: List[ReducerRouteEvent] =
    List(resolveRouteWithoutFill(noHoles, BattleActiveEffectOwner))

  pure def durationCleanupRoute: List[ReducerRouteEvent] =
    List(
      resolveRouteWithoutFill(noHoles, BattleTurnBoundaryOwner),
      resolveRouteWithoutFill(noHoles, BattleActiveEffectOwner),
    )

  pure def tableGeometryWitnessRoute: List[ReducerRouteEvent] =
    List(resolveRouteWithoutFill(noHoles, BattleAreaShapeOwner))

  pure def objectAttachedAdmissionFacts: List[ObjectLightRouteFact] =
    List(
      RouteObjectLightEmitterSource({ source: ObjectAttachedEmitterSource }),
      RouteObjectLightAdmission({
        admission: ObjectTargetAdmittedByTableWitness,
      }),
      RouteObjectLightAdmission({ admission: EmitterEffectAdmitted }),
      RouteObjectLightAttachment({ attachment: AttachedToObject }),
      RouteObjectLightTableWitness({ witness: ObjectValidityAdmissionWitness }),
    )

  pure def objectRejectedFacts: List[ObjectLightRouteFact] =
    List(
      RouteObjectLightEmitterSource({ source: ObjectAttachedEmitterSource }),
      RouteObjectLightAdmission({
        admission: ObjectTargetRejectedByTableWitness,
      }),
      RouteObjectLightTableWitness({ witness: ObjectValidityAdmissionWitness }),
    )

  pure def heldAdmissionFacts: List[ObjectLightRouteFact] =
    List(
      RouteObjectLightEmitterSource({ source: HeldEmitterSource }),
      RouteObjectLightAdmission({ admission: EmitterEffectAdmitted }),
      RouteObjectLightAttachment({ attachment: HeldByCaster }),
    )

  pure def brightDimProjectionFacts: List[ObjectLightRouteFact] =
    List(
      RouteObjectLightProjection({ projection: BrightLightProjection }),
      RouteObjectLightProjection({ projection: DimLightProjection }),
    )

  pure def replacementCleanupFacts: List[ObjectLightRouteFact] =
    List(
      RouteObjectLightCleanedUpBy({
        cleanup: ReplacementCleanup,
        owner: BattleActiveEffectCleanupOwner,
      }),
    )

  pure def hurlCleanupFacts: List[ObjectLightRouteFact] =
    List(
      RouteObjectLightCleanedUpBy({
        cleanup: HurlCleanup,
        owner: BattleActiveEffectCleanupOwner,
      }),
    )

  pure def durationCleanupFacts: List[ObjectLightRouteFact] =
    List(
      RouteObjectLightCleanedUpBy({
        cleanup: DurationCleanup,
        owner: BattleTurnBoundaryCleanupOwner,
      }),
      RouteObjectLightCleanedUpBy({
        cleanup: DurationCleanup,
        owner: BattleActiveEffectCleanupOwner,
      }),
    )

  pure def tableGeometryWitnessFacts: List[ObjectLightRouteFact] =
    List(
      RouteObjectLightTableWitness({ witness: ObjectGeometryWitness }),
      RouteObjectLightTableWitness({ witness: CoverGeometryWitness }),
      RouteObjectLightTableWitness({ witness: OpaqueBlockerGeometryWitness }),
      RouteObjectLightTableWitness({ witness: ColorPresentationWitness }),
      RouteObjectLightTableWitness({
        witness: ObjectDurabilityBoundaryWitness,
      }),
    )

  action recordSurface(
    surface: ObjectLightRouteSurface,
    route: List[ReducerRouteEvent],
    facts: List[ObjectLightRouteFact],
  ): bool = all {
    qSurface' = surface,
    qRoute' = route,
    qFacts' = facts,
  }

  action init = recordSurface(
    FreshObjectLightRouteSurface,
    List(startRoute),
    List(),
  )

  action doAdmitObjectAttachedEmitter = all {
    qSurface == FreshObjectLightRouteSurface,
    recordSurface(
      ObjectAttachedEmitterActiveRouteSurface,
      qRoute.concat(objectAdmissionRoute).concat(emitterAdmissionRoute),
      objectAttachedAdmissionFacts,
    ),
  }

  action doRejectObjectAttachedEmitterWithoutObjectWitness = all {
    qSurface == FreshObjectLightRouteSurface,
    recordSurface(
      ObjectRejectedRouteSurface,
      qRoute.concat(objectAdmissionRoute),
      objectRejectedFacts,
    ),
  }

  action doAdmitHeldLightEmitter = all {
    qSurface == FreshObjectLightRouteSurface,
    recordSurface(
      HeldEmitterActiveRouteSurface,
      qRoute.concat(emitterAdmissionRoute),
      heldAdmissionFacts,
    ),
  }

  action doProjectObjectAttachedBrightDimLight = all {
    qSurface == ObjectAttachedEmitterActiveRouteSurface,
    recordSurface(
      ObjectAttachedEmitterProjectedRouteSurface,
      qRoute.concat(lightProjectionRoute),
      qFacts.concat(brightDimProjectionFacts),
    ),
  }

  action doProjectHeldBrightDimLight = all {
    qSurface == HeldEmitterActiveRouteSurface,
    recordSurface(
      HeldEmitterProjectedRouteSurface,
      qRoute.concat(lightProjectionRoute),
      qFacts.concat(brightDimProjectionFacts),
    ),
  }

  action doCleanupObjectAttachedEmitterOnReplacement = all {
    qSurface.in(Set(
      ObjectAttachedEmitterActiveRouteSurface,
      ObjectAttachedEmitterProjectedRouteSurface,
    )),
    recordSurface(
      ObjectAttachedEmitterReplacedRouteSurface,
      qRoute.concat(replacementCleanupRoute),
      qFacts.concat(replacementCleanupFacts),
    ),
  }

  action doCleanupHeldEmitterOnHurl = all {
    qSurface.in(Set(
      HeldEmitterActiveRouteSurface,
      HeldEmitterProjectedRouteSurface,
    )),
    recordSurface(
      HeldEmitterHurledRouteSurface,
      qRoute.concat(hurlCleanupRoute),
      qFacts.concat(hurlCleanupFacts),
    ),
  }

  action doCleanupObjectAttachedEmitterOnDuration = all {
    qSurface.in(Set(
      ObjectAttachedEmitterActiveRouteSurface,
      ObjectAttachedEmitterProjectedRouteSurface,
    )),
    recordSurface(
      ObjectAttachedEmitterExpiredRouteSurface,
      qRoute.concat(durationCleanupRoute),
      qFacts.concat(durationCleanupFacts),
    ),
  }

  action doRecordTableOwnedGeometryAndCoverWitnesses = all {
    qSurface == FreshObjectLightRouteSurface,
    recordSurface(
      TableWitnessRouteSurface,
      qRoute.concat(tableGeometryWitnessRoute),
      tableGeometryWitnessFacts,
    ),
  }

  action doStutterAfterTerminalSurface = all {
    qSurface.in(Set(
      ObjectAttachedEmitterReplacedRouteSurface,
      HeldEmitterHurledRouteSurface,
      ObjectAttachedEmitterExpiredRouteSurface,
      ObjectRejectedRouteSurface,
      TableWitnessRouteSurface,
    )),
    recordSurface(qSurface, qRoute, qFacts),
  }

  action step = any {
    doAdmitObjectAttachedEmitter,
    doRejectObjectAttachedEmitterWithoutObjectWitness,
    doAdmitHeldLightEmitter,
    doProjectObjectAttachedBrightDimLight,
    doProjectHeldBrightDimLight,
    doCleanupObjectAttachedEmitterOnReplacement,
    doCleanupHeldEmitterOnHurl,
    doCleanupObjectAttachedEmitterOnDuration,
    doRecordTableOwnedGeometryAndCoverWitnesses,
    doStutterAfterTerminalSurface,
  }
}
