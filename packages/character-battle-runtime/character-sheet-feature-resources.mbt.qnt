// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner SHEET.FEATURE_RESOURCES.TRANSITIONS

module characterSheetFeatureResourcesMbt {
  import hitPointDamage.* from "../shared-algebras/proofs/rule-core/hit-point-damage"
  import hitPointRecovery.* from "../shared-algebras/proofs/rule-core/hit-point-recovery"
  import zeroHitPointLifecycle.* from "../shared-algebras/proofs/rule-core/zero-hit-point-lifecycle"

  var qLastResult: str
  var qAccepted: bool
  var qMessage: str
  var qSourceCurrentHp: int
  var qTargetCurrentHp: int
  var qTemporaryHitPoints: int
  var qTargetPoisoned: bool
  var qLayOnHandsCapacity: int
  var qLayOnHandsExpended: int
  var qDruidWildShapeExpended: int
  var qMonkFocusExpended: int
  var qSorceryPointCapacity: int
  var qSorceryPointExpended: int
  var qOrdinaryLevel2Expended: int
  var qCreatedLevel3Capacity: int
  var qCreatedLevel3Expended: int
  var qUncannyUsedSinceLongRest: bool
  var qMetamagicKnownOptions: int
  var qMetamagicSharedResourceExpended: int
  var qReplayIndex: int

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

  type RecoveredHitPoints = {
    currentHp: int,
    temporaryHitPoints: int,
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

  pure def applySheetHitPointRecovery(currentHp: int, hitPointMaximum: int, temporaryHitPoints: int, rawHealing: int): RecoveredHitPoints = {
    val healed = applyHitPointHealing({
      kind: PlayerCharacter,
      hitPoints: currentHp,
      hitPointMaximum: hitPointMaximum,
      temporaryHitPoints: temporaryHitPoints,
      dead: false,
      unconscious: false,
    }, resetDeathSavingThrowLifecycle, NoPositiveHitPointUnconsciousRecovery, rawHealing)
    {
      currentHp: healed.vitals.hitPoints,
      temporaryHitPoints: healed.vitals.temporaryHitPoints,
    }
  }

  pure def recoverTargetHitPoints(sheet: SheetFeatureResourceFacts, hitPointMaximum: int, rawHealing: int): SheetFeatureResourceFacts = {
    val recovered = applySheetHitPointRecovery(sheet.targetCurrentHp, hitPointMaximum, 0, rawHealing)
    sheet.with("targetCurrentHp", recovered.currentHp)
  }

  pure def recoverSourceHitPoints(sheet: SheetFeatureResourceFacts, hitPointMaximum: int, rawHealing: int): SheetFeatureResourceFacts = {
    val recovered = applySheetHitPointRecovery(sheet.sourceCurrentHp, hitPointMaximum, sheet.temporaryHitPoints, rawHealing)
    sheet
      .with("sourceCurrentHp", recovered.currentHp)
      .with("temporaryHitPoints", recovered.temporaryHitPoints)
  }

  pure def completeLongRestFeatureResources(sheet: SheetFeatureResourceFacts): SheetFeatureResourceFacts =
    sheet
      .with("layOnHandsExpended", 0)
      .with("druidWildShapeExpended", 0)
      .with("monkFocusExpended", 0)
      .with("sorceryPointExpended", 0)
      .with("createdLevel3Capacity", 0)
      .with("createdLevel3Expended", 0)
      .with("uncannyUsedSinceLongRest", false)

  pure def shortRestFeatureResources(sheet: SheetFeatureResourceFacts): SheetFeatureResourceFacts =
    sheet
      .with("druidWildShapeExpended", if (sheet.druidWildShapeExpended > 0) sheet.druidWildShapeExpended - 1 else 0)
      .with("monkFocusExpended", 0)

  pure def useUncannyMetabolism(sheet: SheetFeatureResourceFacts, maximumHp: int, monkLevel: int, martialArtsRoll: int): SheetFeatureResourceFacts =
    recoverSourceHitPoints(sheet, maximumHp, monkLevel + martialArtsRoll)
      .with("monkFocusExpended", 0)
      .with("uncannyUsedSinceLongRest", true)

  action recordProjection(
    lastResult: str,
    accepted: bool,
    message: str,
    sheet: SheetFeatureResourceFacts,
    replayIndex: int,
  ): bool = all {
    qLastResult' = lastResult,
    qAccepted' = accepted,
    qMessage' = message,
    qSourceCurrentHp' = sheet.sourceCurrentHp,
    qTargetCurrentHp' = sheet.targetCurrentHp,
    qTemporaryHitPoints' = sheet.temporaryHitPoints,
    qTargetPoisoned' = sheet.targetPoisoned,
    qLayOnHandsCapacity' = sheet.layOnHandsCapacity,
    qLayOnHandsExpended' = sheet.layOnHandsExpended,
    qDruidWildShapeExpended' = sheet.druidWildShapeExpended,
    qMonkFocusExpended' = sheet.monkFocusExpended,
    qSorceryPointCapacity' = sheet.sorceryPointCapacity,
    qSorceryPointExpended' = sheet.sorceryPointExpended,
    qOrdinaryLevel2Expended' = sheet.ordinaryLevel2Expended,
    qCreatedLevel3Capacity' = sheet.createdLevel3Capacity,
    qCreatedLevel3Expended' = sheet.createdLevel3Expended,
    qUncannyUsedSinceLongRest' = sheet.uncannyUsedSinceLongRest,
    qMetamagicKnownOptions' = sheet.metamagicKnownOptions,
    qMetamagicSharedResourceExpended' = sheet.metamagicSharedResourceExpended,
    qReplayIndex' = replayIndex,
  }

  action init =
    recordProjection("init", false, "none", emptyFeatureResourceFacts, 0)

  action doLayOnHandsRestoresHpAndRemovesPoisoned = all {
    qReplayIndex == 0,
    recordProjection(
      "lay-on-hands-restores-hp-and-removes-poisoned",
      true,
      "none",
      recoverTargetHitPoints(emptyFeatureResourceFacts
        .with("sourceCurrentHp", 12)
        .with("targetCurrentHp", 3)
        .with("targetPoisoned", false)
        .with("layOnHandsCapacity", 10)
        .with("layOnHandsExpended", 7), 10, 2),
      1,
    ),
  }

  action doRejectLayOnHandsOverspend = all {
    qReplayIndex == 1,
    recordProjection(
      "lay-on-hands-overspend-rejected",
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
    qReplayIndex == 2,
    recordProjection(
      "long-rest-clears-lay-on-hands-pool",
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
    qReplayIndex == 3,
    recordProjection(
      "short-rest-recovers-use-count-pools",
      true,
      "none",
      shortRestFeatureResources(emptyFeatureResourceFacts
        .with("druidWildShapeExpended", 2)
        .with("monkFocusExpended", 2)),
      4,
    ),
  }

  action doLongRestClearsPointPoolAndUseState = all {
    qReplayIndex == 4,
    recordProjection(
      "long-rest-clears-point-pool-and-use-state",
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
    qReplayIndex == 5,
    recordProjection(
      "font-of-magic-slot-to-points",
      true,
      "none",
      emptyFeatureResourceFacts
        .with("sorceryPointCapacity", 3)
        .with("sorceryPointExpended", 1)
        .with("ordinaryLevel2Expended", 2),
      6,
    ),
  }

  action doRejectFontOfMagicAmbiguousSlotSource = all {
    qReplayIndex == 6,
    recordProjection(
      "font-of-magic-ambiguous-slot-source-rejected",
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
    qReplayIndex == 7,
    recordProjection(
      "font-of-magic-points-to-slot",
      true,
      "none",
      emptyFeatureResourceFacts
        .with("sorceryPointCapacity", 5)
        .with("sorceryPointExpended", 5)
        .with("createdLevel3Capacity", 1)
        .with("createdLevel3Expended", 0),
      8,
    ),
  }

  action doRejectFontOfMagicInsufficientPoints = all {
    qReplayIndex == 8,
    recordProjection(
      "font-of-magic-insufficient-points-rejected",
      false,
      "Font of Magic Spell Slot creation requires enough unexpended Sorcery Points.",
      emptyFeatureResourceFacts
        .with("sorceryPointCapacity", 3)
        .with("sorceryPointExpended", 1),
      9,
    ),
  }

  action doShortRestPreservesUncannyUseState = all {
    qReplayIndex == 9,
    recordProjection(
      "short-rest-preserves-uncanny-use-state",
      true,
      "none",
      shortRestFeatureResources(emptyFeatureResourceFacts
        .with("monkFocusExpended", 2)
        .with("uncannyUsedSinceLongRest", true)),
      10,
    ),
  }

  action doLongRestClearsUncannyUseState = all {
    qReplayIndex == 10,
    recordProjection(
      "long-rest-clears-uncanny-use-state",
      true,
      "none",
      completeLongRestFeatureResources(emptyFeatureResourceFacts
        .with("monkFocusExpended", 2)
        .with("uncannyUsedSinceLongRest", true)),
      11,
    ),
  }

  action doUncannyMetabolismRecoversFocusAndHeals = all {
    qReplayIndex == 11,
    recordProjection(
      "uncanny-metabolism-recovers-focus-and-heals",
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
    qReplayIndex == 12,
    recordProjection(
      "uncanny-metabolism-repeat-use-rejected",
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
    qReplayIndex == 13,
    recordProjection(
      "metamagic-bridge-uses-shared-point-pool",
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
