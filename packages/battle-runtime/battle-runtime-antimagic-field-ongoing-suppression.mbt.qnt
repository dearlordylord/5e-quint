// -*- mode: Bluespec; -*-

module battleRuntimeAntimagicFieldOngoingSuppressionMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | AntimagicOngoingSuppression

  type WitnessState = {
    qActionAvailable: bool,
    qSpellAvailable: bool,
    qOngoingSpellEffectActive: bool,
    qSuppressionActive: bool,
    qSuppressedEffectRefCount: int,
    qOngoingSpellSuppressed: bool,
    qAntimagicCasterConcentrating: bool,
    qScenarioResult: str,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: WitnessState

  pure def qActionAvailable: bool = qState.qActionAvailable
  pure def qSpellAvailable: bool = qState.qSpellAvailable
  pure def qOngoingSpellEffectActive: bool = qState.qOngoingSpellEffectActive
  pure def qSuppressionActive: bool = qState.qSuppressionActive
  pure def qSuppressedEffectRefCount: int = qState.qSuppressedEffectRefCount
  pure def qOngoingSpellSuppressed: bool = qState.qOngoingSpellSuppressed
  pure def qAntimagicCasterConcentrating: bool = qState.qAntimagicCasterConcentrating
  pure def qScenarioResult: str = qState.qScenarioResult


  action recordAntimagicFieldState(
    actionAvailable: bool,
    spellAvailable: bool,
    ongoingSpellEffectActive: bool,
    suppressionActive: bool,
    suppressedEffectRefCount: int,
    ongoingSpellSuppressed: bool,
    antimagicCasterConcentrating: bool,
    scenarioResult: str,
    protocol: WitnessProtocol[WitnessHole],
  ): bool = all {
    qState' = {
      qActionAvailable: actionAvailable,
      qSpellAvailable: spellAvailable,
      qOngoingSpellEffectActive: ongoingSpellEffectActive,
      qSuppressionActive: suppressionActive,
      qSuppressedEffectRefCount: suppressedEffectRefCount,
      qOngoingSpellSuppressed: ongoingSpellSuppressed,
      qAntimagicCasterConcentrating: antimagicCasterConcentrating,
      qScenarioResult: scenarioResult,
      protocol: protocol,
    },
  }

  action init = all {
    recordAntimagicFieldState(
      true,
      true,
      true,
      false,
      0,
      false,
      false,
      "init",
    witnessInit(AntimagicOngoingSuppression),
  ),
  }

  action doSuppressOrdinarySpell = all {
    qActionAvailable,
    qSpellAvailable,
    qOngoingSpellEffectActive,
    not(qSuppressionActive),
    recordAntimagicFieldState(
      false,
      false,
      true,
      true,
      1,
      true,
      true,
      "suppressedOrdinarySpell",
    witnessResolved(AntimagicOngoingSuppression),
  ),
  }

  action doSuppressArtifactSpell = all {
    qActionAvailable,
    qSpellAvailable,
    qOngoingSpellEffectActive,
    not(qSuppressionActive),
    recordAntimagicFieldState(
      false,
      false,
      true,
      true,
      0,
      false,
      true,
      "suppressedArtifactSpell",
    witnessResolved(AntimagicOngoingSuppression),
  ),
  }

  action doBreakAntimagicConcentration = all {
    qSuppressionActive,
    qAntimagicCasterConcentrating,
    recordAntimagicFieldState(
      qActionAvailable,
      qSpellAvailable,
      true,
      false,
      0,
      false,
      false,
      "restored",
    witnessResolved(AntimagicOngoingSuppression),
  ),
  }

  action step = any {
    doSuppressOrdinarySpell,
    doSuppressArtifactSpell,
    doBreakAntimagicConcentration,
  }
}
