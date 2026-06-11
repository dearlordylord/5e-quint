// -*- mode: Bluespec; -*-

module battleRuntimeThaumaturgySelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  var qCasterEffectCount: int
  var qActionAvailable: bool
  var qIntimidationRollMode: str
  var qWisdomIntimidationRollMode: str
  var qPerceptionRollMode: str
  var qScenarioResult: str
  var qProtocol: WitnessProtocol[WitnessHole]

  pure def qLastResult: str = qScenarioResult

  pure def witnessProtocolForProjection(
    scenarioResult: str,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioResult == "init") witnessInit(WitnessProtocolHole)
    else witnessResolved(WitnessProtocolHole)

  action recordProjection(
    casterEffectCount: int,
    actionAvailable: bool,
    intimidationRollMode: str,
    wisdomIntimidationRollMode: str,
    perceptionRollMode: str,
    lastResult: str,
  ): bool = all {
    qCasterEffectCount' = casterEffectCount,
    qActionAvailable' = actionAvailable,
    qIntimidationRollMode' = intimidationRollMode,
    qWisdomIntimidationRollMode' = wisdomIntimidationRollMode,
    qPerceptionRollMode' = perceptionRollMode,
    qScenarioResult' = lastResult,
    qProtocol' = witnessProtocolForProjection(lastResult),
  }

  action init = recordProjection(0, true, "normal", "normal", "normal", "init")

  action doResolveThaumaturgyBoomingVoice = all {
    qLastResult == "init",
    recordProjection(1, false, "advantage", "normal", "normal", "resolved"),
  }

  action step = any {
    doResolveThaumaturgyBoomingVoice,
  }
}
