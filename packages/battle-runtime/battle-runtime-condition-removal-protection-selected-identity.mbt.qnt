// -*- mode: Bluespec; -*-

module battleRuntimeConditionRemovalProtectionSelectedIdentityMbt {
  var qTargetParalyzed: bool
  var qTargetPoisoned: bool
  var qTargetEffectCount: int
  var qCasterConcentrating: bool
  var qTargetHasPoisonResistance: bool
  var qTargetHasPoisonSaveAdvantage: bool
  var qSecondLevelSlotsExpended: int
  var qActionAvailable: bool
  var qBonusActionAvailable: bool
  var qLastResult: str

  action recordProjection(
    targetParalyzed: bool,
    targetPoisoned: bool,
    targetEffectCount: int,
    casterConcentrating: bool,
    targetHasPoisonResistance: bool,
    targetHasPoisonSaveAdvantage: bool,
    secondLevelSlotsExpended: int,
    actionAvailable: bool,
    bonusActionAvailable: bool,
    lastResult: str,
  ): bool = all {
    qTargetParalyzed' = targetParalyzed,
    qTargetPoisoned' = targetPoisoned,
    qTargetEffectCount' = targetEffectCount,
    qCasterConcentrating' = casterConcentrating,
    qTargetHasPoisonResistance' = targetHasPoisonResistance,
    qTargetHasPoisonSaveAdvantage' = targetHasPoisonSaveAdvantage,
    qSecondLevelSlotsExpended' = secondLevelSlotsExpended,
    qActionAvailable' = actionAvailable,
    qBonusActionAvailable' = bonusActionAvailable,
    qLastResult' = lastResult,
  }

  action init = recordProjection(
    false,
    false,
    0,
    false,
    false,
    false,
    0,
    true,
    true,
    "init",
  )

  action doResolveLesserRestorationChoice = all {
    qLastResult == "init",
    recordProjection(
      false,
      true,
      1,
      false,
      false,
      false,
      1,
      true,
      false,
      "lesserRestorationChoice",
    ),
  }

  action doResolveLesserRestorationConcentrationCleanup = all {
    qLastResult == "init",
    recordProjection(
      false,
      false,
      0,
      false,
      false,
      false,
      1,
      true,
      false,
      "lesserRestorationConcentration",
    ),
  }

  action doResolveProtectionFromPoison = all {
    qLastResult == "init",
    recordProjection(
      false,
      false,
      2,
      false,
      true,
      true,
      1,
      false,
      true,
      "protectionFromPoison",
    ),
  }

  action step = any {
    doResolveLesserRestorationChoice,
    doResolveLesserRestorationConcentrationCleanup,
    doResolveProtectionFromPoison,
  }
}
