// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.rogue-steady-aim
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.rogue-steady-aim

// Self-contained literal projection witness: asserts the SRD outcome of Rogue
// Steady Aim directly instead of importing battle-runtime reducers. This keeps
// the simulated driver leaf-only and fast while the paired TypeScript driver
// executes the production reducer entrypoints.
module battleRuntimeRogueSteadyAimMbt {
  // RAW trace:
  // - .references/srd-5.2.1/Classes/Rogue.md:89-91: Steady Aim is a Bonus
  //   Action, requires no movement during the current turn, grants Advantage on
  //   the next attack roll on that turn, and sets Speed to 0 until turn end.
  // - UBIQUITOUS_LANGUAGE.md: Bonus Action, Advantage, Attack Roll, Speed, and
  //   Movement.
  var qBonusActionAvailable: bool
  var qActorSpeedFeet: int
  var qNextAttackAdvantageActive: bool
  var qSpeedZeroActive: bool
  var qAttackRollAdvantage: bool
  var qMovedThisTurn: bool
  var qLastResult: str
  var qLastInvalidReason: str

  pure val normalSpeedFeet: int = 30
  pure val zeroSpeedFeet: int = 0

  action recordProjection(
    bonusActionAvailable: bool,
    actorSpeedFeet: int,
    nextAttackAdvantageActive: bool,
    speedZeroActive: bool,
    attackRollAdvantage: bool,
    lastResult: str,
    lastInvalidReason: str,
  ): bool = all {
    qBonusActionAvailable' = bonusActionAvailable,
    qActorSpeedFeet' = actorSpeedFeet,
    qNextAttackAdvantageActive' = nextAttackAdvantageActive,
    qSpeedZeroActive' = speedZeroActive,
    qAttackRollAdvantage' = attackRollAdvantage,
    qLastResult' = lastResult,
    qLastInvalidReason' = lastInvalidReason,
  }

  action init = all {
    qMovedThisTurn' = false,
    recordProjection(true, normalSpeedFeet, false, false, false, "init", ""),
  }

  action doSteadyAim = all {
    qBonusActionAvailable,
    qActorSpeedFeet == normalSpeedFeet,
    not(qMovedThisTurn),
    not(qNextAttackAdvantageActive),
    not(qSpeedZeroActive),
    qMovedThisTurn' = false,
    recordProjection(
      false,
      zeroSpeedFeet,
      true,
      true,
      true,
      "resolved",
      "",
    ),
  }

  action doRejectAfterMoved = all {
    qBonusActionAvailable,
    qActorSpeedFeet == normalSpeedFeet,
    not(qMovedThisTurn),
    not(qNextAttackAdvantageActive),
    not(qSpeedZeroActive),
    qMovedThisTurn' = true,
    recordProjection(
      true,
      normalSpeedFeet,
      false,
      false,
      false,
      "invalid",
      "staleSubject",
    ),
  }

  action doRejectSecondAim = all {
    not(qBonusActionAvailable),
    qNextAttackAdvantageActive,
    qSpeedZeroActive,
    qMovedThisTurn' = qMovedThisTurn,
    recordProjection(
      qBonusActionAvailable,
      qActorSpeedFeet,
      qNextAttackAdvantageActive,
      qSpeedZeroActive,
      qAttackRollAdvantage,
      "invalid",
      "staleSubject",
    ),
  }

  action doAttackConsumesAdvantage = all {
    qNextAttackAdvantageActive,
    qSpeedZeroActive,
    qMovedThisTurn' = qMovedThisTurn,
    recordProjection(
      qBonusActionAvailable,
      qActorSpeedFeet,
      false,
      true,
      false,
      "resolved",
      "",
    ),
  }

  action doEndTurnCleanup = all {
    qSpeedZeroActive,
    qMovedThisTurn' = false,
    recordProjection(true, normalSpeedFeet, false, false, false, "resolved", "")
  }

  action step = any {
    doSteadyAim,
    doRejectAfterMoved,
    doRejectSecondAim,
    doAttackConsumesAdvantage,
    doEndTurnCleanup,
  }
}
