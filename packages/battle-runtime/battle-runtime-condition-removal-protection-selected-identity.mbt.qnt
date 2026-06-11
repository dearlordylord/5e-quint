// -*- mode: Bluespec; -*-

module battleRuntimeConditionRemovalProtectionSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | ConditionRemovalProtection

  type WitnessState = {
    qTargetParalyzed: bool,
    qTargetPoisoned: bool,
    qTargetEffectCount: int,
    qCasterConcentrating: bool,
    qTargetHasPoisonResistance: bool,
    qTargetHasPoisonSaveAdvantage: bool,
    qSecondLevelSlotsExpended: int,
    qActionAvailable: bool,
    qBonusActionAvailable: bool,
    qScenarioResult: str,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: WitnessState

  pure def qTargetParalyzed: bool = qState.qTargetParalyzed
  pure def qTargetPoisoned: bool = qState.qTargetPoisoned
  pure def qTargetEffectCount: int = qState.qTargetEffectCount
  pure def qCasterConcentrating: bool = qState.qCasterConcentrating
  pure def qTargetHasPoisonResistance: bool = qState.qTargetHasPoisonResistance
  pure def qTargetHasPoisonSaveAdvantage: bool = qState.qTargetHasPoisonSaveAdvantage
  pure def qSecondLevelSlotsExpended: int = qState.qSecondLevelSlotsExpended
  pure def qActionAvailable: bool = qState.qActionAvailable
  pure def qBonusActionAvailable: bool = qState.qBonusActionAvailable
  pure def qScenarioResult: str = qState.qScenarioResult


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
    scenarioResult: str,
    protocol: WitnessProtocol[WitnessHole],
  ): bool = all {
    qState' = {
      qTargetParalyzed: targetParalyzed,
      qTargetPoisoned: targetPoisoned,
      qTargetEffectCount: targetEffectCount,
      qCasterConcentrating: casterConcentrating,
      qTargetHasPoisonResistance: targetHasPoisonResistance,
      qTargetHasPoisonSaveAdvantage: targetHasPoisonSaveAdvantage,
      qSecondLevelSlotsExpended: secondLevelSlotsExpended,
      qActionAvailable: actionAvailable,
      qBonusActionAvailable: bonusActionAvailable,
      qScenarioResult: scenarioResult,
      protocol: protocol,
    },
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
    witnessInit(ConditionRemovalProtection),
  )

  action doResolveLesserRestorationChoice = all {
    qScenarioResult == "init",
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
    witnessResolved(ConditionRemovalProtection),
  ),
  }

  action doResolveLesserRestorationConcentrationCleanup = all {
    qScenarioResult == "init",
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
    witnessResolved(ConditionRemovalProtection),
  ),
  }

  action doResolveProtectionFromPoison = all {
    qScenarioResult == "init",
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
    witnessResolved(ConditionRemovalProtection),
  ),
  }

  action step = any {
    doResolveLesserRestorationChoice,
    doResolveLesserRestorationConcentrationCleanup,
    doResolveProtectionFromPoison,
  }
}
