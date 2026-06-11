// -*- mode: Bluespec; -*-

module battleRuntimeLevel1SpatialWitnessSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type Level1SpatialWitnessSelectedIdentityScenarioOutcome = | Init | DancingLightsMovableDimLight | FaerieFireOutlineAdvantageInvisibleDimLight | FeatherFallReactionMitigationLanding | FogCloudAreaIdentityObscurementStrongWindCleanup | GreaseCastGroundHazardSavingThrows | GreaseMovementAndTurnTriggers | JumpMovementReplacementLandingWitness | LightObjectEmitterProjectionReplacementCleanup | ProduceFlameHeldLightProjectionHurlCleanup | ThunderwaveSavePushObjectsBoom

  type Level1SpatialWitnessSelectedIdentityWitnessState = {
    qLightEmitterCount: int,
    qDimLightEmitterCount: int,
    qRetainedLightIdentityCount: int,
    qLightObjectAdmitted: bool,
    qLightInvalidObjectRejectionCount: int,
    qLightDurationTicks: int,
    qLightBrightProjectionIllumination: str,
    qLightOpaqueCoverIllumination: str,
    qLightRecastReplacedPriorEmitter: bool,
    qLightDurationCleanupClearedEmitter: bool,
    qFaerieFireOutlinedCreatureCount: int,
    qFaerieFireOutlinedObjectCount: int,
    qFaerieFireCreatureAttackRollMode: str,
    qFaerieFireInvisibleCreatureAttackRollMode: str,
    qFaerieFireObjectAttackRollMode: str,
    qFaerieFireTargetInvisible: bool,
    qFaerieFireObjectInvisibleBenefitDenied: bool,
    qFeatherFallTriggerOffered: bool,
    qFeatherFallUnwitnessedTriggerRejected: bool,
    qFeatherFallReactionSpent: bool,
    qFeatherFallSlotExpended: bool,
    qFeatherFallMitigatedTargetCountBeforeLanding: int,
    qFeatherFallLandedTargetDescentRateCapFeetPerRound: int,
    qFeatherFallLandingFallDamagePrevented: bool,
    qFeatherFallLandingFallingPronePrevented: bool,
    qFeatherFallLandedTargetMitigationCleared: bool,
    qFeatherFallOtherTargetStillMitigated: bool,
    qFogCloudAreaIdentityRetained: bool,
    qFogCloudHeavilyObscuredZoneCount: int,
    qFogCloudRadiusFeet: int,
    qFogCloudDurationTicks: int,
    qFogCloudStrongWindCommandOffered: bool,
    qFogCloudCleanupClearedEffect: bool,
    qFogCloudCleanupClearedZone: bool,
    qFogCloudCleanupClearedConcentration: bool,
    qFogCloudSlotExpended: bool,
    qGreaseAreaIdentityRetained: bool,
    qGreaseActiveHazardCount: int,
    qGreaseDurationTicks: int,
    qGreaseAffectedTargetOutcomeCount: int,
    qGreaseFailedTargetProne: bool,
    qGreaseSucceededTargetProne: bool,
    qGreaseMismatchedAffectedTargetRejected: bool,
    qGreaseDifficultTerrainMovementCostFeet: int,
    qGreaseMovementSpentFeet: int,
    qGreaseMismatchedMovementAreaRejected: bool,
    qGreaseEntrySaveOffered: bool,
    qGreaseEntryFailedTargetProne: bool,
    qGreaseEntryMismatchedTargetRejected: bool,
    qGreaseEndTurnSaveOffered: bool,
    qGreaseEndTurnFailedTargetProne: bool,
    qGreaseEndTurnAdvancedToCaster: bool,
    qGreaseEndTurnMismatchedTargetRejected: bool,
    qGreaseSlotExpended: bool,
    qJumpTargetEffectInstalled: bool,
    qJumpMovementSpentFeet: int,
    qJumpUsedMarkerSet: bool,
    qJumpSameTurnUnavailable: bool,
    qJumpNextTargetTurnAvailable: bool,
    qJumpMissingLandingFactRejected: bool,
    qJumpFailedLandingProne: bool,
    qJumpSlotExpended: bool,
    qProduceFlameHeldLightInstalled: bool,
    qProduceFlameDurationTicks: int,
    qProduceFlameBrightProjectionIllumination: str,
    qProduceFlameHurlOffered: bool,
    qProduceFlameHurlTargetDamaged: bool,
    qProduceFlameHurlCleanupClearedEmitter: bool,
    qProduceFlameDurationCleanupClearedEmitter: bool,
    qThunderwaveAffectedTargetOutcomeCount: int,
    qThunderwaveFailedPushedTargetDamaged: bool,
    qThunderwaveFailedBlockedTargetDamaged: bool,
    qThunderwaveSucceededTargetHalfDamaged: bool,
    qThunderwavePushedCreatureDispositionCount: int,
    qThunderwaveBlockedCreatureDispositionCount: int,
    qThunderwavePushedObjectDispositionCount: int,
    qThunderwaveBlockedObjectDispositionCount: int,
    qThunderwaveAudibleBoomMatched: bool,
    qThunderwaveMissingAreaFactsRejected: bool,
    qThunderwaveMismatchedBoomRejected: bool,
    qThunderwaveSlotExpended: bool,
    qProjectedIllumination: str,
    qOrdinarySightObscurement: str,
    qDarkvisionSightObscurement: str,
    qMismatchedWitnessIllumination: str,
    qObscurementZoneCount: int,
    qCasterConcentrating: bool,
    qMagicActionAvailable: bool,
    qBonusActionAvailable: bool,
    qScenarioOutcome: Level1SpatialWitnessSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: Level1SpatialWitnessSelectedIdentityWitnessState

  pure def qLightEmitterCount: int = qState.qLightEmitterCount
  pure def qDimLightEmitterCount: int = qState.qDimLightEmitterCount
  pure def qRetainedLightIdentityCount: int = qState.qRetainedLightIdentityCount
  pure def qLightObjectAdmitted: bool = qState.qLightObjectAdmitted
  pure def qLightInvalidObjectRejectionCount: int = qState.qLightInvalidObjectRejectionCount
  pure def qLightDurationTicks: int = qState.qLightDurationTicks
  pure def qLightBrightProjectionIllumination: str = qState.qLightBrightProjectionIllumination
  pure def qLightOpaqueCoverIllumination: str = qState.qLightOpaqueCoverIllumination
  pure def qLightRecastReplacedPriorEmitter: bool = qState.qLightRecastReplacedPriorEmitter
  pure def qLightDurationCleanupClearedEmitter: bool = qState.qLightDurationCleanupClearedEmitter
  pure def qFaerieFireOutlinedCreatureCount: int = qState.qFaerieFireOutlinedCreatureCount
  pure def qFaerieFireOutlinedObjectCount: int = qState.qFaerieFireOutlinedObjectCount
  pure def qFaerieFireCreatureAttackRollMode: str = qState.qFaerieFireCreatureAttackRollMode
  pure def qFaerieFireInvisibleCreatureAttackRollMode: str = qState.qFaerieFireInvisibleCreatureAttackRollMode
  pure def qFaerieFireObjectAttackRollMode: str = qState.qFaerieFireObjectAttackRollMode
  pure def qFaerieFireTargetInvisible: bool = qState.qFaerieFireTargetInvisible
  pure def qFaerieFireObjectInvisibleBenefitDenied: bool = qState.qFaerieFireObjectInvisibleBenefitDenied
  pure def qFeatherFallTriggerOffered: bool = qState.qFeatherFallTriggerOffered
  pure def qFeatherFallUnwitnessedTriggerRejected: bool = qState.qFeatherFallUnwitnessedTriggerRejected
  pure def qFeatherFallReactionSpent: bool = qState.qFeatherFallReactionSpent
  pure def qFeatherFallSlotExpended: bool = qState.qFeatherFallSlotExpended
  pure def qFeatherFallMitigatedTargetCountBeforeLanding: int = qState.qFeatherFallMitigatedTargetCountBeforeLanding
  pure def qFeatherFallLandedTargetDescentRateCapFeetPerRound: int = qState.qFeatherFallLandedTargetDescentRateCapFeetPerRound
  pure def qFeatherFallLandingFallDamagePrevented: bool = qState.qFeatherFallLandingFallDamagePrevented
  pure def qFeatherFallLandingFallingPronePrevented: bool = qState.qFeatherFallLandingFallingPronePrevented
  pure def qFeatherFallLandedTargetMitigationCleared: bool = qState.qFeatherFallLandedTargetMitigationCleared
  pure def qFeatherFallOtherTargetStillMitigated: bool = qState.qFeatherFallOtherTargetStillMitigated
  pure def qFogCloudAreaIdentityRetained: bool = qState.qFogCloudAreaIdentityRetained
  pure def qFogCloudHeavilyObscuredZoneCount: int = qState.qFogCloudHeavilyObscuredZoneCount
  pure def qFogCloudRadiusFeet: int = qState.qFogCloudRadiusFeet
  pure def qFogCloudDurationTicks: int = qState.qFogCloudDurationTicks
  pure def qFogCloudStrongWindCommandOffered: bool = qState.qFogCloudStrongWindCommandOffered
  pure def qFogCloudCleanupClearedEffect: bool = qState.qFogCloudCleanupClearedEffect
  pure def qFogCloudCleanupClearedZone: bool = qState.qFogCloudCleanupClearedZone
  pure def qFogCloudCleanupClearedConcentration: bool = qState.qFogCloudCleanupClearedConcentration
  pure def qFogCloudSlotExpended: bool = qState.qFogCloudSlotExpended
  pure def qGreaseAreaIdentityRetained: bool = qState.qGreaseAreaIdentityRetained
  pure def qGreaseActiveHazardCount: int = qState.qGreaseActiveHazardCount
  pure def qGreaseDurationTicks: int = qState.qGreaseDurationTicks
  pure def qGreaseAffectedTargetOutcomeCount: int = qState.qGreaseAffectedTargetOutcomeCount
  pure def qGreaseFailedTargetProne: bool = qState.qGreaseFailedTargetProne
  pure def qGreaseSucceededTargetProne: bool = qState.qGreaseSucceededTargetProne
  pure def qGreaseMismatchedAffectedTargetRejected: bool = qState.qGreaseMismatchedAffectedTargetRejected
  pure def qGreaseDifficultTerrainMovementCostFeet: int = qState.qGreaseDifficultTerrainMovementCostFeet
  pure def qGreaseMovementSpentFeet: int = qState.qGreaseMovementSpentFeet
  pure def qGreaseMismatchedMovementAreaRejected: bool = qState.qGreaseMismatchedMovementAreaRejected
  pure def qGreaseEntrySaveOffered: bool = qState.qGreaseEntrySaveOffered
  pure def qGreaseEntryFailedTargetProne: bool = qState.qGreaseEntryFailedTargetProne
  pure def qGreaseEntryMismatchedTargetRejected: bool = qState.qGreaseEntryMismatchedTargetRejected
  pure def qGreaseEndTurnSaveOffered: bool = qState.qGreaseEndTurnSaveOffered
  pure def qGreaseEndTurnFailedTargetProne: bool = qState.qGreaseEndTurnFailedTargetProne
  pure def qGreaseEndTurnAdvancedToCaster: bool = qState.qGreaseEndTurnAdvancedToCaster
  pure def qGreaseEndTurnMismatchedTargetRejected: bool = qState.qGreaseEndTurnMismatchedTargetRejected
  pure def qGreaseSlotExpended: bool = qState.qGreaseSlotExpended
  pure def qJumpTargetEffectInstalled: bool = qState.qJumpTargetEffectInstalled
  pure def qJumpMovementSpentFeet: int = qState.qJumpMovementSpentFeet
  pure def qJumpUsedMarkerSet: bool = qState.qJumpUsedMarkerSet
  pure def qJumpSameTurnUnavailable: bool = qState.qJumpSameTurnUnavailable
  pure def qJumpNextTargetTurnAvailable: bool = qState.qJumpNextTargetTurnAvailable
  pure def qJumpMissingLandingFactRejected: bool = qState.qJumpMissingLandingFactRejected
  pure def qJumpFailedLandingProne: bool = qState.qJumpFailedLandingProne
  pure def qJumpSlotExpended: bool = qState.qJumpSlotExpended
  pure def qProduceFlameHeldLightInstalled: bool = qState.qProduceFlameHeldLightInstalled
  pure def qProduceFlameDurationTicks: int = qState.qProduceFlameDurationTicks
  pure def qProduceFlameBrightProjectionIllumination: str = qState.qProduceFlameBrightProjectionIllumination
  pure def qProduceFlameHurlOffered: bool = qState.qProduceFlameHurlOffered
  pure def qProduceFlameHurlTargetDamaged: bool = qState.qProduceFlameHurlTargetDamaged
  pure def qProduceFlameHurlCleanupClearedEmitter: bool = qState.qProduceFlameHurlCleanupClearedEmitter
  pure def qProduceFlameDurationCleanupClearedEmitter: bool = qState.qProduceFlameDurationCleanupClearedEmitter
  pure def qThunderwaveAffectedTargetOutcomeCount: int = qState.qThunderwaveAffectedTargetOutcomeCount
  pure def qThunderwaveFailedPushedTargetDamaged: bool = qState.qThunderwaveFailedPushedTargetDamaged
  pure def qThunderwaveFailedBlockedTargetDamaged: bool = qState.qThunderwaveFailedBlockedTargetDamaged
  pure def qThunderwaveSucceededTargetHalfDamaged: bool = qState.qThunderwaveSucceededTargetHalfDamaged
  pure def qThunderwavePushedCreatureDispositionCount: int = qState.qThunderwavePushedCreatureDispositionCount
  pure def qThunderwaveBlockedCreatureDispositionCount: int = qState.qThunderwaveBlockedCreatureDispositionCount
  pure def qThunderwavePushedObjectDispositionCount: int = qState.qThunderwavePushedObjectDispositionCount
  pure def qThunderwaveBlockedObjectDispositionCount: int = qState.qThunderwaveBlockedObjectDispositionCount
  pure def qThunderwaveAudibleBoomMatched: bool = qState.qThunderwaveAudibleBoomMatched
  pure def qThunderwaveMissingAreaFactsRejected: bool = qState.qThunderwaveMissingAreaFactsRejected
  pure def qThunderwaveMismatchedBoomRejected: bool = qState.qThunderwaveMismatchedBoomRejected
  pure def qThunderwaveSlotExpended: bool = qState.qThunderwaveSlotExpended
  pure def qProjectedIllumination: str = qState.qProjectedIllumination
  pure def qOrdinarySightObscurement: str = qState.qOrdinarySightObscurement
  pure def qDarkvisionSightObscurement: str = qState.qDarkvisionSightObscurement
  pure def qMismatchedWitnessIllumination: str = qState.qMismatchedWitnessIllumination
  pure def qObscurementZoneCount: int = qState.qObscurementZoneCount
  pure def qCasterConcentrating: bool = qState.qCasterConcentrating
  pure def qMagicActionAvailable: bool = qState.qMagicActionAvailable
  pure def qBonusActionAvailable: bool = qState.qBonusActionAvailable
  pure def qLastResult: Level1SpatialWitnessSelectedIdentityScenarioOutcome = qState.qScenarioOutcome

  pure def level1SpatialWitnessSelectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioResult: Level1SpatialWitnessSelectedIdentityScenarioOutcome,
    _scenarioInvalidReason: str,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioResult == Init) witnessInit(WitnessProtocolHole)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)

  val qFogCloudLevelOneRadiusFeet = 20
  val qFogCloudOneHourDurationTicks = 600
  val qGreaseOneMinuteDurationTicks = 10
  val qGreaseDifficultTerrainTotalDistanceFeet = 10
  val qGreaseDifficultTerrainDistanceFeet = 5
  val qGreaseDifficultTerrainExpectedMovementCostFeet =
    qGreaseDifficultTerrainTotalDistanceFeet + qGreaseDifficultTerrainDistanceFeet
  val qJumpMovementCostFeet = 10
  val qLightOneHourDurationTicks = 600
  val qProduceFlameTenMinuteDurationTicks = 100
  val qThunderwaveExpectedAffectedTargetOutcomeCount = 3
  val qThunderwaveExpectedDispositionCount = 1


  action recordProjection(
    lightEmitterCount: int,
    dimLightEmitterCount: int,
    retainedLightIdentityCount: int,
    lightObjectAdmitted: bool,
    lightInvalidObjectRejectionCount: int,
    lightDurationTicks: int,
    lightBrightProjectionIllumination: str,
    lightOpaqueCoverIllumination: str,
    lightRecastReplacedPriorEmitter: bool,
    lightDurationCleanupClearedEmitter: bool,
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
    produceFlameHeldLightInstalled: bool,
    produceFlameDurationTicks: int,
    produceFlameBrightProjectionIllumination: str,
    produceFlameHurlOffered: bool,
    produceFlameHurlTargetDamaged: bool,
    produceFlameHurlCleanupClearedEmitter: bool,
    produceFlameDurationCleanupClearedEmitter: bool,
    thunderwaveAffectedTargetOutcomeCount: int,
    thunderwaveFailedPushedTargetDamaged: bool,
    thunderwaveFailedBlockedTargetDamaged: bool,
    thunderwaveSucceededTargetHalfDamaged: bool,
    thunderwavePushedCreatureDispositionCount: int,
    thunderwaveBlockedCreatureDispositionCount: int,
    thunderwavePushedObjectDispositionCount: int,
    thunderwaveBlockedObjectDispositionCount: int,
    thunderwaveAudibleBoomMatched: bool,
    thunderwaveMissingAreaFactsRejected: bool,
    thunderwaveMismatchedBoomRejected: bool,
    thunderwaveSlotExpended: bool,
    projectedIllumination: str,
    ordinarySightObscurement: str,
    darkvisionSightObscurement: str,
    mismatchedWitnessIllumination: str,
    obscurementZoneCount: int,
    casterConcentrating: bool,
    magicActionAvailable: bool,
    bonusActionAvailable: bool,
    lastResult: Level1SpatialWitnessSelectedIdentityScenarioOutcome,
  ): bool = all {
    qState' = {
      qLightEmitterCount: lightEmitterCount,
      qDimLightEmitterCount: dimLightEmitterCount,
      qRetainedLightIdentityCount: retainedLightIdentityCount,
      qLightObjectAdmitted: lightObjectAdmitted,
      qLightInvalidObjectRejectionCount: lightInvalidObjectRejectionCount,
      qLightDurationTicks: lightDurationTicks,
      qLightBrightProjectionIllumination: lightBrightProjectionIllumination,
      qLightOpaqueCoverIllumination: lightOpaqueCoverIllumination,
      qLightRecastReplacedPriorEmitter: lightRecastReplacedPriorEmitter,
      qLightDurationCleanupClearedEmitter: lightDurationCleanupClearedEmitter,
      qFaerieFireOutlinedCreatureCount: faerieFireOutlinedCreatureCount,
      qFaerieFireOutlinedObjectCount: faerieFireOutlinedObjectCount,
      qFaerieFireCreatureAttackRollMode: faerieFireCreatureAttackRollMode,
      qFaerieFireInvisibleCreatureAttackRollMode: faerieFireInvisibleCreatureAttackRollMode,
      qFaerieFireObjectAttackRollMode: faerieFireObjectAttackRollMode,
      qFaerieFireTargetInvisible: faerieFireTargetInvisible,
      qFaerieFireObjectInvisibleBenefitDenied: faerieFireObjectInvisibleBenefitDenied,
      qFeatherFallTriggerOffered: featherFallTriggerOffered,
      qFeatherFallUnwitnessedTriggerRejected: featherFallUnwitnessedTriggerRejected,
      qFeatherFallReactionSpent: featherFallReactionSpent,
      qFeatherFallSlotExpended: featherFallSlotExpended,
      qFeatherFallMitigatedTargetCountBeforeLanding: featherFallMitigatedTargetCountBeforeLanding,
      qFeatherFallLandedTargetDescentRateCapFeetPerRound: featherFallLandedTargetDescentRateCapFeetPerRound,
      qFeatherFallLandingFallDamagePrevented: featherFallLandingFallDamagePrevented,
      qFeatherFallLandingFallingPronePrevented: featherFallLandingFallingPronePrevented,
      qFeatherFallLandedTargetMitigationCleared: featherFallLandedTargetMitigationCleared,
      qFeatherFallOtherTargetStillMitigated: featherFallOtherTargetStillMitigated,
      qFogCloudAreaIdentityRetained: fogCloudAreaIdentityRetained,
      qFogCloudHeavilyObscuredZoneCount: fogCloudHeavilyObscuredZoneCount,
      qFogCloudRadiusFeet: fogCloudRadiusFeet,
      qFogCloudDurationTicks: fogCloudDurationTicks,
      qFogCloudStrongWindCommandOffered: fogCloudStrongWindCommandOffered,
      qFogCloudCleanupClearedEffect: fogCloudCleanupClearedEffect,
      qFogCloudCleanupClearedZone: fogCloudCleanupClearedZone,
      qFogCloudCleanupClearedConcentration: fogCloudCleanupClearedConcentration,
      qFogCloudSlotExpended: fogCloudSlotExpended,
      qGreaseAreaIdentityRetained: greaseAreaIdentityRetained,
      qGreaseActiveHazardCount: greaseActiveHazardCount,
      qGreaseDurationTicks: greaseDurationTicks,
      qGreaseAffectedTargetOutcomeCount: greaseAffectedTargetOutcomeCount,
      qGreaseFailedTargetProne: greaseFailedTargetProne,
      qGreaseSucceededTargetProne: greaseSucceededTargetProne,
      qGreaseMismatchedAffectedTargetRejected: greaseMismatchedAffectedTargetRejected,
      qGreaseDifficultTerrainMovementCostFeet: greaseDifficultTerrainMovementCostFeet,
      qGreaseMovementSpentFeet: greaseMovementSpentFeet,
      qGreaseMismatchedMovementAreaRejected: greaseMismatchedMovementAreaRejected,
      qGreaseEntrySaveOffered: greaseEntrySaveOffered,
      qGreaseEntryFailedTargetProne: greaseEntryFailedTargetProne,
      qGreaseEntryMismatchedTargetRejected: greaseEntryMismatchedTargetRejected,
      qGreaseEndTurnSaveOffered: greaseEndTurnSaveOffered,
      qGreaseEndTurnFailedTargetProne: greaseEndTurnFailedTargetProne,
      qGreaseEndTurnAdvancedToCaster: greaseEndTurnAdvancedToCaster,
      qGreaseEndTurnMismatchedTargetRejected: greaseEndTurnMismatchedTargetRejected,
      qGreaseSlotExpended: greaseSlotExpended,
      qJumpTargetEffectInstalled: jumpTargetEffectInstalled,
      qJumpMovementSpentFeet: jumpMovementSpentFeet,
      qJumpUsedMarkerSet: jumpUsedMarkerSet,
      qJumpSameTurnUnavailable: jumpSameTurnUnavailable,
      qJumpNextTargetTurnAvailable: jumpNextTargetTurnAvailable,
      qJumpMissingLandingFactRejected: jumpMissingLandingFactRejected,
      qJumpFailedLandingProne: jumpFailedLandingProne,
      qJumpSlotExpended: jumpSlotExpended,
      qProduceFlameHeldLightInstalled: produceFlameHeldLightInstalled,
      qProduceFlameDurationTicks: produceFlameDurationTicks,
      qProduceFlameBrightProjectionIllumination: produceFlameBrightProjectionIllumination,
      qProduceFlameHurlOffered: produceFlameHurlOffered,
      qProduceFlameHurlTargetDamaged: produceFlameHurlTargetDamaged,
      qProduceFlameHurlCleanupClearedEmitter: produceFlameHurlCleanupClearedEmitter,
      qProduceFlameDurationCleanupClearedEmitter: produceFlameDurationCleanupClearedEmitter,
      qThunderwaveAffectedTargetOutcomeCount: thunderwaveAffectedTargetOutcomeCount,
      qThunderwaveFailedPushedTargetDamaged: thunderwaveFailedPushedTargetDamaged,
      qThunderwaveFailedBlockedTargetDamaged: thunderwaveFailedBlockedTargetDamaged,
      qThunderwaveSucceededTargetHalfDamaged: thunderwaveSucceededTargetHalfDamaged,
      qThunderwavePushedCreatureDispositionCount: thunderwavePushedCreatureDispositionCount,
      qThunderwaveBlockedCreatureDispositionCount: thunderwaveBlockedCreatureDispositionCount,
      qThunderwavePushedObjectDispositionCount: thunderwavePushedObjectDispositionCount,
      qThunderwaveBlockedObjectDispositionCount: thunderwaveBlockedObjectDispositionCount,
      qThunderwaveAudibleBoomMatched: thunderwaveAudibleBoomMatched,
      qThunderwaveMissingAreaFactsRejected: thunderwaveMissingAreaFactsRejected,
      qThunderwaveMismatchedBoomRejected: thunderwaveMismatchedBoomRejected,
      qThunderwaveSlotExpended: thunderwaveSlotExpended,
      qProjectedIllumination: projectedIllumination,
      qOrdinarySightObscurement: ordinarySightObscurement,
      qDarkvisionSightObscurement: darkvisionSightObscurement,
      qMismatchedWitnessIllumination: mismatchedWitnessIllumination,
      qObscurementZoneCount: obscurementZoneCount,
      qCasterConcentrating: casterConcentrating,
      qMagicActionAvailable: magicActionAvailable,
      qBonusActionAvailable: bonusActionAvailable,
      qScenarioOutcome: lastResult,
      protocol: level1SpatialWitnessSelectedIdentityProtocolForProjection(Set(), lastResult, ""),
    },
  }

  action init =
    recordProjection(
      0, 0, 0,
      false, 0, 0, "darkness", "darkness", false, false,
      0, 0, "normal", "normal", "normal", false, false,
      false, false, false, false, 0, 0, false, false, false, false,
      false, 0, 0, 0, false, false, false, false, false,
      false, 0, 0, 0, false, false, false,
      0, 0, false, false, false, false, false, false, false, false, false,
      false, 0, false, false, false, false, false, false,
      false, 0, "darkness", false, false, false, false,
      0, false, false, false, 0, 0, 0, 0, false, false, false, false,
      "darkness", "heavilyObscured", "lightlyObscured", "darkness",
      0, false, true, true,
      Init,
    )

  action doDancingLightsMovableDimLight = all {
    qLastResult == Init,
    recordProjection(
      2, 2, 2,
      false, 0, 0, "darkness", "darkness", false, false,
      0, 0, "normal", "normal", "normal", false, false,
      false, false, false, false, 0, 0, false, false, false, false,
      false, 0, 0, 0, false, false, false, false, false,
      false, 0, 0, 0, false, false, false,
      0, 0, false, false, false, false, false, false, false, false, false,
      false, 0, false, false, false, false, false, false,
      false, 0, "darkness", false, false, false, false,
      0, false, false, false, 0, 0, 0, 0, false, false, false, false,
      "dimLight", "lightlyObscured", "unobscured", "darkness",
      0, true, false, false,
      DancingLightsMovableDimLight,
    ),
  }

  action doFaerieFireOutlineAdvantageInvisibleDimLight = all {
    qLastResult == Init,
    recordProjection(
      2, 2, 0,
      false, 0, 0, "darkness", "darkness", false, false,
      1, 1, "advantage", "advantage", "advantage", true, true,
      false, false, false, false, 0, 0, false, false, false, false,
      false, 0, 0, 0, false, false, false, false, false,
      false, 0, 0, 0, false, false, false,
      0, 0, false, false, false, false, false, false, false, false, false,
      false, 0, false, false, false, false, false, false,
      false, 0, "darkness", false, false, false, false,
      0, false, false, false, 0, 0, 0, 0, false, false, false, false,
      "dimLight", "lightlyObscured", "unobscured", "darkness",
      0, true, true, true,
      FaerieFireOutlineAdvantageInvisibleDimLight,
    ),
  }

  action doFeatherFallReactionMitigationLanding = all {
    qLastResult == Init,
    recordProjection(
      0, 0, 0,
      false, 0, 0, "darkness", "darkness", false, false,
      0, 0, "normal", "normal", "normal", false, false,
      true, true, true, true, 2, 60, true, true, true, true,
      false, 0, 0, 0, false, false, false, false, false,
      false, 0, 0, 0, false, false, false,
      0, 0, false, false, false, false, false, false, false, false, false,
      false, 0, false, false, false, false, false, false,
      false, 0, "darkness", false, false, false, false,
      0, false, false, false, 0, 0, 0, 0, false, false, false, false,
      "darkness", "heavilyObscured", "lightlyObscured", "darkness",
      0, false, true, true,
      FeatherFallReactionMitigationLanding,
    ),
  }

  action doFogCloudAreaIdentityObscurementStrongWindCleanup = all {
    qLastResult == Init,
    recordProjection(
      0, 0, 0,
      false, 0, 0, "darkness", "darkness", false, false,
      0, 0, "normal", "normal", "normal", false, false,
      false, false, false, false, 0, 0, false, false, false, false,
      true, 1, qFogCloudLevelOneRadiusFeet, qFogCloudOneHourDurationTicks,
      true, true, true, true, true,
      false, 0, 0, 0, false, false, false,
      0, 0, false, false, false, false, false, false, false, false, false,
      false, 0, false, false, false, false, false, false,
      false, 0, "darkness", false, false, false, false,
      0, false, false, false, 0, 0, 0, 0, false, false, false, false,
      "darkness", "heavilyObscured", "lightlyObscured", "darkness",
      0, false, false, true,
      FogCloudAreaIdentityObscurementStrongWindCleanup,
    ),
  }

  action doGreaseCastGroundHazardSavingThrows = all {
    qLastResult == Init,
    recordProjection(
      0, 0, 0,
      false, 0, 0, "darkness", "darkness", false, false,
      0, 0, "normal", "normal", "normal", false, false,
      false, false, false, false, 0, 0, false, false, false, false,
      false, 0, 0, 0, false, false, false, false, false,
      true, 1, qGreaseOneMinuteDurationTicks, 2, true, false, true,
      0, 0, false, false, false, false, false, false, false, false, true,
      false, 0, false, false, false, false, false, false,
      false, 0, "darkness", false, false, false, false,
      0, false, false, false, 0, 0, 0, 0, false, false, false, false,
      "darkness", "heavilyObscured", "lightlyObscured", "darkness",
      0, false, false, true,
      GreaseCastGroundHazardSavingThrows,
    ),
  }

  action doGreaseMovementAndTurnTriggers = all {
    qLastResult == Init,
    recordProjection(
      0, 0, 0,
      false, 0, 0, "darkness", "darkness", false, false,
      0, 0, "normal", "normal", "normal", false, false,
      false, false, false, false, 0, 0, false, false, false, false,
      false, 0, 0, 0, false, false, false, false, false,
      true, 1, qGreaseOneMinuteDurationTicks, 2, true, false, true,
      qGreaseDifficultTerrainExpectedMovementCostFeet,
      qGreaseDifficultTerrainExpectedMovementCostFeet,
      true, true, true, true, true, true, true, true, true,
      false, 0, false, false, false, false, false, false,
      false, 0, "darkness", false, false, false, false,
      0, false, false, false, 0, 0, 0, 0, false, false, false, false,
      "darkness", "heavilyObscured", "lightlyObscured", "darkness",
      0, false, true, true,
      GreaseMovementAndTurnTriggers,
    ),
  }

  action doJumpMovementReplacementLandingWitness = all {
    qLastResult == Init,
    recordProjection(
      0, 0, 0,
      false, 0, 0, "darkness", "darkness", false, false,
      0, 0, "normal", "normal", "normal", false, false,
      false, false, false, false, 0, 0, false, false, false, false,
      false, 0, 0, 0, false, false, false, false, false,
      false, 0, 0, 0, false, false, false,
      0, 0, false, false, false, false, false, false, false, false, false,
      true, qJumpMovementCostFeet, true, true, true, true, true, true,
      false, 0, "darkness", false, false, false, false,
      0, false, false, false, 0, 0, 0, 0, false, false, false, false,
      "darkness", "heavilyObscured", "lightlyObscured", "darkness",
      0, false, true, true,
      JumpMovementReplacementLandingWitness,
    ),
  }

  action doLightObjectEmitterProjectionReplacementCleanup = all {
    qLastResult == Init,
    recordProjection(
      1, 0, 0,
      true, 3, qLightOneHourDurationTicks, "brightLight", "darkness", true, true,
      0, 0, "normal", "normal", "normal", false, false,
      false, false, false, false, 0, 0, false, false, false, false,
      false, 0, 0, 0, false, false, false, false, false,
      false, 0, 0, 0, false, false, false,
      0, 0, false, false, false, false, false, false, false, false, false,
      false, 0, false, false, false, false, false, false,
      false, 0, "darkness", false, false, false, false,
      0, false, false, false, 0, 0, 0, 0, false, false, false, false,
      "dimLight", "lightlyObscured", "unobscured", "darkness",
      0, false, false, true,
      LightObjectEmitterProjectionReplacementCleanup,
    ),
  }

  action doProduceFlameHeldLightProjectionHurlCleanup = all {
    qLastResult == Init,
    recordProjection(
      1, 0, 0,
      false, 0, 0, "darkness", "darkness", false, false,
      0, 0, "normal", "normal", "normal", false, false,
      false, false, false, false, 0, 0, false, false, false, false,
      false, 0, 0, 0, false, false, false, false, false,
      false, 0, 0, 0, false, false, false,
      0, 0, false, false, false, false, false, false, false, false, false,
      false, 0, false, false, false, false, false, false,
      true, qProduceFlameTenMinuteDurationTicks, "brightLight",
      true, true, true, true,
      0, false, false, false, 0, 0, 0, 0, false, false, false, false,
      "dimLight", "lightlyObscured", "unobscured", "darkness",
      0, false, true, false,
      ProduceFlameHeldLightProjectionHurlCleanup,
    ),
  }

  action doThunderwaveSavePushObjectsBoom = all {
    qLastResult == Init,
    recordProjection(
      0, 0, 0,
      false, 0, 0, "darkness", "darkness", false, false,
      0, 0, "normal", "normal", "normal", false, false,
      false, false, false, false, 0, 0, false, false, false, false,
      false, 0, 0, 0, false, false, false, false, false,
      false, 0, 0, 0, false, false, false,
      0, 0, false, false, false, false, false, false, false, false, false,
      false, 0, false, false, false, false, false, false,
      false, 0, "darkness", false, false, false, false,
      qThunderwaveExpectedAffectedTargetOutcomeCount, true, true, true,
      qThunderwaveExpectedDispositionCount, qThunderwaveExpectedDispositionCount,
      qThunderwaveExpectedDispositionCount, qThunderwaveExpectedDispositionCount,
      true, true, true, true,
      "darkness", "heavilyObscured", "lightlyObscured", "darkness",
      0, false, false, true,
      ThunderwaveSavePushObjectsBoom,
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
    doLightObjectEmitterProjectionReplacementCleanup,
    doProduceFlameHeldLightProjectionHurlCleanup,
    doThunderwaveSavePushObjectsBoom,
  }
}
