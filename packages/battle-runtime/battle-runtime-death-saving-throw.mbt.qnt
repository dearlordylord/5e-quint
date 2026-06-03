// -*- mode: Bluespec; -*-

// Self-contained literal projection witness for the start-turn Death Saving Throw
// lifecycle. Asserts the SRD outcomes directly instead of importing the hit-point
// reducer, so the driver's import closure stays empty and its MBT trace generation
// stays fast (see scripts/check-mbt-driver-closure.cjs). The fixture target begins
// Unconscious at 0 Hit Points with 2 death-save successes and 1 failure; the facts
// below are that reducer's SRD result for each die result. If the death-save rule
// changes, update the literals here.
module battleRuntimeDeathSavingThrowMbt {
  // Only the start-turn Death Saving Throw hole is exercised by this witness.
  type Hole = | DeathSavingThrow

  var qCurrentTurnRole: str
  var qTargetHp: int
  var qTargetUnconscious: bool
  var qTargetStable: bool
  var qTargetDead: bool
  var qTargetDeathSuccesses: int
  var qTargetDeathFailures: int
  var qHoles: Set[Hole]
  var qLastResult: str
  var qLastInvalidReason: str

  pure val actorTurnRole: str = "actor"
  pure val targetTurnRole: str = "target"

  action init = all {
    qCurrentTurnRole' = actorTurnRole,
    qTargetHp' = 0,
    qTargetUnconscious' = true,
    qTargetStable' = false,
    qTargetDead' = false,
    qTargetDeathSuccesses' = 2,
    qTargetDeathFailures' = 1,
    qHoles' = Set(),
    qLastResult' = "init",
    qLastInvalidReason' = "",
  }

  action doDiscoverEndTurnDeathSavingThrow = all {
    qCurrentTurnRole == actorTurnRole,
    qHoles == Set(),
    qCurrentTurnRole' = qCurrentTurnRole,
    qTargetHp' = qTargetHp,
    qTargetUnconscious' = qTargetUnconscious,
    qTargetStable' = qTargetStable,
    qTargetDead' = qTargetDead,
    qTargetDeathSuccesses' = qTargetDeathSuccesses,
    qTargetDeathFailures' = qTargetDeathFailures,
    qHoles' = Set(DeathSavingThrow),
    qLastResult' = "needsHoles",
    qLastInvalidReason' = "",
  }

  // Natural 1 counts as two failures: 1 + 2 = 3 failures, so the target dies.
  action doFillDeathSavingThrowNaturalOne = all {
    qCurrentTurnRole == actorTurnRole,
    qHoles == Set(DeathSavingThrow),
    qCurrentTurnRole' = targetTurnRole,
    qTargetHp' = 0,
    qTargetUnconscious' = true,
    qTargetStable' = false,
    qTargetDead' = true,
    qTargetDeathSuccesses' = 2,
    qTargetDeathFailures' = 3,
    qHoles' = Set(),
    qLastResult' = "resolved",
    qLastInvalidReason' = "",
  }

  // A roll of 2-9 is one failure: failures 1 -> 2, target keeps rolling.
  action doFillDeathSavingThrowFailure = all {
    qCurrentTurnRole == actorTurnRole,
    qHoles == Set(DeathSavingThrow),
    qCurrentTurnRole' = targetTurnRole,
    qTargetHp' = 0,
    qTargetUnconscious' = true,
    qTargetStable' = false,
    qTargetDead' = false,
    qTargetDeathSuccesses' = 2,
    qTargetDeathFailures' = 2,
    qHoles' = Set(),
    qLastResult' = "resolved",
    qLastInvalidReason' = "",
  }

  // A roll of 10-19 is one success: successes 2 -> 3, target becomes Stable
  // and death saves reset.
  action doFillDeathSavingThrowSuccess = all {
    qCurrentTurnRole == actorTurnRole,
    qHoles == Set(DeathSavingThrow),
    qCurrentTurnRole' = targetTurnRole,
    qTargetHp' = 0,
    qTargetUnconscious' = true,
    qTargetStable' = true,
    qTargetDead' = false,
    qTargetDeathSuccesses' = 0,
    qTargetDeathFailures' = 0,
    qHoles' = Set(),
    qLastResult' = "resolved",
    qLastInvalidReason' = "",
  }

  // Natural 20 regains 1 Hit Point: the target is conscious and death saves reset.
  action doFillDeathSavingThrowNaturalTwenty = all {
    qCurrentTurnRole == actorTurnRole,
    qHoles == Set(DeathSavingThrow),
    qCurrentTurnRole' = targetTurnRole,
    qTargetHp' = 1,
    qTargetUnconscious' = false,
    qTargetStable' = false,
    qTargetDead' = false,
    qTargetDeathSuccesses' = 0,
    qTargetDeathFailures' = 0,
    qHoles' = Set(),
    qLastResult' = "resolved",
    qLastInvalidReason' = "",
  }

  action doRejectWrongActorEndTurnAfterResolved = all {
    qCurrentTurnRole == targetTurnRole,
    qHoles == Set(),
    qCurrentTurnRole' = qCurrentTurnRole,
    qTargetHp' = qTargetHp,
    qTargetUnconscious' = qTargetUnconscious,
    qTargetStable' = qTargetStable,
    qTargetDead' = qTargetDead,
    qTargetDeathSuccesses' = qTargetDeathSuccesses,
    qTargetDeathFailures' = qTargetDeathFailures,
    qHoles' = Set(),
    qLastResult' = "invalid",
    qLastInvalidReason' = "wrongActor",
  }

  action step = any {
    doDiscoverEndTurnDeathSavingThrow,
    doFillDeathSavingThrowNaturalOne,
    doFillDeathSavingThrowFailure,
    doFillDeathSavingThrowSuccess,
    doFillDeathSavingThrowNaturalTwenty,
    doRejectWrongActorEndTurnAfterResolved,
  }
}
