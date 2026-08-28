// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-STAT-BLOCK-MULTIATTACK-001
// UNIT-PROFILE-COVERAGE: qnt-owner stat-block.multiattack
// KERNEL-COVERAGE: qnt-owner BATTLE.STAT_BLOCK.MULTIATTACK

module statBlockMultiattack {
  type StatBlockAttackName =
    | PrimaryStatBlockAttack
    | SecondaryStatBlockAttack

  type StatBlockDispatchSubject =
    | StatBlockDispatchAttack({ attackName: StatBlockAttackName })
    | StatBlockMovementSubject
    | StatBlockEndTurnSubject
    | StatBlockBonusActionSubject
    | StatBlockOrdinaryActionSubject

  type StatBlockMultiattackProfile = {
    firstAttackName: StatBlockAttackName,
    primaryAttackCount: int,
    secondaryAttackCount: int,
  }

  type StatBlockMultiattackDispatches = {
    primaryRemaining: int,
    secondaryRemaining: int,
  }

  type StatBlockMultiattackState =
    | StatBlockMultiattackReadyToAct
    | StatBlockMultiattackActionSpent
    | StatBlockMultiattackTurnEnded
    | StatBlockMultiattackDispatching({ dispatches: StatBlockMultiattackDispatches })

  pure def initialStatBlockMultiattackDispatches: StatBlockMultiattackDispatches = {
    primaryRemaining: 0,
    secondaryRemaining: 0,
  }

  pure def initialStatBlockMultiattackState: StatBlockMultiattackState =
    StatBlockMultiattackReadyToAct

  pure def legalStatBlockMultiattackProfile(profile: StatBlockMultiattackProfile): bool = {
    val totalAttacks = profile.primaryAttackCount + profile.secondaryAttackCount
    val firstAttackCount =
      if (profile.firstAttackName == PrimaryStatBlockAttack) profile.primaryAttackCount
      else profile.secondaryAttackCount
    all {
      profile.firstAttackName.in(Set(PrimaryStatBlockAttack, SecondaryStatBlockAttack)),
      profile.primaryAttackCount >= 0,
      profile.secondaryAttackCount >= 0,
      totalAttacks >= 1,
      firstAttackCount >= 1,
    }
  }

  pure def legalStatBlockMultiattackDispatches(dispatches: StatBlockMultiattackDispatches): bool = all {
    dispatches.primaryRemaining >= 0,
    dispatches.secondaryRemaining >= 0,
  }

  pure def legalStatBlockMultiattackState(state: StatBlockMultiattackState): bool = all {
    match state {
      | StatBlockMultiattackReadyToAct => true
      | StatBlockMultiattackActionSpent => true
      | StatBlockMultiattackTurnEnded => true
      | StatBlockMultiattackDispatching(active) => all {
          legalStatBlockMultiattackDispatches(active.dispatches),
          multiattackDispatchesRemaining(active.dispatches) > 0,
        }
    },
  }

  pure def multiattackDispatchesRemaining(dispatches: StatBlockMultiattackDispatches): int =
    dispatches.primaryRemaining + dispatches.secondaryRemaining

  pure def statBlockMultiattackContinuationOpen(state: StatBlockMultiattackState): bool =
    match state {
      | StatBlockMultiattackReadyToAct => false
      | StatBlockMultiattackActionSpent => false
      | StatBlockMultiattackTurnEnded => false
      | StatBlockMultiattackDispatching(_) => true
    }

  pure def statBlockMultiattackDispatches(
    state: StatBlockMultiattackState
  ): StatBlockMultiattackDispatches =
    match state {
      | StatBlockMultiattackReadyToAct => initialStatBlockMultiattackDispatches
      | StatBlockMultiattackActionSpent => initialStatBlockMultiattackDispatches
      | StatBlockMultiattackTurnEnded => initialStatBlockMultiattackDispatches
      | StatBlockMultiattackDispatching(active) => active.dispatches
    }

  pure def dispatchCountForAttackName(
    dispatches: StatBlockMultiattackDispatches,
    attackName: StatBlockAttackName
  ): int =
    if (attackName == PrimaryStatBlockAttack) dispatches.primaryRemaining
    else dispatches.secondaryRemaining

  pure def decrementDispatch(
    dispatches: StatBlockMultiattackDispatches,
    attackName: StatBlockAttackName
  ): StatBlockMultiattackDispatches =
    if (attackName == PrimaryStatBlockAttack and dispatches.primaryRemaining > 0) {
      dispatches.with("primaryRemaining", dispatches.primaryRemaining - 1)
    } else if (attackName == SecondaryStatBlockAttack and dispatches.secondaryRemaining > 0) {
      dispatches.with("secondaryRemaining", dispatches.secondaryRemaining - 1)
    } else dispatches

  pure def multiattackDispatchSubjectPermitted(
    state: StatBlockMultiattackState,
    subject: StatBlockDispatchSubject
  ): bool =
    if (not(statBlockMultiattackContinuationOpen(state))) true
    else match subject {
      | StatBlockMovementSubject => true
      | StatBlockEndTurnSubject => true
      | StatBlockDispatchAttack(v) =>
        dispatchCountForAttackName(statBlockMultiattackDispatches(state), v.attackName) > 0
      | _ => false
    }

  pure def multiattackDispatchesAfterFirstAttack(
    profile: StatBlockMultiattackProfile
  ): StatBlockMultiattackDispatches =
    decrementDispatch(
      {
        primaryRemaining: profile.primaryAttackCount,
        secondaryRemaining: profile.secondaryAttackCount,
      },
      profile.firstAttackName
    )

  pure def startStatBlockMultiattack(
    state: StatBlockMultiattackState,
    profile: StatBlockMultiattackProfile
  ): StatBlockMultiattackState =
    match state {
      | StatBlockMultiattackReadyToAct => {
          val dispatches = multiattackDispatchesAfterFirstAttack(profile)
          if (not(legalStatBlockMultiattackProfile(profile))) state
          else if (multiattackDispatchesRemaining(dispatches) == 0)
            StatBlockMultiattackActionSpent
          else StatBlockMultiattackDispatching({
            dispatches: dispatches,
          })
        }
      | StatBlockMultiattackActionSpent => state
      | StatBlockMultiattackTurnEnded => state
      | StatBlockMultiattackDispatching(_) => state
    }

  pure def resolveStatBlockMultiattackDispatch(
    state: StatBlockMultiattackState,
    attackName: StatBlockAttackName
  ): StatBlockMultiattackState = match state {
    | StatBlockMultiattackReadyToAct => state
    | StatBlockMultiattackActionSpent => state
    | StatBlockMultiattackTurnEnded => state
    | StatBlockMultiattackDispatching(active) => {
        if (dispatchCountForAttackName(active.dispatches, attackName) <= 0) state
        else {
          val remaining = decrementDispatch(active.dispatches, attackName)
          if (multiattackDispatchesRemaining(remaining) == 0)
            StatBlockMultiattackActionSpent
          else StatBlockMultiattackDispatching({
            dispatches: remaining,
          })
        }
      }
  }

  pure def endStatBlockMultiattackTurn(
    state: StatBlockMultiattackState
  ): StatBlockMultiattackState =
    StatBlockMultiattackTurnEnded
}
