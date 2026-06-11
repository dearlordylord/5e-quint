// -*- mode: Bluespec; -*-

module battleRuntimeDirectConditionLifecycleMbt {
  import battleRuntimeDirectConditionLifecycle.* from "./battle-runtime-direct-condition-lifecycle"
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type Hole = | DirectConditionLifecycle

  type DirectConditionLifecycleWitnessState = {
    lifecycle: DirectConditionLifecycleState,
    protocol: WitnessProtocol[Hole],
  }

  var qState: DirectConditionLifecycleWitnessState

  pure def directConditionWitnessState(
    nextState: DirectConditionLifecycleState,
    protocol: WitnessProtocol[Hole],
  ): DirectConditionLifecycleWitnessState = {
    lifecycle: nextState,
    protocol: protocol,
  }

  action recordNextState(nextState: DirectConditionLifecycleState): bool = all {
    qState' = directConditionWitnessState(
      nextState,
      witnessResolved(DirectConditionLifecycle),
    ),
  }

  action init = {
    nondet slotLedgerLevel = directConditionMinimumSlotLevel.to(directConditionMaximumSlotLevel).oneOf()
    nondet hasNonSpellSource = Set(true, false).oneOf()
    all {
      qState' = directConditionWitnessState(
        {
        actionAvailable: true,
        slotLedger: {
          slotLevel: slotLedgerLevel,
          slotsRemaining: 1,
        },
        slotSpellCastThisTurn: false,
        targetCondition:
          if (hasNonSpellSource)
            DirectConditionNonSpellSource
          else
            DirectConditionAbsent,
        },
        witnessInit(DirectConditionLifecycle),
      ),
    }
  }

  action doCastDirectCondition = {
    nondet slotLevel = directConditionMinimumSlotLevel.to(4).oneOf()
    all {
      recordNextState(resolveDirectConditionCast(qState.lifecycle, slotLevel)),
    }
  }

  action doInvalidUpperSlotCast = all {
    recordNextState(resolveDirectConditionCast(
      qState.lifecycle,
      directConditionMaximumSlotLevel + 1,
    )),
  }

  action doBeginLaterTurn = all {
    recordNextState(beginDirectConditionLaterTurn(qState.lifecycle)),
  }

  action doAttackRollEarlyEnd = all {
    recordNextState(resolveDirectConditionEarlyEnd(
      qState.lifecycle,
      DirectConditionAttackRoll,
    )),
  }

  action doDamageEarlyEnd = all {
    recordNextState(resolveDirectConditionEarlyEnd(
      qState.lifecycle,
      DirectConditionDamage,
    )),
  }

  action doSpellCastEarlyEnd = all {
    recordNextState(resolveDirectConditionEarlyEnd(
      qState.lifecycle,
      DirectConditionSpellCast,
    )),
  }

  action doConcentrationCleanup = all {
    recordNextState(resolveDirectConditionConcentrationCleanup(qState.lifecycle)),
  }

  action doDurationTick = all {
    recordNextState(tickDirectConditionDuration(qState.lifecycle)),
  }

  action step = any {
    doCastDirectCondition,
    doInvalidUpperSlotCast,
    doBeginLaterTurn,
    doAttackRollEarlyEnd,
    doDamageEarlyEnd,
    doSpellCastEarlyEnd,
    doConcentrationCleanup,
    doDurationTick,
  }
}
