// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// Typed source facts for generic object/light routes. These facts separate
// reducer-owned light emitter lifecycle facts from table-owned object and
// geometry witnesses. They do not carry authored spell identity.
module battleRuntimeObjectLightRiderRouteFacts {
  type ObjectLightEmitterSourceFact =
    | ObjectAttachedEmitterSource
    | HeldEmitterSource

  type ObjectLightEmitterAdmissionFact =
    | ObjectTargetAdmittedByTableWitness
    | ObjectTargetRejectedByTableWitness
    | EmitterEffectAdmitted

  type ObjectLightEmitterAttachmentFact =
    | AttachedToObject
    | HeldByCaster

  type ObjectLightProjectionFact =
    | BrightLightProjection
    | DimLightProjection

  type ObjectLightCleanupFact =
    | ReplacementCleanup
    | HurlCleanup
    | DurationCleanup

  type ObjectLightCleanupOwnerFact =
    | BattleActiveEffectCleanupOwner
    | BattleTurnBoundaryCleanupOwner

  type ObjectLightTableWitnessFact =
    | ObjectValidityAdmissionWitness
    | ObjectGeometryWitness
    | CoverGeometryWitness
    | OpaqueBlockerGeometryWitness
    | ColorPresentationWitness
    | ObjectDurabilityBoundaryWitness

  type ObjectLightRouteFact =
    | RouteObjectLightEmitterSource({
        source: ObjectLightEmitterSourceFact,
      })
    | RouteObjectLightAdmission({
        admission: ObjectLightEmitterAdmissionFact,
      })
    | RouteObjectLightAttachment({
        attachment: ObjectLightEmitterAttachmentFact,
      })
    | RouteObjectLightProjection({
        projection: ObjectLightProjectionFact,
      })
    | RouteObjectLightCleanedUpBy({
        cleanup: ObjectLightCleanupFact,
        owner: ObjectLightCleanupOwnerFact,
      })
    | RouteObjectLightTableWitness({
        witness: ObjectLightTableWitnessFact,
      })
}
