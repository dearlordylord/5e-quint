// -*- mode: Bluespec; -*-

module battleRuntimeOrdinaryObjectAttackMbt {
  import battleRuntimeOrdinaryObjectAttack.* from "./battle-runtime-ordinary-object-attack"
  var qScenario: str
  var qValid: bool
  var qActionRemaining: bool
  var qNeedsAttackRoll: bool
  var qNeedsDamageRoll: bool
  var qHit: bool
  var qDamageEmitted: bool
  var qReplayIndex: int

  action record(
    scenario: str,
    result: OrdinaryObjectAttackProcedureResult,
    replayIndex: int
  ): bool = all {
    qScenario' = scenario,
    qValid' = result.valid,
    qActionRemaining' = result.actionRemaining,
    qNeedsAttackRoll' = result.needsAttackRoll,
    qNeedsDamageRoll' = result.needsDamageRoll,
    qHit' = result.hit,
    qDamageEmitted' = result.damageEmitted,
    qReplayIndex' = replayIndex,
  }

  action init = all {
    qScenario' = "init",
    qValid' = true,
    qActionRemaining' = true,
    qNeedsAttackRoll' = false,
    qNeedsDamageRoll' = false,
    qHit' = false,
    qDamageEmitted' = false,
    qReplayIndex' = 0,
  }

  action doRejectTotalCover = all {
    qReplayIndex == 0,
    record("total-cover-rejected", ordinaryObjectAttackProcedure(TotalObjectCover, false, 0, 0, 15, false), 1),
  }

  action doAdmitHalfCoverTarget = all {
    qReplayIndex == 1,
    record("half-cover-target-admitted", ordinaryObjectAttackProcedure(HalfObjectCover, false, 0, 0, 15, false), 2),
  }

  action doResolveHalfCoverMiss = all {
    qReplayIndex == 2,
    record("half-cover-miss", ordinaryObjectAttackProcedure(HalfObjectCover, true, 11, 16, 15, false), 3),
  }

  action doAdmitUncoveredTarget = all {
    qReplayIndex == 3,
    record("uncovered-target-admitted", ordinaryObjectAttackProcedure(NoObjectCover, false, 0, 0, 15, false), 4),
  }

  action doResolveUncoveredHitRoll = all {
    qReplayIndex == 4,
    record("uncovered-hit-awaits-damage", ordinaryObjectAttackProcedure(NoObjectCover, true, 13, 18, 15, false), 5),
  }

  action doApplyUncoveredHitDamage = all {
    qReplayIndex == 5,
    record("uncovered-hit-damaged", ordinaryObjectAttackProcedure(NoObjectCover, true, 13, 18, 15, true), 6),
  }

  action step = any {
    doRejectTotalCover,
    doAdmitHalfCoverTarget,
    doResolveHalfCoverMiss,
    doAdmitUncoveredTarget,
    doResolveUncoveredHitRoll,
    doApplyUncoveredHitDamage,
  }
}
