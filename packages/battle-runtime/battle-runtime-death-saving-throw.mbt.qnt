// -*- mode: Bluespec; -*-

module battleRuntimeDeathSavingThrowMbt {
  import battleRuntime.* from "./battle-runtime"
  import battleRuntimeModel.* from "./battle-runtime-model"

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

  pure val initialDeathSavingThrowTarget: Combatant = {
    ...initialState.fighter,
    hp: 0,
    unconscious: true,
    stable: false,
    deathSuccesses: 2,
    deathFailures: 1,
    lifecycle: UsesDeathSavingThrows,
  }

  pure def deathSavingThrowTargetAfter(roll: int): Combatant =
    applyStartTurnDeathSave(initialDeathSavingThrowTarget, roll)

  pure def targetDeadAfter(roll: int): bool =
    deathSavingThrowTargetAfter(roll).deathFailures >= 3

  action init = all {
    qCurrentTurnRole' = actorTurnRole,
    qTargetHp' = initialDeathSavingThrowTarget.hp,
    qTargetUnconscious' = initialDeathSavingThrowTarget.unconscious,
    qTargetStable' = initialDeathSavingThrowTarget.stable,
    qTargetDead' = initialDeathSavingThrowTarget.deathFailures >= 3,
    qTargetDeathSuccesses' = initialDeathSavingThrowTarget.deathSuccesses,
    qTargetDeathFailures' = initialDeathSavingThrowTarget.deathFailures,
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

  action doFillDeathSavingThrowNaturalOne = all {
    qCurrentTurnRole == actorTurnRole,
    qHoles == Set(DeathSavingThrow),
    qCurrentTurnRole' = targetTurnRole,
    qTargetHp' = deathSavingThrowTargetAfter(1).hp,
    qTargetUnconscious' = deathSavingThrowTargetAfter(1).unconscious,
    qTargetStable' = deathSavingThrowTargetAfter(1).stable,
    qTargetDead' = targetDeadAfter(1),
    qTargetDeathSuccesses' = deathSavingThrowTargetAfter(1).deathSuccesses,
    qTargetDeathFailures' = deathSavingThrowTargetAfter(1).deathFailures,
    qHoles' = Set(),
    qLastResult' = "resolved",
    qLastInvalidReason' = "",
  }

  action doFillDeathSavingThrowFailure = all {
    qCurrentTurnRole == actorTurnRole,
    qHoles == Set(DeathSavingThrow),
    qCurrentTurnRole' = targetTurnRole,
    qTargetHp' = deathSavingThrowTargetAfter(5).hp,
    qTargetUnconscious' = deathSavingThrowTargetAfter(5).unconscious,
    qTargetStable' = deathSavingThrowTargetAfter(5).stable,
    qTargetDead' = targetDeadAfter(5),
    qTargetDeathSuccesses' = deathSavingThrowTargetAfter(5).deathSuccesses,
    qTargetDeathFailures' = deathSavingThrowTargetAfter(5).deathFailures,
    qHoles' = Set(),
    qLastResult' = "resolved",
    qLastInvalidReason' = "",
  }

  action doFillDeathSavingThrowSuccess = all {
    qCurrentTurnRole == actorTurnRole,
    qHoles == Set(DeathSavingThrow),
    qCurrentTurnRole' = targetTurnRole,
    qTargetHp' = deathSavingThrowTargetAfter(10).hp,
    qTargetUnconscious' = deathSavingThrowTargetAfter(10).unconscious,
    qTargetStable' = deathSavingThrowTargetAfter(10).stable,
    qTargetDead' = targetDeadAfter(10),
    qTargetDeathSuccesses' = deathSavingThrowTargetAfter(10).deathSuccesses,
    qTargetDeathFailures' = deathSavingThrowTargetAfter(10).deathFailures,
    qHoles' = Set(),
    qLastResult' = "resolved",
    qLastInvalidReason' = "",
  }

  action doFillDeathSavingThrowNaturalTwenty = all {
    qCurrentTurnRole == actorTurnRole,
    qHoles == Set(DeathSavingThrow),
    qCurrentTurnRole' = targetTurnRole,
    qTargetHp' = deathSavingThrowTargetAfter(20).hp,
    qTargetUnconscious' = deathSavingThrowTargetAfter(20).unconscious,
    qTargetStable' = deathSavingThrowTargetAfter(20).stable,
    qTargetDead' = targetDeadAfter(20),
    qTargetDeathSuccesses' = deathSavingThrowTargetAfter(20).deathSuccesses,
    qTargetDeathFailures' = deathSavingThrowTargetAfter(20).deathFailures,
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
