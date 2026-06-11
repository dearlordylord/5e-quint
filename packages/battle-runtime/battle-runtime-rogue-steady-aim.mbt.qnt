// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.rogue-steady-aim
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.rogue-steady-aim

// Self-contained literal projection witness: asserts the SRD outcome of Rogue
// Steady Aim directly instead of importing battle-runtime reducers. This keeps
// the simulated driver leaf-only and fast while the paired TypeScript driver
// executes the production reducer entrypoints.
module battleRuntimeRogueSteadyAimMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  // RAW trace:
  // - .references/srd-5.2.1/Classes/Rogue.md:89-91: Steady Aim is a Bonus
  //   Action, requires no movement during the current turn, grants Advantage on
  //   the next attack roll on that turn, and sets Speed to 0 until turn end.
  // - UBIQUITOUS_LANGUAGE.md: Bonus Action, Advantage, Attack Roll, Speed, and
  //   Movement.
  type WitnessHole = | WitnessProtocolHole

  type RogueSteadyAimScenarioOutcome = | Init | Resolved | Invalid


  type RogueSteadyAimWitnessState = {
    qBonusActionAvailable: bool,
    qActorSpeedFeet: int,
    qNextAttackAdvantageActive: bool,
    qSpeedZeroActive: bool,
    qAttackRollAdvantage: bool,
    qMovedThisTurn: bool,
    qScenarioOutcome: RogueSteadyAimScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: RogueSteadyAimWitnessState

  pure def qBonusActionAvailable: bool = qState.qBonusActionAvailable
  pure def qActorSpeedFeet: int = qState.qActorSpeedFeet
  pure def qNextAttackAdvantageActive: bool = qState.qNextAttackAdvantageActive
  pure def qSpeedZeroActive: bool = qState.qSpeedZeroActive
  pure def qAttackRollAdvantage: bool = qState.qAttackRollAdvantage
  pure def qMovedThisTurn: bool = qState.qMovedThisTurn
  pure def qLastResult: RogueSteadyAimScenarioOutcome = qState.qScenarioOutcome

  pure val normalSpeedFeet: int = 30
  pure val zeroSpeedFeet: int = 0

  pure def witnessProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioResult: RogueSteadyAimScenarioOutcome,
    scenarioInvalidReason: str,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioResult == Init) witnessInit(WitnessProtocolHole)
    else if (scenarioInvalidReason == "invalidFill") witnessInvalid(WitnessProtocolHole, WInvalidFill)
    else if (scenarioInvalidReason == "staleSubject") witnessInvalid(WitnessProtocolHole, WStaleSubject)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)

  action recordProjection(
    bonusActionAvailable: bool,
    actorSpeedFeet: int,
    nextAttackAdvantageActive: bool,
    speedZeroActive: bool,
    attackRollAdvantage: bool,
    movedThisTurn: bool,
    lastResult: RogueSteadyAimScenarioOutcome,
    lastInvalidReason: str,
  ): bool = all {
    qState' = {
      qBonusActionAvailable: bonusActionAvailable,
      qActorSpeedFeet: actorSpeedFeet,
      qNextAttackAdvantageActive: nextAttackAdvantageActive,
      qSpeedZeroActive: speedZeroActive,
      qAttackRollAdvantage: attackRollAdvantage,
      qMovedThisTurn: movedThisTurn,
      qScenarioOutcome: lastResult,
      protocol: witnessProtocolForProjection(Set(), lastResult, lastInvalidReason),
    },
  }

  action init = all {
    recordProjection(true, normalSpeedFeet, false, false, false, false, Init, ""),
  }

  action doSteadyAim = all {
    qBonusActionAvailable,
    qActorSpeedFeet == normalSpeedFeet,
    not(qMovedThisTurn),
    not(qNextAttackAdvantageActive),
    not(qSpeedZeroActive),
    recordProjection(
      false,
      zeroSpeedFeet,
      true,
      true,
      true,
      false,
      Resolved,
      "",
    ),
  }

  action doRejectAfterMoved = all {
    qBonusActionAvailable,
    qActorSpeedFeet == normalSpeedFeet,
    not(qMovedThisTurn),
    not(qNextAttackAdvantageActive),
    not(qSpeedZeroActive),
    recordProjection(
      true,
      normalSpeedFeet,
      false,
      false,
      false,
      true,
      Invalid,
      "staleSubject",
    ),
  }

  action doRejectSecondAim = all {
    not(qBonusActionAvailable),
    qNextAttackAdvantageActive,
    qSpeedZeroActive,
    recordProjection(
      qBonusActionAvailable,
      qActorSpeedFeet,
      qNextAttackAdvantageActive,
      qSpeedZeroActive,
      qAttackRollAdvantage,
      qMovedThisTurn,
      Invalid,
      "staleSubject",
    ),
  }

  action doAttackConsumesAdvantage = all {
    qNextAttackAdvantageActive,
    qSpeedZeroActive,
    recordProjection(
      qBonusActionAvailable,
      qActorSpeedFeet,
      false,
      true,
      false,
      qMovedThisTurn,
      Resolved,
      "",
    ),
  }

  action doEndTurnCleanup = all {
    qSpeedZeroActive,
    recordProjection(true, normalSpeedFeet, false, false, false, false, Resolved, "")
  }

  action step = any {
    doSteadyAim,
    doRejectAfterMoved,
    doRejectSecondAim,
    doAttackConsumesAdvantage,
    doEndTurnCleanup,
  }
}
