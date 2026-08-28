// -*- mode: Bluespec; -*-
// RAW-COVERAGE: verification-owner:qnt-proof RAW-STAT-BLOCK-MULTIATTACK-001
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof stat-block.multiattack

module statBlockMultiattackInductive {
  import statBlockMultiattack.* from "./stat-block-multiattack"

  type MultiattackProofPhase =
    | ProofReadyToAct
    | ProofActionSpent
    | ProofTurnEnded
    | ProofDispatching

  var qPhase: MultiattackProofPhase
  var qPendingProcedureRefs: List[StatBlockProcedureRef]
  var qDispatchAllowance: StatBlockMultiattackDispatchAllowance

  pure def qState: StatBlockMultiattackState =
    if (qPhase == ProofReadyToAct) StatBlockMultiattackReadyToAct
    else if (qPhase == ProofActionSpent) StatBlockMultiattackActionSpent
    else if (qPhase == ProofTurnEnded) StatBlockMultiattackTurnEnded
    else StatBlockMultiattackDispatching({
      pendingProcedureRefs: qPendingProcedureRefs,
      allowance: qDispatchAllowance,
    })

  action recordState(state: StatBlockMultiattackState): bool = match state {
    | StatBlockMultiattackReadyToAct => all {
        qPhase' = ProofReadyToAct,
        qPendingProcedureRefs' = List(),
        qDispatchAllowance' = AllListedDispatches,
      }
    | StatBlockMultiattackActionSpent => all {
        qPhase' = ProofActionSpent,
        qPendingProcedureRefs' = List(),
        qDispatchAllowance' = AllListedDispatches,
      }
    | StatBlockMultiattackTurnEnded => all {
        qPhase' = ProofTurnEnded,
        qPendingProcedureRefs' = List(),
        qDispatchAllowance' = AllListedDispatches,
      }
    | StatBlockMultiattackDispatching(active) => all {
        qPhase' = ProofDispatching,
        qPendingProcedureRefs' = active.pendingProcedureRefs,
        qDispatchAllowance' = active.allowance,
      }
  }

  action init = all { recordState(initialStatBlockMultiattackState) }

  action doActivate = {
    val profile = { dispatchProcedureRefs: List(0, 0, 1) }
    nondet allowance = Set(AllListedDispatches, OneListedDispatch).oneOf()
    all { recordState(activateStatBlockMultiattack(qState, profile, allowance)) }
  }

  action doDispatch = {
    nondet procedureRef = Set(0, 1, 2).oneOf()
    all { recordState(resolveStatBlockMultiattackDispatch(qState, procedureRef)) }
  }

  action doEndTurn = all { recordState(endStatBlockMultiattackTurn(qState)) }
  action step = any { doActivate, doDispatch, doEndTurn }

  val invariant = all {
    qPhase.in(Set(ProofReadyToAct, ProofActionSpent, ProofTurnEnded, ProofDispatching)),
    qPendingProcedureRefs.length() <= 3,
    qPendingProcedureRefs.foldl(
      true,
      (legal, procedureRef) => legal and procedureRef.in(0.to(2))
    ),
    (qPhase == ProofDispatching) implies qPendingProcedureRefs.length() > 0,
    legalStatBlockMultiattackState(qState),
  }
}
