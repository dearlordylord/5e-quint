// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.DAMAGE.DEATH_SAVING_THROW_LIFECYCLE

module deathSavesAlgebraMbt {
  var qSuccesses: int
  var qFailures: int
  var qStable: bool
  var qDead: bool
  var qHpRegained: bool

  pure def qIntMin(a: int, b: int): int =
    if (a <= b) a else b

  pure def qDeathSaveCount(value: int): int =
    qIntMin(3, if (value < 0) 0 else value)

  pure def qRollTerminal(stable: bool, dead: bool, hpRegained: bool): bool =
    dead or stable or hpRegained

  pure def qDamageTerminal(dead: bool, hpRegained: bool): bool =
    dead or hpRegained

  pure def qValidState(successes: int, failures: int, stable: bool, dead: bool, hpRegained: bool): bool =
    successes >= 0
      and successes <= 3
      and failures >= 0
      and failures <= 3
      and not(dead and stable)
      and not(dead and hpRegained)
      and not(stable and hpRegained)
      and (dead implies failures == 3)
      and (stable implies successes == 0 and failures == 0)
      and (hpRegained implies successes == 0 and failures == 0)

  pure def qAddDeathFailures(
    successes: int,
    failures: int,
    stable: bool,
    dead: bool,
    hpRegained: bool,
    count: int
  ): { successes: int, failures: int, stable: bool, dead: bool, hpRegained: bool } = {
    if (qDamageTerminal(dead, hpRegained)) {
      successes: successes,
      failures: failures,
      stable: stable,
      dead: dead,
      hpRegained: hpRegained,
    } else {
      val nextFailures = qDeathSaveCount(failures + count)
      {
        successes: successes,
        failures: nextFailures,
        stable: false,
        dead: nextFailures >= 3,
        hpRegained: hpRegained,
      }
    }
  }

  pure def qResolveDeathSavingThrow(
    successes: int,
    failures: int,
    stable: bool,
    dead: bool,
    hpRegained: bool,
    d20Roll: int
  ): { successes: int, failures: int, stable: bool, dead: bool, hpRegained: bool } = {
    if (qRollTerminal(stable, dead, hpRegained) or d20Roll <= 0) {
      successes: successes,
      failures: failures,
      stable: stable,
      dead: dead,
      hpRegained: hpRegained,
    } else if (d20Roll == 20) {
      successes: 0,
      failures: 0,
      stable: false,
      dead: false,
      hpRegained: true,
    } else if (d20Roll == 1) {
      qAddDeathFailures(successes, failures, stable, dead, hpRegained, 2)
    } else if (d20Roll >= 10) {
      val nextSuccesses = qDeathSaveCount(successes + 1)
      if (nextSuccesses >= 3) {
        successes: 0,
        failures: 0,
        stable: true,
        dead: dead,
        hpRegained: hpRegained,
      } else {
        successes: nextSuccesses,
        failures: failures,
        stable: stable,
        dead: dead,
        hpRegained: hpRegained,
      }
    } else {
      qAddDeathFailures(successes, failures, stable, dead, hpRegained, 1)
    }
  }

  action init = all {
    qSuccesses' = 0,
    qFailures' = 0,
    qStable' = false,
    qDead' = false,
    qHpRegained' = false,
  }

  action doRollFail = {
    val result = qResolveDeathSavingThrow(qSuccesses, qFailures, qStable, qDead, qHpRegained, 5)
    all {
      qSuccesses' = result.successes,
      qFailures' = result.failures,
      qStable' = result.stable,
      qDead' = result.dead,
      qHpRegained' = result.hpRegained,
    }
  }

  action doRollNat1 = {
    val result = qResolveDeathSavingThrow(qSuccesses, qFailures, qStable, qDead, qHpRegained, 1)
    all {
      qSuccesses' = result.successes,
      qFailures' = result.failures,
      qStable' = result.stable,
      qDead' = result.dead,
      qHpRegained' = result.hpRegained,
    }
  }

  action doRollSuccess = {
    val result = qResolveDeathSavingThrow(qSuccesses, qFailures, qStable, qDead, qHpRegained, 10)
    all {
      qSuccesses' = result.successes,
      qFailures' = result.failures,
      qStable' = result.stable,
      qDead' = result.dead,
      qHpRegained' = result.hpRegained,
    }
  }

  action doRollNat20 = {
    val result = qResolveDeathSavingThrow(qSuccesses, qFailures, qStable, qDead, qHpRegained, 20)
    all {
      qSuccesses' = result.successes,
      qFailures' = result.failures,
      qStable' = result.stable,
      qDead' = result.dead,
      qHpRegained' = result.hpRegained,
    }
  }

  action doDamageFailure = {
    val result = qAddDeathFailures(qSuccesses, qFailures, qStable, qDead, qHpRegained, 1)
    all {
      qSuccesses' = result.successes,
      qFailures' = result.failures,
      qStable' = result.stable,
      qDead' = result.dead,
      qHpRegained' = result.hpRegained,
    }
  }

  action doCriticalDamageFailure = {
    val result = qAddDeathFailures(qSuccesses, qFailures, qStable, qDead, qHpRegained, 2)
    all {
      qSuccesses' = result.successes,
      qFailures' = result.failures,
      qStable' = result.stable,
      qDead' = result.dead,
      qHpRegained' = result.hpRegained,
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
    qSuccesses.in(0.to(3)),
    qFailures.in(0.to(3)),
    qStable.in(Set(true, false)),
    qDead.in(Set(true, false)),
    qHpRegained.in(Set(true, false)),
    qValidState(qSuccesses, qFailures, qStable, qDead, qHpRegained),
  }
}
