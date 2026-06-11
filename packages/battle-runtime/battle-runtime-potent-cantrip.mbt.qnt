// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.potent-cantrip
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.potent-cantrip

module battleRuntimePotentCantripMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type PotentCantripWitnessState = {
    qTargetHp: int,
    qActionResourcesRemaining: int,
    qTargetActiveEffectCount: int,
    qLightEmitterCount: int,
    qObjectDamageCount: int,
    qScenarioResult: str,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: PotentCantripWitnessState

  pure def qTargetHp: int = qState.qTargetHp
  pure def qActionResourcesRemaining: int = qState.qActionResourcesRemaining
  pure def qTargetActiveEffectCount: int = qState.qTargetActiveEffectCount
  pure def qLightEmitterCount: int = qState.qLightEmitterCount
  pure def qObjectDamageCount: int = qState.qObjectDamageCount
  pure def qLastResult: str = qState.qScenarioResult

  pure def selectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioResult: str,
    scenarioInvalidReason: str,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioResult == "init") witnessInit(WitnessProtocolHole)
    else if (scenarioInvalidReason == "invalidFill") witnessInvalid(WitnessProtocolHole, WInvalidFill)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)

  action recordProjection(
    targetHp: int,
    actionResourcesRemaining: int,
    targetActiveEffectCount: int,
    lightEmitterCount: int,
    objectDamageCount: int,
    lastResult: str,
  ): bool = all {
    qState' = {
      qTargetHp: targetHp,
      qActionResourcesRemaining: actionResourcesRemaining,
      qTargetActiveEffectCount: targetActiveEffectCount,
      qLightEmitterCount: lightEmitterCount,
      qObjectDamageCount: objectDamageCount,
      qScenarioResult: lastResult,
      protocol: selectedIdentityProtocolForProjection(Set(), lastResult, ""),
    },
  }
  action init = recordProjection(13, 1, 0, 0, 0, "init")

  action doAttackMissHalfDamage = all {
    qLastResult == "init",
    recordProjection(11, 0, 0, 0, 0, "attackMissHalfDamage"),
  }

  action doAttackMissNoAdditionalEffect = all {
    qLastResult == "init",
    recordProjection(11, 0, 0, 0, 0, "attackMissNoAdditionalEffect"),
  }

  action doAttackMissNoLightEmitter = all {
    qLastResult == "init",
    recordProjection(11, 0, 0, 0, 0, "attackMissNoLightEmitter"),
  }

  action doSaveSuccessHalfDamage = all {
    qLastResult == "init",
    recordProjection(11, 0, 0, 0, 0, "saveSuccessHalfDamage"),
  }

  action doSaveSuccessNoAdditionalEffect = all {
    qLastResult == "init",
    recordProjection(11, 0, 0, 0, 0, "saveSuccessNoAdditionalEffect"),
  }

  action doRejectObjectMissHalfDamage = all {
    qLastResult == "init",
    recordProjection(13, 0, 0, 0, 0, "rejectObjectMissHalfDamage"),
  }

  action step = any {
    doAttackMissHalfDamage,
    doAttackMissNoAdditionalEffect,
    doAttackMissNoLightEmitter,
    doSaveSuccessHalfDamage,
    doSaveSuccessNoAdditionalEffect,
    doRejectObjectMissHalfDamage,
  }
}
