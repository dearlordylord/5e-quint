// -*- mode: Bluespec; -*-

module battleRuntimeLevel1SpatialWitnessSelectedIdentityMbt {
  val qFogCloudLevelOneRadiusFeet = 20
  val qFogCloudOneHourDurationTicks = 600
  val qGreaseOneMinuteDurationTicks = 10
  val qGreaseDifficultTerrainTotalDistanceFeet = 10
  val qGreaseDifficultTerrainDistanceFeet = 5
  val qGreaseDifficultTerrainExpectedMovementCostFeet =
    qGreaseDifficultTerrainTotalDistanceFeet + qGreaseDifficultTerrainDistanceFeet
  val qJumpMovementCostFeet = 10

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
  var qFogCloudAreaIdentityRetained: bool
  var qFogCloudHeavilyObscuredZoneCount: int
  var qFogCloudRadiusFeet: int
  var qFogCloudDurationTicks: int
  var qFogCloudStrongWindCommandOffered: bool
  var qFogCloudCleanupClearedEffect: bool
  var qFogCloudCleanupClearedZone: bool
  var qFogCloudCleanupClearedConcentration: bool
  var qFogCloudSlotExpended: bool
  var qGreaseAreaIdentityRetained: bool
  var qGreaseActiveHazardCount: int
  var qGreaseDurationTicks: int
  var qGreaseAffectedTargetOutcomeCount: int
  var qGreaseFailedTargetProne: bool
  var qGreaseSucceededTargetProne: bool
  var qGreaseMismatchedAffectedTargetRejected: bool
  var qGreaseDifficultTerrainMovementCostFeet: int
  var qGreaseMovementSpentFeet: int
  var qGreaseMismatchedMovementAreaRejected: bool
  var qGreaseEntrySaveOffered: bool
  var qGreaseEntryFailedTargetProne: bool
  var qGreaseEntryMismatchedTargetRejected: bool
  var qGreaseEndTurnSaveOffered: bool
  var qGreaseEndTurnFailedTargetProne: bool
  var qGreaseEndTurnAdvancedToCaster: bool
  var qGreaseEndTurnMismatchedTargetRejected: bool
  var qGreaseSlotExpended: bool
  var qJumpTargetEffectInstalled: bool
  var qJumpMovementSpentFeet: int
  var qJumpUsedMarkerSet: bool
  var qJumpSameTurnUnavailable: bool
  var qJumpNextTargetTurnAvailable: bool
  var qJumpMissingLandingFactRejected: bool
  var qJumpFailedLandingProne: bool
  var qJumpSlotExpended: bool
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
    fogCloudAreaIdentityRetained: bool,
    fogCloudHeavilyObscuredZoneCount: int,
    fogCloudRadiusFeet: int,
    fogCloudDurationTicks: int,
    fogCloudStrongWindCommandOffered: bool,
    fogCloudCleanupClearedEffect: bool,
    fogCloudCleanupClearedZone: bool,
    fogCloudCleanupClearedConcentration: bool,
    fogCloudSlotExpended: bool,
    greaseAreaIdentityRetained: bool,
    greaseActiveHazardCount: int,
    greaseDurationTicks: int,
    greaseAffectedTargetOutcomeCount: int,
    greaseFailedTargetProne: bool,
    greaseSucceededTargetProne: bool,
    greaseMismatchedAffectedTargetRejected: bool,
    greaseDifficultTerrainMovementCostFeet: int,
    greaseMovementSpentFeet: int,
    greaseMismatchedMovementAreaRejected: bool,
    greaseEntrySaveOffered: bool,
    greaseEntryFailedTargetProne: bool,
    greaseEntryMismatchedTargetRejected: bool,
    greaseEndTurnSaveOffered: bool,
    greaseEndTurnFailedTargetProne: bool,
    greaseEndTurnAdvancedToCaster: bool,
    greaseEndTurnMismatchedTargetRejected: bool,
    greaseSlotExpended: bool,
    jumpTargetEffectInstalled: bool,
    jumpMovementSpentFeet: int,
    jumpUsedMarkerSet: bool,
    jumpSameTurnUnavailable: bool,
    jumpNextTargetTurnAvailable: bool,
    jumpMissingLandingFactRejected: bool,
    jumpFailedLandingProne: bool,
    jumpSlotExpended: bool,
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
    qFogCloudAreaIdentityRetained' = fogCloudAreaIdentityRetained,
    qFogCloudHeavilyObscuredZoneCount' = fogCloudHeavilyObscuredZoneCount,
    qFogCloudRadiusFeet' = fogCloudRadiusFeet,
    qFogCloudDurationTicks' = fogCloudDurationTicks,
    qFogCloudStrongWindCommandOffered' = fogCloudStrongWindCommandOffered,
    qFogCloudCleanupClearedEffect' = fogCloudCleanupClearedEffect,
    qFogCloudCleanupClearedZone' = fogCloudCleanupClearedZone,
    qFogCloudCleanupClearedConcentration' = fogCloudCleanupClearedConcentration,
    qFogCloudSlotExpended' = fogCloudSlotExpended,
    qGreaseAreaIdentityRetained' = greaseAreaIdentityRetained,
    qGreaseActiveHazardCount' = greaseActiveHazardCount,
    qGreaseDurationTicks' = greaseDurationTicks,
    qGreaseAffectedTargetOutcomeCount' = greaseAffectedTargetOutcomeCount,
    qGreaseFailedTargetProne' = greaseFailedTargetProne,
    qGreaseSucceededTargetProne' = greaseSucceededTargetProne,
    qGreaseMismatchedAffectedTargetRejected' = greaseMismatchedAffectedTargetRejected,
    qGreaseDifficultTerrainMovementCostFeet' = greaseDifficultTerrainMovementCostFeet,
    qGreaseMovementSpentFeet' = greaseMovementSpentFeet,
    qGreaseMismatchedMovementAreaRejected' = greaseMismatchedMovementAreaRejected,
    qGreaseEntrySaveOffered' = greaseEntrySaveOffered,
    qGreaseEntryFailedTargetProne' = greaseEntryFailedTargetProne,
    qGreaseEntryMismatchedTargetRejected' = greaseEntryMismatchedTargetRejected,
    qGreaseEndTurnSaveOffered' = greaseEndTurnSaveOffered,
    qGreaseEndTurnFailedTargetProne' = greaseEndTurnFailedTargetProne,
    qGreaseEndTurnAdvancedToCaster' = greaseEndTurnAdvancedToCaster,
    qGreaseEndTurnMismatchedTargetRejected' = greaseEndTurnMismatchedTargetRejected,
    qGreaseSlotExpended' = greaseSlotExpended,
    qJumpTargetEffectInstalled' = jumpTargetEffectInstalled,
    qJumpMovementSpentFeet' = jumpMovementSpentFeet,
    qJumpUsedMarkerSet' = jumpUsedMarkerSet,
    qJumpSameTurnUnavailable' = jumpSameTurnUnavailable,
    qJumpNextTargetTurnAvailable' = jumpNextTargetTurnAvailable,
    qJumpMissingLandingFactRejected' = jumpMissingLandingFactRejected,
    qJumpFailedLandingProne' = jumpFailedLandingProne,
    qJumpSlotExpended' = jumpSlotExpended,
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
      false, 0, 0, 0, false, false, false, false, false,
      false, 0, 0, 0, false, false, false,
      0, 0, false, false, false, false, false, false, false, false, false,
      false, 0, false, false, false, false, false, false,
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
      false, 0, 0, 0, false, false, false, false, false,
      false, 0, 0, 0, false, false, false,
      0, 0, false, false, false, false, false, false, false, false, false,
      false, 0, false, false, false, false, false, false,
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
      false, 0, 0, 0, false, false, false, false, false,
      false, 0, 0, 0, false, false, false,
      0, 0, false, false, false, false, false, false, false, false, false,
      false, 0, false, false, false, false, false, false,
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
      false, 0, 0, 0, false, false, false, false, false,
      false, 0, 0, 0, false, false, false,
      0, 0, false, false, false, false, false, false, false, false, false,
      false, 0, false, false, false, false, false, false,
      "darkness", "heavilyObscured", "lightlyObscured", "darkness",
      0, false, true, true,
      "featherFallReactionMitigationLanding",
    ),
  }

  action doFogCloudAreaIdentityObscurementStrongWindCleanup = all {
    qLastResult == "init",
    recordProjection(
      0, 0, 0,
      0, 0, "normal", "normal", "normal", false, false,
      false, false, false, false, 0, 0, false, false, false, false,
      true, 1, qFogCloudLevelOneRadiusFeet, qFogCloudOneHourDurationTicks,
      true, true, true, true, true,
      false, 0, 0, 0, false, false, false,
      0, 0, false, false, false, false, false, false, false, false, false,
      false, 0, false, false, false, false, false, false,
      "darkness", "heavilyObscured", "lightlyObscured", "darkness",
      0, false, false, true,
      "fogCloudAreaIdentityObscurementStrongWindCleanup",
    ),
  }

  action doGreaseCastGroundHazardSavingThrows = all {
    qLastResult == "init",
    recordProjection(
      0, 0, 0,
      0, 0, "normal", "normal", "normal", false, false,
      false, false, false, false, 0, 0, false, false, false, false,
      false, 0, 0, 0, false, false, false, false, false,
      true, 1, qGreaseOneMinuteDurationTicks, 2, true, false, true,
      0, 0, false, false, false, false, false, false, false, false, true,
      false, 0, false, false, false, false, false, false,
      "darkness", "heavilyObscured", "lightlyObscured", "darkness",
      0, false, false, true,
      "greaseCastGroundHazardSavingThrows",
    ),
  }

  action doGreaseMovementAndTurnTriggers = all {
    qLastResult == "init",
    recordProjection(
      0, 0, 0,
      0, 0, "normal", "normal", "normal", false, false,
      false, false, false, false, 0, 0, false, false, false, false,
      false, 0, 0, 0, false, false, false, false, false,
      true, 1, qGreaseOneMinuteDurationTicks, 2, true, false, true,
      qGreaseDifficultTerrainExpectedMovementCostFeet,
      qGreaseDifficultTerrainExpectedMovementCostFeet,
      true, true, true, true, true, true, true, true, true,
      false, 0, false, false, false, false, false, false,
      "darkness", "heavilyObscured", "lightlyObscured", "darkness",
      0, false, true, true,
      "greaseMovementAndTurnTriggers",
    ),
  }

  action doJumpMovementReplacementLandingWitness = all {
    qLastResult == "init",
    recordProjection(
      0, 0, 0,
      0, 0, "normal", "normal", "normal", false, false,
      false, false, false, false, 0, 0, false, false, false, false,
      false, 0, 0, 0, false, false, false, false, false,
      false, 0, 0, 0, false, false, false,
      0, 0, false, false, false, false, false, false, false, false, false,
      true, qJumpMovementCostFeet, true, true, true, true, true, true,
      "darkness", "heavilyObscured", "lightlyObscured", "darkness",
      0, false, true, true,
      "jumpMovementReplacementLandingWitness",
    ),
  }

  action step = any {
    doDancingLightsMovableDimLight,
    doFaerieFireOutlineAdvantageInvisibleDimLight,
    doFeatherFallReactionMitigationLanding,
    doFogCloudAreaIdentityObscurementStrongWindCleanup,
    doGreaseCastGroundHazardSavingThrows,
    doGreaseMovementAndTurnTriggers,
    doJumpMovementReplacementLandingWitness,
  }
}
