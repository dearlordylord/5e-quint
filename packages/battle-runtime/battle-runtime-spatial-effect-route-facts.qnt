// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// Typed source facts for generic spatial-effect routes. These facts separate
// battle-owned effect lifecycle facts from table-owned geometry, presentation,
// sight, object, and hazard witnesses. They do not carry authored spell
// identity.
module battleRuntimeSpatialEffectRouteFacts {
  type SpatialEffectBattleEffectFact =
    | MovableMultiEmitterEffectAdmitted
    | OutlineEffectAdmitted
    | AreaObscurementEffectAdmitted
    | AreaHazardEffectAdmitted
    | ConcentrationBackedEffect

  type SpatialEffectLightFact =
    | MultiEmitterDimLightProjection
    | EmitterPositionMoved
    | BrightLightProjection
    | DimLightProjection

  type SpatialEffectGeometryFact =
    | AreaShapeWitness
    | AreaMembershipWitness
    | MovementPathWitness
    | TotalCoverBlockerWitness
    | StrongWindWitness

  type SpatialEffectPresentationFact =
    | EmitterAppearancePresentation
    | ColorChoicePresentation
    | VisibleOutlinePresentation

  type SpatialEffectObjectFact =
    | OutlinedObjectWitness
    | ObjectSightTargetWitness
    | ObjectInvisibleBenefitDeniedProjection

  type SpatialEffectSightFact =
    | AttackerCanSeeTargetWitness
    | InvisibleBenefitDeniedProjection
    | AttackRollAdvantageProjection
    | HeavilyObscuredProjection
    | LightlyObscuredProjection

  type SpatialEffectHazardFact =
    | DifficultTerrainProjection
    | AreaCreatedSavingThrowTrigger
    | AreaMovedSavingThrowTrigger
    | EntrySavingThrowTrigger
    | StartTurnSavingThrowTrigger
    | EndTurnSavingThrowTrigger
    | SaveTriggeredDamageTrigger
    | MovementDamageTrigger
    | FailedSaveRestraintTrigger
    | PerTurnTriggerLimit
    | AreaRemovedCleanup

  type SpatialEffectCleanupFact =
    | DurationCleanup
    | ConcentrationBreakCleanup
    | DispersalCleanup
    | RemovalCleanup
    | ReplacementCleanup

  type SpatialEffectCleanupOwnerFact =
    | BattleActiveEffectCleanupOwner
    | BattleConcentrationCleanupOwner
    | BattleTurnBoundaryCleanupOwner
    | BattleObscurementCleanupOwner
    | BattleAreaHazardCleanupOwner

  type SpatialEffectRouteFact =
    | RouteSpatialEffectBattleEffect({
        effect: SpatialEffectBattleEffectFact,
      })
    | RouteSpatialEffectLight({ light: SpatialEffectLightFact })
    | RouteSpatialEffectGeometry({ geometry: SpatialEffectGeometryFact })
    | RouteSpatialEffectPresentation({
        presentation: SpatialEffectPresentationFact,
      })
    | RouteSpatialEffectObject({ object: SpatialEffectObjectFact })
    | RouteSpatialEffectSight({ sight: SpatialEffectSightFact })
    | RouteSpatialEffectHazard({ hazard: SpatialEffectHazardFact })
    | RouteSpatialEffectCleanedUpBy({
        cleanup: SpatialEffectCleanupFact,
        owner: SpatialEffectCleanupOwnerFact,
      })
}
