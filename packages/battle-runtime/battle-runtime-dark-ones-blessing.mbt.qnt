// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.enemy-zero-hit-point-temporary-hit-points
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.enemy-zero-hit-point-temporary-hit-points

module battleRuntimeDarkOnesBlessingMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | DarkOnesBlessing

  type DarkOnesBlessingScenarioOutcome = | Init | SelfKill | NearbyOtherKill | SameSideOtherKill | OutOfRangeRejected | NonEnemyRejected | MinimumTemporaryHitPoints | TemporaryHitPointReplacement


  type WitnessState = {
    qWarlockTempHp: int,
    qTargetHp: int,
    qScenarioOutcome: DarkOnesBlessingScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: WitnessState

  pure def qWarlockTempHp: int = qState.qWarlockTempHp
  pure def qTargetHp: int = qState.qTargetHp
  pure def qScenarioOutcome: DarkOnesBlessingScenarioOutcome = qState.qScenarioOutcome


  action recordProjection(
    warlockTempHp: int,
    targetHp: int,
    scenarioOutcome: DarkOnesBlessingScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  ): bool = all {
    qState' = {
      qWarlockTempHp: warlockTempHp,
      qTargetHp: targetHp,
      qScenarioOutcome: scenarioOutcome,
      protocol: protocol,
    },
  }

  action init = recordProjection(0, 5, Init,
    witnessInit(DarkOnesBlessing),
  )

  action doSelfKill = all {
    qScenarioOutcome == Init,
    recordProjection(6, 0, SelfKill,
    witnessResolved(DarkOnesBlessing),
  ),
  }

  action doNearbyOtherKill = all {
    qScenarioOutcome == Init,
    recordProjection(6, 0, NearbyOtherKill,
    witnessResolved(DarkOnesBlessing),
  ),
  }

  action doSameSideOtherKill = all {
    qScenarioOutcome == Init,
    recordProjection(6, 0, SameSideOtherKill,
    witnessResolved(DarkOnesBlessing),
  ),
  }

  action doRejectOutOfRangeOtherKill = all {
    qScenarioOutcome == Init,
    recordProjection(0, 0, OutOfRangeRejected,
    witnessResolved(DarkOnesBlessing),
  ),
  }

  action doRejectNonEnemyKill = all {
    qScenarioOutcome == Init,
    recordProjection(0, 0, NonEnemyRejected,
    witnessResolved(DarkOnesBlessing),
  ),
  }

  action doMinimumTemporaryHitPoints = all {
    qScenarioOutcome == Init,
    recordProjection(1, 0, MinimumTemporaryHitPoints,
    witnessResolved(DarkOnesBlessing),
  ),
  }

  action doTemporaryHitPointReplacement = all {
    qScenarioOutcome == Init,
    recordProjection(8, 0, TemporaryHitPointReplacement,
    witnessResolved(DarkOnesBlessing),
  ),
  }

  action step = any {
    doSelfKill,
    doNearbyOtherKill,
    doSameSideOtherKill,
    doRejectOutOfRangeOtherKill,
    doRejectNonEnemyKill,
    doMinimumTemporaryHitPoints,
    doTemporaryHitPointReplacement,
  }
}
