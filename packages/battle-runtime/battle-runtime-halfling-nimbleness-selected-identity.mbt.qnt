// -*- mode: Bluespec; -*-

module battleRuntimeHalflingNimblenessSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  // Self-contained literal projection witness for the Halfling Nimbleness
  // selected Unit identity. The paired TypeScript witness discovers the same
  // facts through production battle-runtime Movement entrypoints and the
  // catalog-admitted creature-space movement permission support profile.
  //
  // RAW trace:
  // - .references/srd-5.2.1/Character-Origins.md:223 defines Halfling
  //   Nimbleness: move through a larger creature's space, but don't stop there.
  type Hole = | NoHole

  type HalflingNimblenessSelectedIdentityScenarioOutcome = | Init | MoveThroughLargerCreatureSpace | RejectOccupiedStop | RejectMissingProfile | RejectSameSizeTraversal

  type HalflingNimblenessSelectedIdentityWitnessState = {
    traversalAccepted: bool,
    acceptedMovementSpentFeet: int,
    occupiedStopRejected: bool,
    missingProfileRejected: bool,
    sameSizeRejected: bool,
    scenarioOutcome: HalflingNimblenessSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[Hole],
  }

  var qState: HalflingNimblenessSelectedIdentityWitnessState

  action recordProjection(
    traversalAccepted: bool,
    acceptedMovementSpentFeet: int,
    occupiedStopRejected: bool,
    missingProfileRejected: bool,
    sameSizeRejected: bool,
    scenarioOutcome: HalflingNimblenessSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[Hole],
  ): bool = all {
    qState' = {
      traversalAccepted: traversalAccepted,
      acceptedMovementSpentFeet: acceptedMovementSpentFeet,
      occupiedStopRejected: occupiedStopRejected,
      missingProfileRejected: missingProfileRejected,
      sameSizeRejected: sameSizeRejected,
      scenarioOutcome: scenarioOutcome,
      protocol: protocol,
    },
  }

  action init = recordProjection(
    false, 0, false, false, false, Init, witnessInit(NoHole))

  action doMoveThroughLargerCreatureSpace = all {
    qState.protocol.result == WInit,
    recordProjection(
      true, 10, false, false, false, MoveThroughLargerCreatureSpace,
      witnessResolved(NoHole)),
  }

  action doRejectOccupiedStop = all {
    qState.protocol.result == WInit,
    recordProjection(
      false, 0, true, false, false, RejectOccupiedStop,
      witnessResolved(NoHole)),
  }

  action doRejectMissingProfile = all {
    qState.protocol.result == WInit,
    recordProjection(
      false, 0, false, true, false, RejectMissingProfile,
      witnessResolved(NoHole)),
  }

  action doRejectSameSizeTraversal = all {
    qState.protocol.result == WInit,
    recordProjection(
      false, 0, false, false, true, RejectSameSizeTraversal,
      witnessResolved(NoHole)),
  }

  action step = any {
    doMoveThroughLargerCreatureSpace,
    doRejectOccupiedStop,
    doRejectMissingProfile,
    doRejectSameSizeTraversal,
  }
}
