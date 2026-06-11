// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.enemy-zero-hit-point-temporary-hit-points
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.enemy-zero-hit-point-temporary-hit-points

module battleRuntimeDarkOnesBlessingMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | DarkOnesBlessing

  type WitnessState = {
    qWarlockTempHp: int,
    qTargetHp: int,
    qScenarioResult: str,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: WitnessState

  pure def qWarlockTempHp: int = qState.qWarlockTempHp
  pure def qTargetHp: int = qState.qTargetHp
  pure def qScenarioResult: str = qState.qScenarioResult


  action recordProjection(
    warlockTempHp: int,
    targetHp: int,
    scenarioResult: str,
    protocol: WitnessProtocol[WitnessHole],
  ): bool = all {
    qState' = {
      qWarlockTempHp: warlockTempHp,
      qTargetHp: targetHp,
      qScenarioResult: scenarioResult,
      protocol: protocol,
    },
  }

  action init = recordProjection(0, 5, "init",
    witnessInit(DarkOnesBlessing),
  )

  action doSelfKill = all {
    qScenarioResult == "init",
    recordProjection(6, 0, "selfKill",
    witnessResolved(DarkOnesBlessing),
  ),
  }

  action doNearbyOtherKill = all {
    qScenarioResult == "init",
    recordProjection(6, 0, "nearbyOtherKill",
    witnessResolved(DarkOnesBlessing),
  ),
  }

  action doSameSideOtherKill = all {
    qScenarioResult == "init",
    recordProjection(6, 0, "sameSideOtherKill",
    witnessResolved(DarkOnesBlessing),
  ),
  }

  action doRejectOutOfRangeOtherKill = all {
    qScenarioResult == "init",
    recordProjection(0, 0, "outOfRangeRejected",
    witnessResolved(DarkOnesBlessing),
  ),
  }

  action doRejectNonEnemyKill = all {
    qScenarioResult == "init",
    recordProjection(0, 0, "nonEnemyRejected",
    witnessResolved(DarkOnesBlessing),
  ),
  }

  action doMinimumTemporaryHitPoints = all {
    qScenarioResult == "init",
    recordProjection(1, 0, "minimumTemporaryHitPoints",
    witnessResolved(DarkOnesBlessing),
  ),
  }

  action doTemporaryHitPointReplacement = all {
    qScenarioResult == "init",
    recordProjection(8, 0, "temporaryHitPointReplacement",
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
