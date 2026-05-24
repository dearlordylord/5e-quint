// -*- mode: Bluespec; -*-

module battleRuntimeDirectConditionLifecycleMbt {
  import battleRuntimeDirectConditionLifecycle.* from "./battle-runtime-direct-condition-lifecycle"

  var qActionAvailable: bool
  var qSlotLedgerLevel: int
  var qSlotsRemaining: int
  var qSlotSpellCastThisTurn: bool
  var qTargetHasNonSpellSource: bool
  var qTargetHasSpellSource: bool
  var qTargetSpellDurationTicks: int
  var qTargetConditionProjected: bool
  var qCasterConcentrating: bool

  pure def directConditionTarget(
    hasNonSpellSource: bool,
    hasSpellSource: bool,
    durationTicks: int,
  ): DirectConditionTarget =
    if (hasNonSpellSource and hasSpellSource)
      DirectConditionSpellAndNonSpell({ durationTicks: durationTicks })
    else if (hasNonSpellSource)
      DirectConditionNonSpellSource
    else if (hasSpellSource)
      DirectConditionSpellOnly({ durationTicks: durationTicks })
    else
      DirectConditionAbsent

  pure def currentDirectConditionLifecycleState: DirectConditionLifecycleState = {
    actionAvailable: qActionAvailable,
    slotLedger: {
      slotLevel: qSlotLedgerLevel,
      slotsRemaining: qSlotsRemaining,
    },
    slotSpellCastThisTurn: qSlotSpellCastThisTurn,
    targetCondition: directConditionTarget(
      qTargetHasNonSpellSource,
      qTargetHasSpellSource,
      qTargetSpellDurationTicks,
    ),
  }

  action recordNextState(nextState: DirectConditionLifecycleState): bool = all {
    qActionAvailable' = nextState.actionAvailable,
    qSlotLedgerLevel' = nextState.slotLedger.slotLevel,
    qSlotsRemaining' = nextState.slotLedger.slotsRemaining,
    qSlotSpellCastThisTurn' = nextState.slotSpellCastThisTurn,
    qTargetHasNonSpellSource' = match nextState.targetCondition {
      | DirectConditionAbsent => false
      | DirectConditionNonSpellSource => true
      | DirectConditionSpellOnly(_) => false
      | DirectConditionSpellAndNonSpell(_) => true
    },
    qTargetHasSpellSource' = directConditionTargetHasSpellSource(nextState.targetCondition),
    qTargetSpellDurationTicks' = directConditionDuration(nextState.targetCondition),
    qTargetConditionProjected' = directConditionRemainsProjected(nextState),
    qCasterConcentrating' = directConditionCasterConcentrating(nextState),
  }

  action init = {
    nondet slotLedgerLevel = directConditionMinimumSlotLevel.to(directConditionMaximumSlotLevel).oneOf()
    nondet hasNonSpellSource = Set(true, false).oneOf()
    all {
      recordNextState({
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
      }),
    }
  }

  action doCastDirectCondition = {
    nondet slotLevel = directConditionMinimumSlotLevel.to(4).oneOf()
    all {
      recordNextState(resolveDirectConditionCast(currentDirectConditionLifecycleState, slotLevel)),
    }
  }

  action doInvalidUpperSlotCast = all {
    recordNextState(resolveDirectConditionCast(
      currentDirectConditionLifecycleState,
      directConditionMaximumSlotLevel + 1,
    )),
  }

  action doBeginLaterTurn = all {
    recordNextState(beginDirectConditionLaterTurn(currentDirectConditionLifecycleState)),
  }

  action doAttackRollEarlyEnd = all {
    recordNextState(resolveDirectConditionEarlyEnd(
      currentDirectConditionLifecycleState,
      DirectConditionAttackRoll,
    )),
  }

  action doDamageEarlyEnd = all {
    recordNextState(resolveDirectConditionEarlyEnd(
      currentDirectConditionLifecycleState,
      DirectConditionDamage,
    )),
  }

  action doSpellCastEarlyEnd = all {
    recordNextState(resolveDirectConditionEarlyEnd(
      currentDirectConditionLifecycleState,
      DirectConditionSpellCast,
    )),
  }

  action doConcentrationCleanup = all {
    recordNextState(resolveDirectConditionConcentrationCleanup(currentDirectConditionLifecycleState)),
  }

  action doDurationTick = all {
    recordNextState(tickDirectConditionDuration(currentDirectConditionLifecycleState)),
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
