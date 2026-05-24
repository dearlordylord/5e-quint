// -*- mode: Bluespec; -*-

module battleRuntimeThaumaturgySelectedIdentityMbt {
  var qCasterEffectCount: int
  var qActionAvailable: bool
  var qIntimidationRollMode: str
  var qWisdomIntimidationRollMode: str
  var qPerceptionRollMode: str
  var qLastResult: str

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
    qLastResult' = lastResult,
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
