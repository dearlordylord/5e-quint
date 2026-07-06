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
    | ShoveOutcomeAcceptedWithoutEffect({ targetProne: bool })
    | ShoveOutcomeAcceptedTopple
    | ShoveOutcomeAcceptedPush({
      targetProne: bool,
      disposition: ShovePushDisposition,
    })

  type ShovePushProjection =
    | ShovePushCompletedProjection
    | ShovePushBlockedProjection({
      reason: ShovePushBlockedReason,
    })

  type ShoveOutcomeProjection =
    | ShoveOutcomeRejectedProjection({ targetProne: bool })
    | ShoveOutcomeAcceptedWithoutEffectProjection({ targetProne: bool })
    | ShoveOutcomeAcceptedToppleProjection
    | ShoveOutcomeAcceptedPushProjection({
      targetProne: bool,
      push: ShovePushProjection,
    })

  pure def noShovePush(targetProne: bool): ShoveOutcomeResult =
    ShoveOutcomeAcceptedWithoutEffect({ targetProne: targetProne })

  pure def invalidShovePush(targetProne: bool): ShoveOutcomeResult =
    ShoveOutcomeRejected({ targetProne: targetProne })

  pure def shovePushDistanceFeet(disposition: ShovePushDisposition): int =
    match disposition {
      | ShovePushed(data) => data.distanceFeet
      | ShoveBlocked(data) => data.distanceFeet
    }

  pure def shovePushProjection(disposition: ShovePushDisposition): ShovePushProjection =
    match disposition {
      | ShovePushed(_) => ShovePushCompletedProjection
      | ShoveBlocked(data) => ShovePushBlockedProjection({
        reason: data.reason,
      })
    }

  pure def legalShovePushDisposition(disposition: ShovePushDisposition): bool =
    shovePushDistanceFeet(disposition) == 5

  pure def applyShoveOutcome(targetProne: bool, outcome: ShoveOutcome): ShoveOutcomeResult =
    match outcome {
      | ShoveSaveSucceeded => noShovePush(targetProne)
      | ShoveSaveFailed(data) =>
        match data.failedEffect {
          | ShoveProne => ShoveOutcomeAcceptedTopple
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
      | ShoveOutcomeRejected(data) =>
        ShoveOutcomeRejectedProjection({ targetProne: data.targetProne })
      | ShoveOutcomeAcceptedWithoutEffect(data) =>
        ShoveOutcomeAcceptedWithoutEffectProjection({ targetProne: data.targetProne })
      | ShoveOutcomeAcceptedTopple =>
        ShoveOutcomeAcceptedToppleProjection
      | ShoveOutcomeAcceptedPush(data) =>
        ShoveOutcomeAcceptedPushProjection({
          targetProne: data.targetProne,
          push: shovePushProjection(data.disposition),
        })
    }
}
