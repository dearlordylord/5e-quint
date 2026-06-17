// -*- mode: Bluespec; -*-

// Self-contained literal projection witness for Grappler's three SRD battle
// benefits. The TS witness discovers each projection through the selected
// feat_grappler Unit; this driver keeps the MBT import closure limited to the
// small witness protocol module.
module battleRuntimeGrapplerSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type GrapplerSelectedIdentityScenarioOutcome = | Init | FastWrestler | AttackAdvantage | PunchAndGrab

  var qFastWrestlerDragExempt: bool
  var qAttackRollMode: str
  var qPunchAndGrabUsed: bool
  var qGrappleActive: bool
  var qScenarioOutcome: GrapplerSelectedIdentityScenarioOutcome
  var qProtocol: WitnessProtocol[WitnessHole]

  pure def witnessProtocolForProjection(
    result: GrapplerSelectedIdentityScenarioOutcome,
  ): WitnessProtocol[WitnessHole] =
    if (result == Init) witnessInit(WitnessProtocolHole)
    else witnessResolved(WitnessProtocolHole)

  action recordProjection(
    fastWrestlerDragExempt: bool,
    attackRollMode: str,
    punchAndGrabUsed: bool,
    grappleActive: bool,
    result: GrapplerSelectedIdentityScenarioOutcome,
  ): bool = all {
    qFastWrestlerDragExempt' = fastWrestlerDragExempt,
    qAttackRollMode' = attackRollMode,
    qPunchAndGrabUsed' = punchAndGrabUsed,
    qGrappleActive' = grappleActive,
    qScenarioOutcome' = result,
    qProtocol' = witnessProtocolForProjection(result),
  }

  action init = recordProjection(false, "none", false, false, Init)

  action doFastWrestlerExemptsSameSizeDragCost = all {
    recordProjection(true, "none", false, true, FastWrestler),
  }

  action doAttackAdvantageAgainstGrappledTarget = all {
    recordProjection(false, "advantage", false, true, AttackAdvantage),
  }

  action doPunchAndGrabFailedSaveGrapple = all {
    recordProjection(false, "none", true, true, PunchAndGrab),
  }

  action step = any {
    doFastWrestlerExemptsSameSizeDragCost,
    doAttackAdvantageAgainstGrappledTarget,
    doPunchAndGrabFailedSaveGrapple,
  }
}
