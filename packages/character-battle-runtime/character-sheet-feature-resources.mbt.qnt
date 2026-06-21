// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner SHEET.FEATURE_RESOURCES.TRANSITIONS
// UNIT-PROFILE-COVERAGE: qnt-owner character-sheet.healing-resource-action character-sheet.class-feature-use-count-resource character-sheet.class-feature-point-pool-resource character-sheet.font-of-magic-slot-to-sorcery-points character-sheet.font-of-magic-sorcery-points-to-spell-slot character-sheet.metamagic-battle-resource-bridge character-sheet.class-feature-long-rest-use-state character-sheet.monk-uncanny-metabolism-initiative-recovery

module characterSheetFeatureResourcesMbt {
  import featureResourceHitPointHealing.* from "../shared-algebras/proofs/rule-core/feature-resource-hit-point-healing"
  import featureResourcePool.* from "../shared-algebras/proofs/rule-core/feature-resource-pool"
  import fontOfMagicResource.* from "../shared-algebras/proofs/rule-core/font-of-magic-resource"
  import layOnHandsResource.* from "../shared-algebras/proofs/rule-core/lay-on-hands-resource"
  import uncannyMetabolismResource.* from "../shared-algebras/proofs/rule-core/uncanny-metabolism-resource"

  type CharacterSheetFeatureResourcesOutcome =
    | CharacterSheetFeatureResourcesInit
    | CharacterSheetFeatureResourcesLayOnHandsRestoresHpAndRemovesPoisoned
    | CharacterSheetFeatureResourcesLayOnHandsOverspendRejected
    | CharacterSheetFeatureResourcesLongRestClearsLayOnHandsPool
    | CharacterSheetFeatureResourcesShortRestRecoversUseCountPools
    | CharacterSheetFeatureResourcesLongRestClearsPointPoolAndUseState
    | CharacterSheetFeatureResourcesFontOfMagicSlotToPoints
    | CharacterSheetFeatureResourcesFontOfMagicAmbiguousSlotSourceRejected
    | CharacterSheetFeatureResourcesFontOfMagicPointsToSlot
    | CharacterSheetFeatureResourcesFontOfMagicInsufficientPointsRejected
    | CharacterSheetFeatureResourcesShortRestPreservesUncannyUseState
    | CharacterSheetFeatureResourcesLongRestClearsUncannyUseState
    | CharacterSheetFeatureResourcesUncannyMetabolismRecoversFocusAndHeals
    | CharacterSheetFeatureResourcesUncannyMetabolismRepeatUseRejected
    | CharacterSheetFeatureResourcesMetamagicBridgeUsesSharedPointPool

  type CharacterSheetFeatureResourcesState = {
    outcome: CharacterSheetFeatureResourcesOutcome,
    accepted: bool,
    message: str,
    facts: SheetFeatureResourceFacts,
    replayIndex: int,
  }

  var qState: CharacterSheetFeatureResourcesState

  type SheetFeatureResourceFacts = {
    sourceCurrentHp: int,
    targetCurrentHp: int,
    temporaryHitPoints: int,
    targetPoisoned: bool,
    layOnHandsCapacity: int,
    layOnHandsExpended: int,
    druidWildShapeExpended: int,
    monkFocusExpended: int,
    sorceryPointCapacity: int,
    sorceryPointExpended: int,
    ordinaryLevel2Expended: int,
    createdLevel3Capacity: int,
    createdLevel3Expended: int,
    uncannyUsedSinceLongRest: bool,
    metamagicKnownOptions: int,
    metamagicSharedResourceExpended: int,
  }

  pure def emptyFeatureResourceFacts: SheetFeatureResourceFacts = {
    sourceCurrentHp: 0,
    targetCurrentHp: 0,
    temporaryHitPoints: 0,
    targetPoisoned: false,
    layOnHandsCapacity: 0,
    layOnHandsExpended: 0,
    druidWildShapeExpended: 0,
    monkFocusExpended: 0,
    sorceryPointCapacity: 0,
    sorceryPointExpended: 0,
    ordinaryLevel2Expended: 0,
    createdLevel3Capacity: 0,
    createdLevel3Expended: 0,
    uncannyUsedSinceLongRest: false,
    metamagicKnownOptions: 0,
    metamagicSharedResourceExpended: 0,
  }

  pure def featureResourcePool(capacity: int, expended: int): ResourcePoolFacts = {
    capacity: capacity,
    expended: expended,
  }

  pure def targetHitPointFacts(
    sheet: SheetFeatureResourceFacts,
    hitPointMaximum: int,
  ): FeatureResourceHitPointFacts = {
    currentHitPoints: sheet.targetCurrentHp,
    hitPointMaximum: hitPointMaximum,
    temporaryHitPoints: 0,
  }

  pure def sourceHitPointFacts(
    sheet: SheetFeatureResourceFacts,
    hitPointMaximum: int,
  ): FeatureResourceHitPointFacts = {
    currentHitPoints: sheet.sourceCurrentHp,
    hitPointMaximum: hitPointMaximum,
    temporaryHitPoints: sheet.temporaryHitPoints,
  }

  pure def layOnHandsPool(sheet: SheetFeatureResourceFacts): ResourcePoolFacts =
    featureResourcePool(sheet.layOnHandsCapacity, sheet.layOnHandsExpended)

  pure def sorceryPointPool(sheet: SheetFeatureResourceFacts): ResourcePoolFacts =
    featureResourcePool(sheet.sorceryPointCapacity, sheet.sorceryPointExpended)

  pure def createdLevel3SlotPool(sheet: SheetFeatureResourceFacts): ResourcePoolFacts =
    featureResourcePool(sheet.createdLevel3Capacity, sheet.createdLevel3Expended)

  pure def ordinaryLevel2SlotPool(sheet: SheetFeatureResourceFacts): ResourcePoolFacts =
    featureResourcePool(2, sheet.ordinaryLevel2Expended)

  pure def withLayOnHandsPool(
    sheet: SheetFeatureResourceFacts,
    pool: ResourcePoolFacts,
  ): SheetFeatureResourceFacts =
    sheet
      .with("layOnHandsCapacity", pool.capacity)
      .with("layOnHandsExpended", pool.expended)

  pure def withSorceryPointPool(
    sheet: SheetFeatureResourceFacts,
    pool: ResourcePoolFacts,
  ): SheetFeatureResourceFacts =
    sheet
      .with("sorceryPointCapacity", pool.capacity)
      .with("sorceryPointExpended", pool.expended)

  pure def withCreatedLevel3SlotPool(
    sheet: SheetFeatureResourceFacts,
    pool: ResourcePoolFacts,
  ): SheetFeatureResourceFacts =
    sheet
      .with("createdLevel3Capacity", pool.capacity)
      .with("createdLevel3Expended", pool.expended)

  pure def featureResourceRestState(sheet: SheetFeatureResourceFacts): FeatureResourceRestState = {
    layOnHandsPool: layOnHandsPool(sheet),
    wildShapeExpended: sheet.druidWildShapeExpended,
    monkFocusExpended: sheet.monkFocusExpended,
    sorceryPoints: sorceryPointPool(sheet),
    createdSpellSlots: createdLevel3SlotPool(sheet),
    uncannyUsedSinceLongRest: sheet.uncannyUsedSinceLongRest,
  }

  pure def withFeatureResourceRestState(
    sheet: SheetFeatureResourceFacts,
    restState: FeatureResourceRestState,
  ): SheetFeatureResourceFacts =
    withCreatedLevel3SlotPool(
      withSorceryPointPool(
        withLayOnHandsPool(sheet, restState.layOnHandsPool)
          .with("druidWildShapeExpended", restState.wildShapeExpended)
          .with("monkFocusExpended", restState.monkFocusExpended)
          .with("uncannyUsedSinceLongRest", restState.uncannyUsedSinceLongRest),
        restState.sorceryPoints),
      restState.createdSpellSlots)

  pure def applyLayOnHandsToSheet(
    sheet: SheetFeatureResourceFacts,
    targetHitPointMaximum: int,
    restoredHitPoints: int,
    removedConditionCount: int,
  ): SheetFeatureResourceFacts = {
    val applied = applyLayOnHandsResource(
      layOnHandsPool(sheet),
      targetHitPointFacts(sheet, targetHitPointMaximum),
      restoredHitPoints,
      removedConditionCount,
    )
    withLayOnHandsPool(sheet, applied.healingPool)
      .with("targetCurrentHp", applied.targetHitPoints.currentHitPoints)
      .with("targetPoisoned", if (applied.conditionRemoved) false else sheet.targetPoisoned)
  }

  pure def completeLongRestFeatureResources(sheet: SheetFeatureResourceFacts): SheetFeatureResourceFacts =
    withFeatureResourceRestState(sheet, completeLongRestFeatureResourceRestState(featureResourceRestState(sheet)))

  pure def shortRestFeatureResources(sheet: SheetFeatureResourceFacts): SheetFeatureResourceFacts =
    withFeatureResourceRestState(sheet, completeShortRestFeatureResourceRestState(featureResourceRestState(sheet)))

  pure def useUncannyMetabolism(sheet: SheetFeatureResourceFacts, maximumHp: int, monkLevel: int, martialArtsRoll: int): SheetFeatureResourceFacts = {
    val applied = applyUncannyMetabolism(
      featureResourcePool(2, sheet.monkFocusExpended),
      sourceHitPointFacts(sheet, maximumHp),
      monkLevel,
      martialArtsRoll,
    )
    sheet
      .with("sourceCurrentHp", applied.hitPoints.currentHitPoints)
      .with("temporaryHitPoints", applied.hitPoints.temporaryHitPoints)
      .with("monkFocusExpended", applied.focusPoints.expended)
      .with("uncannyUsedSinceLongRest", applied.usedSinceLongRest)
  }

  pure def createFontOfMagicLevel3SlotOnSheet(sheet: SheetFeatureResourceFacts): SheetFeatureResourceFacts = {
    val created = createFontOfMagicSpellSlot(
      sorceryPointPool(sheet),
      createdLevel3SlotPool(sheet),
      3,
    )
    withCreatedLevel3SlotPool(
      withSorceryPointPool(sheet, created.sorceryPoints),
      created.createdSpellSlot)
  }

  pure def convertFontOfMagicLevel2SlotToPointsOnSheet(sheet: SheetFeatureResourceFacts): SheetFeatureResourceFacts = {
    val converted = convertFontOfMagicSlotToSorceryPoints(
      sorceryPointPool(sheet),
      2,
      ordinaryLevel2SlotPool(sheet),
      featureResourcePool(0, 0),
    )
    withSorceryPointPool(sheet, converted.sorceryPoints)
      .with("ordinaryLevel2Expended", converted.ordinarySpellSlot.expended)
  }

  action recordProjection(
    outcome: CharacterSheetFeatureResourcesOutcome,
    accepted: bool,
    message: str,
    sheet: SheetFeatureResourceFacts,
    replayIndex: int,
  ): bool = all {
    qState' = {
      outcome: outcome,
      accepted: accepted,
      message: message,
      facts: sheet,
      replayIndex: replayIndex,
    },
  }

  action init =
    recordProjection(
      CharacterSheetFeatureResourcesInit,
      false,
      "none",
      emptyFeatureResourceFacts,
      0,
    )

  action doLayOnHandsRestoresHpAndRemovesPoisoned = all {
    qState.replayIndex == 0,
    recordProjection(
      CharacterSheetFeatureResourcesLayOnHandsRestoresHpAndRemovesPoisoned,
      true,
      "none",
      applyLayOnHandsToSheet(emptyFeatureResourceFacts
        .with("sourceCurrentHp", 12)
        .with("targetCurrentHp", 3)
        .with("targetPoisoned", true)
        .with("layOnHandsCapacity", 10)
        .with("layOnHandsExpended", 0), 10, 2, 1),
      1,
    ),
  }

  action doRejectLayOnHandsOverspend = all {
    qState.replayIndex == 1,
    not(canApplyLayOnHandsResource(featureResourcePool(5, 0), 1, 1)),
    recordProjection(
      CharacterSheetFeatureResourcesLayOnHandsOverspendRejected,
      false,
      "Lay On Hands cannot spend more healing pool than remains.",
      emptyFeatureResourceFacts
        .with("sourceCurrentHp", 6)
        .with("targetCurrentHp", 6)
        .with("targetPoisoned", true)
        .with("layOnHandsCapacity", 5)
        .with("layOnHandsExpended", 0),
      2,
    ),
  }

  action doLongRestClearsLayOnHandsPool = all {
    qState.replayIndex == 2,
    legalFeatureResourceRestState(featureResourceRestState(emptyFeatureResourceFacts
      .with("sourceCurrentHp", 12)
      .with("targetCurrentHp", 12)
      .with("layOnHandsCapacity", 5)
      .with("layOnHandsExpended", 4))),
    recordProjection(
      CharacterSheetFeatureResourcesLongRestClearsLayOnHandsPool,
      true,
      "none",
      completeLongRestFeatureResources(emptyFeatureResourceFacts
        .with("sourceCurrentHp", 12)
        .with("targetCurrentHp", 12)
        .with("layOnHandsCapacity", 5)
        .with("layOnHandsExpended", 4)),
      3,
    ),
  }

  action doShortRestRecoversUseCountPools = all {
    qState.replayIndex == 3,
    legalFeatureResourceRestState(featureResourceRestState(emptyFeatureResourceFacts
      .with("druidWildShapeExpended", 2)
      .with("monkFocusExpended", 2))),
    recordProjection(
      CharacterSheetFeatureResourcesShortRestRecoversUseCountPools,
      true,
      "none",
      shortRestFeatureResources(emptyFeatureResourceFacts
        .with("druidWildShapeExpended", 2)
        .with("monkFocusExpended", 2)),
      4,
    ),
  }

  action doLongRestClearsPointPoolAndUseState = all {
    qState.replayIndex == 4,
    legalFeatureResourceRestState(featureResourceRestState(emptyFeatureResourceFacts
      .with("sorceryPointCapacity", 2)
      .with("sorceryPointExpended", 2)
      .with("uncannyUsedSinceLongRest", true))),
    recordProjection(
      CharacterSheetFeatureResourcesLongRestClearsPointPoolAndUseState,
      true,
      "none",
      completeLongRestFeatureResources(emptyFeatureResourceFacts
        .with("sorceryPointCapacity", 2)
        .with("sorceryPointExpended", 2)
        .with("uncannyUsedSinceLongRest", true)),
      5,
    ),
  }

  action doFontOfMagicSlotToPoints = all {
    qState.replayIndex == 5,
    canConvertFontOfMagicSlotToSorceryPoints(featureResourcePool(3, 3), 2, featureResourcePool(2, 1), featureResourcePool(0, 0)),
    recordProjection(
      CharacterSheetFeatureResourcesFontOfMagicSlotToPoints,
      true,
      "none",
      convertFontOfMagicLevel2SlotToPointsOnSheet(emptyFeatureResourceFacts
        .with("sorceryPointCapacity", 3)
        .with("sorceryPointExpended", 3)
        .with("ordinaryLevel2Expended", 1)),
      6,
    ),
  }

  action doRejectFontOfMagicAmbiguousSlotSource = all {
    qState.replayIndex == 6,
    fontOfMagicSpellSlotSourceRequiresChoice(featureResourcePool(2, 0), featureResourcePool(1, 0)),
    recordProjection(
      CharacterSheetFeatureResourcesFontOfMagicAmbiguousSlotSourceRejected,
      false,
      "Font of Magic conversion requires a Spell Slot source when ordinary and created Spell Slots are both available.",
      emptyFeatureResourceFacts
        .with("sorceryPointCapacity", 5)
        .with("sorceryPointExpended", 5)
        .with("createdLevel3Capacity", 1)
        .with("createdLevel3Expended", 0),
      7,
    ),
  }

  action doFontOfMagicPointsToSlot = all {
    qState.replayIndex == 7,
    canCreateFontOfMagicSpellSlot(featureResourcePool(5, 0), featureResourcePool(0, 0), 5, 3),
    recordProjection(
      CharacterSheetFeatureResourcesFontOfMagicPointsToSlot,
      true,
      "none",
      createFontOfMagicLevel3SlotOnSheet(emptyFeatureResourceFacts
        .with("sorceryPointCapacity", 5)
        .with("sorceryPointExpended", 0)
        .with("createdLevel3Capacity", 0)
        .with("createdLevel3Expended", 0)),
      8,
    ),
  }

  action doRejectFontOfMagicInsufficientPoints = all {
    qState.replayIndex == 8,
    not(canCreateFontOfMagicSpellSlot(featureResourcePool(3, 1), featureResourcePool(0, 0), 3, 2)),
    recordProjection(
      CharacterSheetFeatureResourcesFontOfMagicInsufficientPointsRejected,
      false,
      "Font of Magic Spell Slot creation requires enough unexpended Sorcery Points.",
      emptyFeatureResourceFacts
        .with("sorceryPointCapacity", 3)
        .with("sorceryPointExpended", 1),
      9,
    ),
  }

  action doShortRestPreservesUncannyUseState = all {
    qState.replayIndex == 9,
    recordProjection(
      CharacterSheetFeatureResourcesShortRestPreservesUncannyUseState,
      true,
      "none",
      shortRestFeatureResources(emptyFeatureResourceFacts
        .with("monkFocusExpended", 2)
        .with("uncannyUsedSinceLongRest", true)),
      10,
    ),
  }

  action doLongRestClearsUncannyUseState = all {
    qState.replayIndex == 10,
    recordProjection(
      CharacterSheetFeatureResourcesLongRestClearsUncannyUseState,
      true,
      "none",
      completeLongRestFeatureResources(emptyFeatureResourceFacts
        .with("monkFocusExpended", 2)
        .with("uncannyUsedSinceLongRest", true)),
      11,
    ),
  }

  action doUncannyMetabolismRecoversFocusAndHeals = all {
    qState.replayIndex == 11,
    recordProjection(
      CharacterSheetFeatureResourcesUncannyMetabolismRecoversFocusAndHeals,
      true,
      "none",
      useUncannyMetabolism(emptyFeatureResourceFacts
        .with("sourceCurrentHp", 8)
        .with("temporaryHitPoints", 3)
        .with("monkFocusExpended", 2), 15, 2, 4),
      12,
    ),
  }

  action doRejectUncannyMetabolismRepeatUse = all {
    qState.replayIndex == 12,
    not(canUseUncannyMetabolism(true)),
    recordProjection(
      CharacterSheetFeatureResourcesUncannyMetabolismRepeatUseRejected,
      false,
      "Uncanny Metabolism cannot be used again until a Long Rest.",
      emptyFeatureResourceFacts
        .with("sourceCurrentHp", 14)
        .with("temporaryHitPoints", 3)
        .with("monkFocusExpended", 0)
        .with("uncannyUsedSinceLongRest", true),
      13,
    ),
  }

  action doMetamagicBridgeUsesSharedPointPool = all {
    qState.replayIndex == 13,
    recordProjection(
      CharacterSheetFeatureResourcesMetamagicBridgeUsesSharedPointPool,
      true,
      "none",
      emptyFeatureResourceFacts
        .with("sorceryPointCapacity", 5)
        .with("sorceryPointExpended", 3)
        .with("metamagicKnownOptions", 2)
        .with("metamagicSharedResourceExpended", 3),
      14,
    ),
  }

  action step = any {
    doLayOnHandsRestoresHpAndRemovesPoisoned,
    doRejectLayOnHandsOverspend,
    doLongRestClearsLayOnHandsPool,
    doShortRestRecoversUseCountPools,
    doLongRestClearsPointPoolAndUseState,
    doFontOfMagicSlotToPoints,
    doRejectFontOfMagicAmbiguousSlotSource,
    doFontOfMagicPointsToSlot,
    doRejectFontOfMagicInsufficientPoints,
    doShortRestPreservesUncannyUseState,
    doLongRestClearsUncannyUseState,
    doUncannyMetabolismRecoversFocusAndHeals,
    doRejectUncannyMetabolismRepeatUse,
    doMetamagicBridgeUsesSharedPointPool,
  }
}
