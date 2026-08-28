// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-STAT-BLOCK-MULTIATTACK-001
// UNIT-PROFILE-COVERAGE: qnt-owner stat-block.multiattack
// KERNEL-COVERAGE: qnt-owner BATTLE.STAT_BLOCK.MULTIATTACK

module statBlockMultiattack {
  type StatBlockProcedureRef = int

  type StatBlockDispatchSubject =
    | StatBlockDispatchProcedure({ procedureRef: StatBlockProcedureRef })
    | StatBlockMovementSubject
    | StatBlockEndTurnSubject
    | StatBlockBonusActionSubject
    | StatBlockOrdinaryActionSubject

  type StatBlockMultiattackProfile = {
    dispatchProcedureRefs: List[StatBlockProcedureRef],
  }

  type StatBlockProcedureRefRemoval = {
    removed: bool,
    remaining: List[StatBlockProcedureRef],
  }

  type StatBlockMultiattackState =
    | StatBlockMultiattackReadyToAct
    | StatBlockMultiattackActionSpent
    | StatBlockMultiattackTurnEnded
    | StatBlockMultiattackDispatching({ pendingProcedureRefs: List[StatBlockProcedureRef] })

  pure def initialStatBlockMultiattackState: StatBlockMultiattackState =
    StatBlockMultiattackReadyToAct

  pure def legalStatBlockProcedureRefs(procedureRefs: List[StatBlockProcedureRef]): bool =
    procedureRefs.foldl(true, (legal, procedureRef) => legal and procedureRef >= 0)

  pure def statBlockProcedureRefsContain(
    procedureRefs: List[StatBlockProcedureRef],
    procedureRef: StatBlockProcedureRef
  ): bool =
    procedureRefs.foldl(false, (found, candidate) => found or candidate == procedureRef)

  pure def legalStatBlockMultiattackProfile(profile: StatBlockMultiattackProfile): bool = all {
    profile.dispatchProcedureRefs.length() >= 1,
    legalStatBlockProcedureRefs(profile.dispatchProcedureRefs),
  }

  pure def legalStatBlockMultiattackState(state: StatBlockMultiattackState): bool = all {
    match state {
      | StatBlockMultiattackReadyToAct => true
      | StatBlockMultiattackActionSpent => true
      | StatBlockMultiattackTurnEnded => true
      | StatBlockMultiattackDispatching(active) => all {
          active.pendingProcedureRefs.length() > 0,
          legalStatBlockProcedureRefs(active.pendingProcedureRefs),
        }
    },
  }

  pure def statBlockMultiattackContinuationOpen(state: StatBlockMultiattackState): bool =
    match state {
      | StatBlockMultiattackReadyToAct => false
      | StatBlockMultiattackActionSpent => false
      | StatBlockMultiattackTurnEnded => false
      | StatBlockMultiattackDispatching(_) => true
    }

  pure def statBlockMultiattackPendingProcedureRefs(
    state: StatBlockMultiattackState
  ): List[StatBlockProcedureRef] =
    match state {
      | StatBlockMultiattackReadyToAct => List()
      | StatBlockMultiattackActionSpent => List()
      | StatBlockMultiattackTurnEnded => List()
      | StatBlockMultiattackDispatching(active) => active.pendingProcedureRefs
    }

  pure def removeFirstStatBlockProcedureRef(
    procedureRefs: List[StatBlockProcedureRef],
    procedureRef: StatBlockProcedureRef
  ): List[StatBlockProcedureRef] =
    procedureRefs.foldl(
      { removed: false, remaining: List() },
      (acc, candidate) =>
        if (not(acc.removed) and candidate == procedureRef) {
          removed: true,
          remaining: acc.remaining,
        } else {
          removed: acc.removed,
          remaining: acc.remaining.append(candidate),
        }
    ).remaining

  pure def multiattackDispatchSubjectPermitted(
    state: StatBlockMultiattackState,
    subject: StatBlockDispatchSubject
  ): bool =
    if (not(statBlockMultiattackContinuationOpen(state))) true
    else match subject {
      | StatBlockMovementSubject => true
      | StatBlockEndTurnSubject => true
      | StatBlockDispatchProcedure(v) =>
        statBlockProcedureRefsContain(
          statBlockMultiattackPendingProcedureRefs(state),
          v.procedureRef
        )
      | _ => false
    }

  pure def multiattackPendingProcedureRefsAfterFirstDispatch(
    profile: StatBlockMultiattackProfile
  ): List[StatBlockProcedureRef] =
    profile.dispatchProcedureRefs.slice(1, profile.dispatchProcedureRefs.length())

  pure def startStatBlockMultiattack(
    state: StatBlockMultiattackState,
    profile: StatBlockMultiattackProfile
  ): StatBlockMultiattackState =
    match state {
      | StatBlockMultiattackReadyToAct => {
          val pendingProcedureRefs = multiattackPendingProcedureRefsAfterFirstDispatch(profile)
          if (not(legalStatBlockMultiattackProfile(profile))) state
          else if (pendingProcedureRefs.length() == 0)
            StatBlockMultiattackActionSpent
          else StatBlockMultiattackDispatching({
            pendingProcedureRefs: pendingProcedureRefs,
          })
        }
      | StatBlockMultiattackActionSpent => state
      | StatBlockMultiattackTurnEnded => state
      | StatBlockMultiattackDispatching(_) => state
    }

  pure def resolveStatBlockMultiattackDispatch(
    state: StatBlockMultiattackState,
    procedureRef: StatBlockProcedureRef
  ): StatBlockMultiattackState = match state {
    | StatBlockMultiattackReadyToAct => state
    | StatBlockMultiattackActionSpent => state
    | StatBlockMultiattackTurnEnded => state
    | StatBlockMultiattackDispatching(active) => {
        if (not(statBlockProcedureRefsContain(active.pendingProcedureRefs, procedureRef))) state
        else {
          val remaining = removeFirstStatBlockProcedureRef(
            active.pendingProcedureRefs,
            procedureRef
          )
          if (remaining.length() == 0)
            StatBlockMultiattackActionSpent
          else StatBlockMultiattackDispatching({
            pendingProcedureRefs: remaining,
          })
        }
      }
  }

  pure def endStatBlockMultiattackTurn(
    state: StatBlockMultiattackState
  ): StatBlockMultiattackState =
    StatBlockMultiattackTurnEnded
}
