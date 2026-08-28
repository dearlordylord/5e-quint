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
  var qPrimaryRemaining: int
  var qSecondaryRemaining: int

  pure def qDispatches: StatBlockMultiattackDispatches = {
    primaryRemaining: qPrimaryRemaining,
    secondaryRemaining: qSecondaryRemaining,
  }

  pure def qState: StatBlockMultiattackState =
    if (qPhase == ProofReadyToAct) StatBlockMultiattackReadyToAct
    else if (qPhase == ProofActionSpent) StatBlockMultiattackActionSpent
    else if (qPhase == ProofTurnEnded) StatBlockMultiattackTurnEnded
    else StatBlockMultiattackDispatching({
      dispatches: qDispatches,
    })

  action recordState(state: StatBlockMultiattackState): bool = match state {
    | StatBlockMultiattackReadyToAct => all {
        qPhase' = ProofReadyToAct,
        qPrimaryRemaining' = 0,
        qSecondaryRemaining' = 0,
      }
    | StatBlockMultiattackActionSpent => all {
        qPhase' = ProofActionSpent,
        qPrimaryRemaining' = 0,
        qSecondaryRemaining' = 0,
      }
    | StatBlockMultiattackTurnEnded => all {
        qPhase' = ProofTurnEnded,
        qPrimaryRemaining' = 0,
        qSecondaryRemaining' = 0,
      }
    | StatBlockMultiattackDispatching(active) => all {
        qPhase' = ProofDispatching,
        qPrimaryRemaining' = active.dispatches.primaryRemaining,
        qSecondaryRemaining' = active.dispatches.secondaryRemaining,
      }
  }

  action init = all { recordState(initialStatBlockMultiattackState) }

  action doStart = {
    val profile = {
      firstAttackName: PrimaryStatBlockAttack,
      primaryAttackCount: 2,
      secondaryAttackCount: 1,
    }
    all { recordState(startStatBlockMultiattack(qState, profile)) }
  }

  action doDispatch = {
    nondet attackName = Set(PrimaryStatBlockAttack, SecondaryStatBlockAttack).oneOf()
    all { recordState(resolveStatBlockMultiattackDispatch(qState, attackName)) }
  }

  action doEndTurn = all { recordState(endStatBlockMultiattackTurn(qState)) }
  action step = any { doStart, doDispatch, doEndTurn }

  val invariant = all {
    qPhase.in(Set(ProofReadyToAct, ProofActionSpent, ProofTurnEnded, ProofDispatching)),
    qPrimaryRemaining.in(0.to(3)),
    qSecondaryRemaining.in(0.to(3)),
    (qPhase == ProofDispatching) implies qPrimaryRemaining + qSecondaryRemaining > 0,
    qPrimaryRemaining + qSecondaryRemaining <= 3,
    legalStatBlockMultiattackState(qState),
  }
}
