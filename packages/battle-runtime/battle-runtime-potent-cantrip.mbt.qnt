// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.potent-cantrip
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.potent-cantrip

module battleRuntimePotentCantripMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"
  import unitFeaturePotentCantripCore.* from "../shared-algebras/proofs/rule-core/unit-feature-potent-cantrip-core"

  type WitnessHole = | WitnessProtocolHole

  type PotentCantripScenarioOutcome = | Init | AttackMissHalfDamage | AttackMissNoAdditionalEffect | AttackMissNoLightEmitter | SaveSuccessHalfDamage | SaveSuccessNoAdditionalEffect | RejectObjectMissHalfDamage


  type PotentCantripWitnessState = {
    qTargetHp: int,
    qActionResourcesRemaining: int,
    qTargetActiveEffectCount: int,
    qLightEmitterCount: int,
    qObjectDamageCount: int,
    qScenarioOutcome: PotentCantripScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: PotentCantripWitnessState

  pure def qTargetHp: int = qState.qTargetHp
  pure def qActionResourcesRemaining: int = qState.qActionResourcesRemaining
  pure def qTargetActiveEffectCount: int = qState.qTargetActiveEffectCount
  pure def qLightEmitterCount: int = qState.qLightEmitterCount
  pure def qObjectDamageCount: int = qState.qObjectDamageCount
  pure def scenarioOutcome: PotentCantripScenarioOutcome = qState.qScenarioOutcome
  pure val witnessedCantripDamage: int =
    potentCantripDamage({
      targetIsCreature: true,
      isCantrip: true,
      trigger: MissedCantripAttackRoll,
      normalDamage: 5,
    })

  pure def selectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioOutcome: PotentCantripScenarioOutcome,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioOutcome == Init) witnessInit(WitnessProtocolHole)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)

  action recordProjection(
    targetHp: int,
    actionResourcesRemaining: int,
    targetActiveEffectCount: int,
    lightEmitterCount: int,
    objectDamageCount: int,
    lastResult: PotentCantripScenarioOutcome,
  ): bool = all {
    qState' = {
      qTargetHp: targetHp,
      qActionResourcesRemaining: actionResourcesRemaining,
      qTargetActiveEffectCount: targetActiveEffectCount,
      qLightEmitterCount: lightEmitterCount,
      qObjectDamageCount: objectDamageCount,
      qScenarioOutcome: lastResult,
      protocol: selectedIdentityProtocolForProjection(Set(), lastResult),
    },
  }
  action init = recordProjection(13, 1, 0, 0, 0, Init)

  action doAttackMissHalfDamage = all {
    scenarioOutcome == Init,
    recordProjection(13 - witnessedCantripDamage, 0, 0, 0, 0, AttackMissHalfDamage),
  }

  action doAttackMissNoAdditionalEffect = all {
    scenarioOutcome == Init,
    recordProjection(11, 0, 0, 0, 0, AttackMissNoAdditionalEffect),
  }

  action doAttackMissNoLightEmitter = all {
    scenarioOutcome == Init,
    recordProjection(11, 0, 0, 0, 0, AttackMissNoLightEmitter),
  }

  action doSaveSuccessHalfDamage = all {
    scenarioOutcome == Init,
    recordProjection(13 - witnessedCantripDamage, 0, 0, 0, 0, SaveSuccessHalfDamage),
  }

  action doSaveSuccessNoAdditionalEffect = all {
    scenarioOutcome == Init,
    recordProjection(11, 0, 0, 0, 0, SaveSuccessNoAdditionalEffect),
  }

  action doRejectObjectMissHalfDamage = all {
    scenarioOutcome == Init,
    recordProjection(13, 0, 0, 0, 0, RejectObjectMissHalfDamage),
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
