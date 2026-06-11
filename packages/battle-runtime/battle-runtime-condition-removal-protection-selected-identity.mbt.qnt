// -*- mode: Bluespec; -*-

module battleRuntimeConditionRemovalProtectionSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | ConditionRemovalProtection

  type ConditionRemovalProtectionSelectedIdentityScenarioOutcome = | Init | LesserRestorationChoice | LesserRestorationConcentration | ProtectionFromPoison


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
    qScenarioOutcome: ConditionRemovalProtectionSelectedIdentityScenarioOutcome,
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
  pure def qScenarioOutcome: ConditionRemovalProtectionSelectedIdentityScenarioOutcome = qState.qScenarioOutcome


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
    scenarioOutcome: ConditionRemovalProtectionSelectedIdentityScenarioOutcome,
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
      qScenarioOutcome: scenarioOutcome,
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
    Init,
    witnessInit(ConditionRemovalProtection),
  )

  action doResolveLesserRestorationChoice = all {
    qScenarioOutcome == Init,
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
      LesserRestorationChoice,
    witnessResolved(ConditionRemovalProtection),
  ),
  }

  action doResolveLesserRestorationConcentrationCleanup = all {
    qScenarioOutcome == Init,
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
      LesserRestorationConcentration,
    witnessResolved(ConditionRemovalProtection),
  ),
  }

  action doResolveProtectionFromPoison = all {
    qScenarioOutcome == Init,
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
      ProtectionFromPoison,
    witnessResolved(ConditionRemovalProtection),
  ),
  }

  action step = any {
    doResolveLesserRestorationChoice,
    doResolveLesserRestorationConcentrationCleanup,
    doResolveProtectionFromPoison,
  }
}
