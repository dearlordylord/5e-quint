// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.DAMAGE.DEATH_SAVING_THROW_LIFECYCLE

module deathSavesAlgebraMbt {
  import zeroHitPointLifecycle.* from "./rule-core/zero-hit-point-lifecycle"

  var qLifecycle: DeathSavingThrowLifecycle
  var qLastOutcome: DeathSavingThrowOutcome

  val qLifecycleDomain = Set(
    Stable,
    Dead,
    Dying({ successes: 0, failures: 0 }),
    Dying({ successes: 0, failures: 1 }),
    Dying({ successes: 0, failures: 2 }),
    Dying({ successes: 1, failures: 0 }),
    Dying({ successes: 1, failures: 1 }),
    Dying({ successes: 1, failures: 2 }),
    Dying({ successes: 2, failures: 0 }),
    Dying({ successes: 2, failures: 1 }),
    Dying({ successes: 2, failures: 2 }),
  )

  pure def qAddDeathFailures(
    lifecycle: DeathSavingThrowLifecycle,
    count: int
  ): { lifecycle: DeathSavingThrowLifecycle, outcome: DeathSavingThrowOutcome } =
    match lifecycle {
      | Dead => {
          lifecycle: Dead,
          outcome: DeathSavingThrowNoHitPointRecovery,
        }
      | Stable =>
          if (deathSavingThrowCount(count) >= 3) {
            lifecycle: Dead,
            outcome: DeathSavingThrowNoHitPointRecovery,
          } else {
            lifecycle: Dying({
              successes: 0,
              failures: deathSavingThrowCount(count),
            }),
            outcome: DeathSavingThrowNoHitPointRecovery,
          }
      | Dying(data) =>
          val nextFailures = deathSavingThrowCount(data.failures + count)
          if (nextFailures >= 3) {
            lifecycle: Dead,
            outcome: DeathSavingThrowNoHitPointRecovery,
          } else {
            lifecycle: Dying({
              successes: data.successes,
              failures: nextFailures,
            }),
            outcome: DeathSavingThrowNoHitPointRecovery,
          }
    }

  pure def qResolveDeathSavingThrow(
    lifecycle: DeathSavingThrowLifecycle,
    d20Roll: int
  ): { lifecycle: DeathSavingThrowLifecycle, outcome: DeathSavingThrowOutcome } =
    match lifecycle {
      | Stable => {
          lifecycle: Stable,
          outcome: DeathSavingThrowNoHitPointRecovery,
        }
      | Dead => {
          lifecycle: Dead,
          outcome: DeathSavingThrowNoHitPointRecovery,
        }
      | Dying(data) =>
          if (d20Roll <= 0) {
            lifecycle: lifecycle,
            outcome: DeathSavingThrowNoHitPointRecovery,
          } else if (d20Roll == 20) {
            lifecycle: resetDeathSavingThrowLifecycle,
            outcome: DeathSavingThrowRegainedHitPoint,
          } else if (d20Roll == 1) {
            qAddDeathFailures(lifecycle, 2)
          } else if (d20Roll >= 10) {
            val nextSuccesses = deathSavingThrowCount(data.successes + 1)
            if (nextSuccesses >= 3) {
              lifecycle: Stable,
              outcome: DeathSavingThrowNoHitPointRecovery,
            } else {
              lifecycle: Dying({
                successes: nextSuccesses,
                failures: data.failures,
              }),
              outcome: DeathSavingThrowNoHitPointRecovery,
            }
          } else {
            qAddDeathFailures(lifecycle, 1)
          }
    }

  action init = all {
    qLifecycle' = resetDeathSavingThrowLifecycle,
    qLastOutcome' = DeathSavingThrowNoHitPointRecovery,
  }

  action doRollFail = {
    val result = qResolveDeathSavingThrow(qLifecycle, 5)
    all {
      qLifecycle' = result.lifecycle,
      qLastOutcome' = result.outcome,
    }
  }

  action doRollNat1 = {
    val result = qResolveDeathSavingThrow(qLifecycle, 1)
    all {
      qLifecycle' = result.lifecycle,
      qLastOutcome' = result.outcome,
    }
  }

  action doRollSuccess = {
    val result = qResolveDeathSavingThrow(qLifecycle, 10)
    all {
      qLifecycle' = result.lifecycle,
      qLastOutcome' = result.outcome,
    }
  }

  action doRollNat20 = {
    val result = qResolveDeathSavingThrow(qLifecycle, 20)
    all {
      qLifecycle' = result.lifecycle,
      qLastOutcome' = result.outcome,
    }
  }

  action doDamageFailure = {
    val result = qAddDeathFailures(qLifecycle, 1)
    all {
      qLifecycle' = result.lifecycle,
      qLastOutcome' = result.outcome,
    }
  }

  action doCriticalDamageFailure = {
    val result = qAddDeathFailures(qLifecycle, 2)
    all {
      qLifecycle' = result.lifecycle,
      qLastOutcome' = result.outcome,
    }
  }

  action step = any {
    doRollFail,
    doRollNat1,
    doRollSuccess,
    doRollNat20,
    doDamageFailure,
    doCriticalDamageFailure,
  }

  val invariant = all {
    qLifecycle.in(qLifecycleDomain),
    legalDeathSavingThrowLifecycle(qLifecycle),
    qLastOutcome.in(Set(
      DeathSavingThrowNoHitPointRecovery,
      DeathSavingThrowRegainedHitPoint,
    )),
  }
}
