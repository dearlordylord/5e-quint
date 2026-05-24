// -*- mode: Bluespec; -*-

// SRD 5.2.1 Rules-Glossary.md "Attack [Action]" / "Unarmed Strike" /
// "Shove": Shove replaces one attack, and a failed Strength or Dexterity
// Saving Throw either pushes the target 5 feet away or gives it the Prone
// condition. Playing-the-Game.md "Opportunity Attacks" excludes movement
// caused without the target's movement/action resources. The accepted Shove
// outcome spends the attack resource; rejected table facts leave it available.
// KERNEL-COVERAGE: qnt-owner BATTLE.SHOVE.OUTCOME_AND_PUSH_BOUNDARY

module shoveOutcome {
  type ShovePushBlockedReason =
    | ShovePushBlocked
    | ShovePushNoLegalDestination

  type ShovePushDisposition =
    | ShovePushed({ distanceFeet: int })
    | ShoveBlocked({ distanceFeet: int, reason: ShovePushBlockedReason })

  type ShoveFailedEffect =
    | ShoveProne
    | ShovePushAway(ShovePushDisposition)

  type ShoveOutcome =
    | ShoveSaveSucceeded
    | ShoveSaveFailed({ failedEffect: ShoveFailedEffect })

  type ShoveOutcomeResult =
    | ShoveOutcomeRejected({ targetProne: bool })
    | ShoveOutcomeAcceptedNoPush({ targetProne: bool })
    | ShoveOutcomeAcceptedPush({
      targetProne: bool,
      disposition: ShovePushDisposition,
    })

  type ShoveOutcomeProjection = {
    accepted: bool,
    targetProne: bool,
    pushEmitted: bool,
    pushDispositionKind: str,
    pushBlockedReason: str,
    pushDistanceFeet: int,
    pushProvokesOpportunityAttacks: bool,
    actionAvailable: bool,
  }

  pure def noShovePush(targetProne: bool): ShoveOutcomeResult =
    ShoveOutcomeAcceptedNoPush({ targetProne: targetProne })

  pure def invalidShovePush(targetProne: bool): ShoveOutcomeResult =
    ShoveOutcomeRejected({ targetProne: targetProne })

  pure def shovePushDistanceFeet(disposition: ShovePushDisposition): int =
    match disposition {
      | ShovePushed(data) => data.distanceFeet
      | ShoveBlocked(data) => data.distanceFeet
    }

  pure def shovePushDispositionKind(disposition: ShovePushDisposition): str =
    match disposition {
      | ShovePushed(_) => "pushed"
      | ShoveBlocked(_) => "blocked"
    }

  pure def shovePushBlockedReason(disposition: ShovePushDisposition): str =
    match disposition {
      | ShovePushed(_) => "none"
      | ShoveBlocked(data) =>
        match data.reason {
          | ShovePushBlocked => "blocked"
          | ShovePushNoLegalDestination => "noLegalDestination"
        }
    }

  pure def legalShovePushDisposition(disposition: ShovePushDisposition): bool =
    shovePushDistanceFeet(disposition) == 5

  pure def applyShoveOutcome(targetProne: bool, outcome: ShoveOutcome): ShoveOutcomeResult =
    match outcome {
      | ShoveSaveSucceeded => noShovePush(targetProne)
      | ShoveSaveFailed(data) =>
        match data.failedEffect {
          | ShoveProne => ShoveOutcomeAcceptedNoPush({ targetProne: true })
          | ShovePushAway(disposition) =>
            if (legalShovePushDisposition(disposition)) {
              ShoveOutcomeAcceptedPush({
                targetProne: targetProne,
                disposition: disposition,
              })
            } else invalidShovePush(targetProne)
        }
    }

  pure def projectShoveOutcomeResult(result: ShoveOutcomeResult): ShoveOutcomeProjection =
    match result {
      | ShoveOutcomeRejected(data) => {
        accepted: false,
        targetProne: data.targetProne,
        pushEmitted: false,
        pushDispositionKind: "none",
        pushBlockedReason: "none",
        pushDistanceFeet: 0,
        pushProvokesOpportunityAttacks: false,
        actionAvailable: true,
      }
      | ShoveOutcomeAcceptedNoPush(data) => {
        accepted: true,
        targetProne: data.targetProne,
        pushEmitted: false,
        pushDispositionKind: "none",
        pushBlockedReason: "none",
        pushDistanceFeet: 0,
        pushProvokesOpportunityAttacks: false,
        actionAvailable: false,
      }
      | ShoveOutcomeAcceptedPush(data) => {
        accepted: true,
        targetProne: data.targetProne,
        pushEmitted: true,
        pushDispositionKind: shovePushDispositionKind(data.disposition),
        pushBlockedReason: shovePushBlockedReason(data.disposition),
        pushDistanceFeet: shovePushDistanceFeet(data.disposition),
        pushProvokesOpportunityAttacks: false,
        actionAvailable: false,
      }
    }
}
