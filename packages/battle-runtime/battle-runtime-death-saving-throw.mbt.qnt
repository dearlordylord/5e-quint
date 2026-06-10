// -*- mode: Bluespec; -*-

// Self-contained literal projection witness for the start-turn Death Saving Throw
// lifecycle. Asserts the SRD outcomes directly instead of importing the hit-point
// reducer, so the driver's import closure stays leaf-only and its MBT trace
// generation stays fast (see scripts/check-mbt-driver-closure.cjs). The fixture
// target begins Unconscious at 0 Hit Points with 2 death-save successes and 1
// failure; the facts below are the SRD result for each sampled die edge. If the
// death-save rule changes, update the literals here.
module battleRuntimeDeathSavingThrowMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  // Only the start-turn Death Saving Throw hole is exercised by this witness.
  type Hole = | DeathSavingThrow

  type DeathSavingThrowWitnessState = {
    currentTurnRole: str,
    targetHp: int,
    targetUnconscious: bool,
    targetStable: bool,
    targetDead: bool,
    targetDeathSuccesses: int,
    targetDeathFailures: int,
    protocol: WitnessProtocol[Hole],
  }

  var qState: DeathSavingThrowWitnessState

  pure val actorTurnRole: str = "actor"
  pure val targetTurnRole: str = "target"

  pure val initialDeathSavingThrowState: DeathSavingThrowWitnessState = {
    currentTurnRole: actorTurnRole,
    targetHp: 0,
    targetUnconscious: true,
    targetStable: false,
    targetDead: false,
    targetDeathSuccesses: 2,
    targetDeathFailures: 1,
    protocol: witnessInit(DeathSavingThrow),
  }

  pure def deathSavingThrowFilledState(
    state: DeathSavingThrowWitnessState,
    roll: int,
  ): DeathSavingThrowWitnessState = {
    val resolved = state
      .with("currentTurnRole", targetTurnRole)
      .with("targetHp", 0)
      .with("targetUnconscious", true)
      .with("targetStable", false)
      .with("targetDead", false)
      .with("targetDeathSuccesses", state.targetDeathSuccesses)
      .with("targetDeathFailures", state.targetDeathFailures)
      .with("protocol", witnessResolved(DeathSavingThrow))

    if (roll == 1)
      resolved
        .with("targetDead", true)
        .with("targetDeathFailures", 3)
    else if (roll == 5)
      resolved.with("targetDeathFailures", 2)
    else if (roll == 10)
      resolved
        .with("targetStable", true)
        .with("targetDeathSuccesses", 0)
        .with("targetDeathFailures", 0)
    else if (roll == 20)
      resolved
        .with("targetHp", 1)
        .with("targetUnconscious", false)
        .with("targetDeathSuccesses", 0)
        .with("targetDeathFailures", 0)
    else
      state.with("protocol", witnessInvalid(DeathSavingThrow, WInvalidFill))
  }

  action init = all {
    qState' = initialDeathSavingThrowState,
  }

  action doDiscoverEndTurnDeathSavingThrow = all {
    qState.currentTurnRole == actorTurnRole,
    qState.protocol.holes == Set(),
    qState' = qState.with(
      "protocol",
      witnessNeedsHoles(Set(DeathSavingThrow))
    ),
  }

  action doFillDeathSavingThrow = {
    // SRD 5.2.1 "Death Saving Throws": sample the rule edges for natural 1
    // (two failures), 2-9 (failure), 10-19 (success), and natural 20 (1 HP).
    nondet roll = Set(1, 5, 10, 20).oneOf()
    all {
      qState.currentTurnRole == actorTurnRole,
      qState.protocol.holes == Set(DeathSavingThrow),
      qState' = deathSavingThrowFilledState(qState, roll),
    }
  }

  action doRejectWrongActorEndTurnAfterResolved = all {
    qState.currentTurnRole == targetTurnRole,
    qState.protocol.holes == Set(),
    qState' = qState.with(
      "protocol",
      witnessInvalid(DeathSavingThrow, WWrongActor)
    ),
  }

  action step = any {
    doDiscoverEndTurnDeathSavingThrow,
    doFillDeathSavingThrow,
    doRejectWrongActorEndTurnAfterResolved,
  }
}
