// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.hunters-prey
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.hunters-prey

module battleRuntimeHuntersPreyMbt {
  var qColossusTargetHp: int
  var qHordeTargetHp: int
  var qColossusUsed: bool
  var qHordeBreakerUsed: bool
  var qLastResult: str
  var qLastInvalidReason: str

  action recordProjection(
    colossusTargetHp: int,
    hordeTargetHp: int,
    colossusUsed: bool,
    hordeBreakerUsed: bool,
    lastResult: str,
    lastInvalidReason: str,
  ): bool = all {
    qColossusTargetHp' = colossusTargetHp,
    qHordeTargetHp' = hordeTargetHp,
    qColossusUsed' = colossusUsed,
    qHordeBreakerUsed' = hordeBreakerUsed,
    qLastResult' = lastResult,
    qLastInvalidReason' = lastInvalidReason,
  }

  action init = recordProjection(7, 10, false, false, "init", "")

  action doColossusSlayer = all {
    qLastResult == "init",
    recordProjection(1, 10, true, false, "colossusSlayer", ""),
  }

  action doSkipThenUseColossusSlayer = all {
    qLastResult == "init",
    recordProjection(2, 10, true, false, "skipThenUseColossusSlayer", ""),
  }

  action doHordeBreaker = all {
    qLastResult == "init",
    recordProjection(7, 6, false, true, "hordeBreaker", ""),
  }

  action doHordeBreakerAfterPrimaryMiss = all {
    qLastResult == "init",
    recordProjection(7, 6, false, true, "hordeBreakerAfterPrimaryMiss", ""),
  }

  action doRejectMissingSelection = all {
    qLastResult == "init",
    recordProjection(7, 10, false, false, "rejectMissingSelection", "invalidFill"),
  }

  action doRejectSameTarget = all {
    qLastResult == "init",
    recordProjection(7, 10, false, false, "rejectSameTarget", "invalidFill"),
  }

  action doRejectInvalidTargetPredicate = all {
    qLastResult == "init",
    recordProjection(7, 10, false, false, "rejectInvalidTargetPredicate", "invalidFill"),
  }

  action doSecondHordeBreakerUnavailable = all {
    qLastResult == "init",
    recordProjection(7, 10, false, true, "secondHordeBreakerUnavailable", ""),
  }

  action step = any {
    doColossusSlayer,
    doSkipThenUseColossusSlayer,
    doHordeBreaker,
    doHordeBreakerAfterPrimaryMiss,
    doRejectMissingSelection,
    doRejectSameTarget,
    doRejectInvalidTargetPredicate,
    doSecondHordeBreakerUnavailable,
  }
}
