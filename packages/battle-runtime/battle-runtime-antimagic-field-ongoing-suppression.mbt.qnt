// -*- mode: Bluespec; -*-

module battleRuntimeAntimagicFieldOngoingSuppressionMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | AntimagicOngoingSuppression

  type AntimagicFieldOngoingSuppressionScenarioOutcome = | Init | SuppressedOrdinarySpell | SuppressedArtifactSpell | Restored


  type WitnessState = {
    qActionAvailable: bool,
    qSpellAvailable: bool,
    qOngoingSpellEffectActive: bool,
    qSuppressionActive: bool,
    qSuppressedEffectRefCount: int,
    qOngoingSpellSuppressed: bool,
    qAntimagicCasterConcentrating: bool,
    qScenarioOutcome: AntimagicFieldOngoingSuppressionScenarioOutcome,
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
  pure def qScenarioOutcome: AntimagicFieldOngoingSuppressionScenarioOutcome = qState.qScenarioOutcome


  action recordAntimagicFieldState(
    actionAvailable: bool,
    spellAvailable: bool,
    ongoingSpellEffectActive: bool,
    suppressionActive: bool,
    suppressedEffectRefCount: int,
    ongoingSpellSuppressed: bool,
    antimagicCasterConcentrating: bool,
    scenarioOutcome: AntimagicFieldOngoingSuppressionScenarioOutcome,
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
      qScenarioOutcome: scenarioOutcome,
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
      Init,
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
      SuppressedOrdinarySpell,
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
      SuppressedArtifactSpell,
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
      Restored,
    witnessResolved(AntimagicOngoingSuppression),
  ),
  }

  action step = any {
    doSuppressOrdinarySpell,
    doSuppressArtifactSpell,
    doBreakAntimagicConcentration,
  }
}
