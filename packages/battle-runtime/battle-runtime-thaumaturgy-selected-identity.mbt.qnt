// -*- mode: Bluespec; -*-

module battleRuntimeThaumaturgySelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type ThaumaturgySelectedIdentityScenarioOutcome = | Init | Resolved


  var qCasterEffectCount: int
  var qActionAvailable: bool
  var qIntimidationRollMode: str
  var qWisdomIntimidationRollMode: str
  var qPerceptionRollMode: str
  var qScenarioOutcome: ThaumaturgySelectedIdentityScenarioOutcome
  var qProtocol: WitnessProtocol[WitnessHole]

  pure def scenarioOutcome: ThaumaturgySelectedIdentityScenarioOutcome = qScenarioOutcome

  pure def witnessProtocolForProjection(
    scenarioOutcome: ThaumaturgySelectedIdentityScenarioOutcome,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioOutcome == Init) witnessInit(WitnessProtocolHole)
    else witnessResolved(WitnessProtocolHole)

  action recordProjection(
    casterEffectCount: int,
    actionAvailable: bool,
    intimidationRollMode: str,
    wisdomIntimidationRollMode: str,
    perceptionRollMode: str,
    lastResult: ThaumaturgySelectedIdentityScenarioOutcome,
  ): bool = all {
    qCasterEffectCount' = casterEffectCount,
    qActionAvailable' = actionAvailable,
    qIntimidationRollMode' = intimidationRollMode,
    qWisdomIntimidationRollMode' = wisdomIntimidationRollMode,
    qPerceptionRollMode' = perceptionRollMode,
    qScenarioOutcome' = lastResult,
    qProtocol' = witnessProtocolForProjection(lastResult),
  }

  action init = recordProjection(0, true, "normal", "normal", "normal", Init)

  action doResolveThaumaturgyBoomingVoice = all {
    scenarioOutcome == Init,
    recordProjection(1, false, "advantage", "normal", "normal", Resolved),
  }

  action step = any {
    doResolveThaumaturgyBoomingVoice,
  }
}
