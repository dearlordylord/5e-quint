// -*- mode: Bluespec; -*-

module battleRuntimeLevel1SpatialWitnessSelectedIdentityMbt {
  var qLightEmitterCount: int
  var qDimLightEmitterCount: int
  var qRetainedLightIdentityCount: int
  var qFaerieFireOutlinedCreatureCount: int
  var qFaerieFireOutlinedObjectCount: int
  var qFaerieFireCreatureAttackRollMode: str
  var qFaerieFireInvisibleCreatureAttackRollMode: str
  var qFaerieFireObjectAttackRollMode: str
  var qFaerieFireTargetInvisible: bool
  var qFaerieFireObjectInvisibleBenefitDenied: bool
  var qFeatherFallTriggerOffered: bool
  var qFeatherFallUnwitnessedTriggerRejected: bool
  var qFeatherFallReactionSpent: bool
  var qFeatherFallSlotExpended: bool
  var qFeatherFallMitigatedTargetCountBeforeLanding: int
  var qFeatherFallLandedTargetDescentRateCapFeetPerRound: int
  var qFeatherFallLandingFallDamagePrevented: bool
  var qFeatherFallLandingFallingPronePrevented: bool
  var qFeatherFallLandedTargetMitigationCleared: bool
  var qFeatherFallOtherTargetStillMitigated: bool
  var qProjectedIllumination: str
  var qOrdinarySightObscurement: str
  var qDarkvisionSightObscurement: str
  var qMismatchedWitnessIllumination: str
  var qObscurementZoneCount: int
  var qCasterConcentrating: bool
  var qMagicActionAvailable: bool
  var qBonusActionAvailable: bool
  var qLastResult: str

  action recordProjection(
    lightEmitterCount: int,
    dimLightEmitterCount: int,
    retainedLightIdentityCount: int,
    faerieFireOutlinedCreatureCount: int,
    faerieFireOutlinedObjectCount: int,
    faerieFireCreatureAttackRollMode: str,
    faerieFireInvisibleCreatureAttackRollMode: str,
    faerieFireObjectAttackRollMode: str,
    faerieFireTargetInvisible: bool,
    faerieFireObjectInvisibleBenefitDenied: bool,
    featherFallTriggerOffered: bool,
    featherFallUnwitnessedTriggerRejected: bool,
    featherFallReactionSpent: bool,
    featherFallSlotExpended: bool,
    featherFallMitigatedTargetCountBeforeLanding: int,
    featherFallLandedTargetDescentRateCapFeetPerRound: int,
    featherFallLandingFallDamagePrevented: bool,
    featherFallLandingFallingPronePrevented: bool,
    featherFallLandedTargetMitigationCleared: bool,
    featherFallOtherTargetStillMitigated: bool,
    projectedIllumination: str,
    ordinarySightObscurement: str,
    darkvisionSightObscurement: str,
    mismatchedWitnessIllumination: str,
    obscurementZoneCount: int,
    casterConcentrating: bool,
    magicActionAvailable: bool,
    bonusActionAvailable: bool,
    lastResult: str,
  ): bool = all {
    qLightEmitterCount' = lightEmitterCount,
    qDimLightEmitterCount' = dimLightEmitterCount,
    qRetainedLightIdentityCount' = retainedLightIdentityCount,
    qFaerieFireOutlinedCreatureCount' = faerieFireOutlinedCreatureCount,
    qFaerieFireOutlinedObjectCount' = faerieFireOutlinedObjectCount,
    qFaerieFireCreatureAttackRollMode' = faerieFireCreatureAttackRollMode,
    qFaerieFireInvisibleCreatureAttackRollMode' = faerieFireInvisibleCreatureAttackRollMode,
    qFaerieFireObjectAttackRollMode' = faerieFireObjectAttackRollMode,
    qFaerieFireTargetInvisible' = faerieFireTargetInvisible,
    qFaerieFireObjectInvisibleBenefitDenied' = faerieFireObjectInvisibleBenefitDenied,
    qFeatherFallTriggerOffered' = featherFallTriggerOffered,
    qFeatherFallUnwitnessedTriggerRejected' = featherFallUnwitnessedTriggerRejected,
    qFeatherFallReactionSpent' = featherFallReactionSpent,
    qFeatherFallSlotExpended' = featherFallSlotExpended,
    qFeatherFallMitigatedTargetCountBeforeLanding' = featherFallMitigatedTargetCountBeforeLanding,
    qFeatherFallLandedTargetDescentRateCapFeetPerRound' = featherFallLandedTargetDescentRateCapFeetPerRound,
    qFeatherFallLandingFallDamagePrevented' = featherFallLandingFallDamagePrevented,
    qFeatherFallLandingFallingPronePrevented' = featherFallLandingFallingPronePrevented,
    qFeatherFallLandedTargetMitigationCleared' = featherFallLandedTargetMitigationCleared,
    qFeatherFallOtherTargetStillMitigated' = featherFallOtherTargetStillMitigated,
    qProjectedIllumination' = projectedIllumination,
    qOrdinarySightObscurement' = ordinarySightObscurement,
    qDarkvisionSightObscurement' = darkvisionSightObscurement,
    qMismatchedWitnessIllumination' = mismatchedWitnessIllumination,
    qObscurementZoneCount' = obscurementZoneCount,
    qCasterConcentrating' = casterConcentrating,
    qMagicActionAvailable' = magicActionAvailable,
    qBonusActionAvailable' = bonusActionAvailable,
    qLastResult' = lastResult,
  }

  action init =
    recordProjection(
      0, 0, 0,
      0, 0, "normal", "normal", "normal", false, false,
      false, false, false, false, 0, 0, false, false, false, false,
      "darkness", "heavilyObscured", "lightlyObscured", "darkness",
      0, false, true, true,
      "init",
    )

  action doDancingLightsMovableDimLight = all {
    qLastResult == "init",
    recordProjection(
      2, 2, 2,
      0, 0, "normal", "normal", "normal", false, false,
      false, false, false, false, 0, 0, false, false, false, false,
      "dimLight", "lightlyObscured", "unobscured", "darkness",
      0, true, false, false,
      "dancingLightsMovableDimLight",
    ),
  }

  action doFaerieFireOutlineAdvantageInvisibleDimLight = all {
    qLastResult == "init",
    recordProjection(
      2, 2, 0,
      1, 1, "advantage", "advantage", "advantage", true, true,
      false, false, false, false, 0, 0, false, false, false, false,
      "dimLight", "lightlyObscured", "unobscured", "darkness",
      0, true, true, true,
      "faerieFireOutlineAdvantageInvisibleDimLight",
    ),
  }

  action doFeatherFallReactionMitigationLanding = all {
    qLastResult == "init",
    recordProjection(
      0, 0, 0,
      0, 0, "normal", "normal", "normal", false, false,
      true, true, true, true, 2, 60, true, true, true, true,
      "darkness", "heavilyObscured", "lightlyObscured", "darkness",
      0, false, true, true,
      "featherFallReactionMitigationLanding",
    ),
  }

  action step = any {
    doDancingLightsMovableDimLight,
    doFaerieFireOutlineAdvantageInvisibleDimLight,
    doFeatherFallReactionMitigationLanding,
  }
}
