// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE
//
// Composite slice for direct spell-owned condition application and cleanup.
// The slice owns spell-slot-backed activation, direct Invisible projection,
// target action/damage/spell-cast early ending, Concentration cleanup, and
// duration cleanup for one bounded target.
//
// RAW anchors:
// - Spells/Descriptions-E-L.md lines 1466-1477: Invisibility is a level 2
//   action spell with Touch range and Concentration up to 1 hour; the touched
//   creature has the Invisible condition until the spell ends, and the spell
//   ends early immediately after the target makes an attack roll, deals
//   damage, or casts a spell.
// - UBIQUITOUS_LANGUAGE.md entries for Condition, Invisible, Spell Slot,
//   Concentration, Casting Time, Duration, and Using a Higher-Level Spell Slot.
//
// Intentionally out of scope:
//   - target selection, willingness, sight, stealth, and Hidden adjudication
//   - Invisible attack-roll benefits and sight-line benefit denial
//   - whole-turn sequencing, reactions, Counterspell resolution, and damage
//     amount/disposition
//   - exact one-hour elapsed-time conversion; this slice uses ten abstract
//     ticks to verify monotonic duration cleanup in a bounded harness

module battleRuntimeDirectConditionLifecycle {
  import spellSlotExpenditure.* from "../shared-algebras/proofs/rule-core/spell-slot-expenditure"

  pure val directConditionMinimumSlotLevel: int = 2
  pure val directConditionMaximumSlotLevel: int = 9
  pure val directConditionDurationTicks: int = 10

  type DirectConditionTarget =
    | DirectConditionAbsent
    | DirectConditionNonSpellSource
    | DirectConditionSpellOnly({ durationTicks: int })
    | DirectConditionSpellAndNonSpell({ durationTicks: int })

  type DirectConditionLifecycleState = {
    actionAvailable: bool,
    slotLedger: SpellSlotLedger,
    slotSpellCastThisTurn: bool,
    targetCondition: DirectConditionTarget,
  }

  type DirectConditionEarlyEndTrigger =
    | DirectConditionAttackRoll
    | DirectConditionDamage
    | DirectConditionSpellCast

  pure def directConditionRequestedSlotLevelAccepted(slotLevel: int): bool =
    slotLevel >= directConditionMinimumSlotLevel and
    slotLevel <= directConditionMaximumSlotLevel

  pure def directConditionTargetHasSpellSource(target: DirectConditionTarget): bool =
    match target {
      | DirectConditionAbsent => false
      | DirectConditionNonSpellSource => false
      | DirectConditionSpellOnly(_) => true
      | DirectConditionSpellAndNonSpell(_) => true
    }

  pure def directConditionRemainsProjected(state: DirectConditionLifecycleState): bool =
    match state.targetCondition {
      | DirectConditionAbsent => false
      | _ => true
    }

  pure def directConditionCasterConcentrating(state: DirectConditionLifecycleState): bool =
    directConditionTargetHasSpellSource(state.targetCondition)

  pure def directConditionDuration(target: DirectConditionTarget): int =
    match target {
      | DirectConditionAbsent => 0
      | DirectConditionNonSpellSource => 0
      | DirectConditionSpellOnly(data) => data.durationTicks
      | DirectConditionSpellAndNonSpell(data) => data.durationTicks
    }

  pure def directConditionWithSpellSource(
    target: DirectConditionTarget,
    durationTicks: int,
  ): DirectConditionTarget =
    match target {
      | DirectConditionAbsent => DirectConditionSpellOnly({ durationTicks: durationTicks })
      | DirectConditionNonSpellSource => DirectConditionSpellAndNonSpell({ durationTicks: durationTicks })
      | DirectConditionSpellOnly(_) => DirectConditionSpellOnly({ durationTicks: durationTicks })
      | DirectConditionSpellAndNonSpell(_) => DirectConditionSpellAndNonSpell({ durationTicks: durationTicks })
    }

  pure def directConditionWithoutSpellSource(target: DirectConditionTarget): DirectConditionTarget =
    match target {
      | DirectConditionAbsent => DirectConditionAbsent
      | DirectConditionNonSpellSource => DirectConditionNonSpellSource
      | DirectConditionSpellOnly(_) => DirectConditionAbsent
      | DirectConditionSpellAndNonSpell(_) => DirectConditionNonSpellSource
    }

  pure def directConditionWithDurationTick(target: DirectConditionTarget): DirectConditionTarget =
    match target {
      | DirectConditionAbsent => DirectConditionAbsent
      | DirectConditionNonSpellSource => DirectConditionNonSpellSource
      | DirectConditionSpellOnly(data) =>
        if (data.durationTicks > 1)
          DirectConditionSpellOnly({ durationTicks: data.durationTicks - 1 })
        else
          DirectConditionAbsent
      | DirectConditionSpellAndNonSpell(data) =>
        if (data.durationTicks > 1)
          DirectConditionSpellAndNonSpell({ durationTicks: data.durationTicks - 1 })
        else
          DirectConditionNonSpellSource
    }

  pure def resolveDirectConditionCast(
    state: DirectConditionLifecycleState,
    slotLevel: int,
  ): DirectConditionLifecycleState =
    if (
      not(state.actionAvailable) or
      not(directConditionRequestedSlotLevelAccepted(slotLevel))
    )
      state
    else {
      val slotState = {
        slotLedger: state.slotLedger,
        slotSpellCastThisTurn: state.slotSpellCastThisTurn,
      }
      val slotResult = applySpellSlotExpenditure(
        slotState,
        SpellSlotExpenditureRequired({ slotLevel: slotLevel }),
      )
      if (not(spellSlotExpenditureAccepted(slotResult)))
        state
      else {
        val nextSlotState = spellSlotExpenditureResultState(slotState, slotResult)
        {
          ...state,
          actionAvailable: false,
          slotLedger: nextSlotState.slotLedger,
          slotSpellCastThisTurn: nextSlotState.slotSpellCastThisTurn,
          targetCondition: directConditionWithSpellSource(
            state.targetCondition,
            directConditionDurationTicks,
          ),
        }
      }
    }

  pure def beginDirectConditionLaterTurn(
    state: DirectConditionLifecycleState,
  ): DirectConditionLifecycleState =
    {
      ...state,
      actionAvailable: true,
      slotSpellCastThisTurn: false,
    }

  pure def resolveDirectConditionEarlyEnd(
    state: DirectConditionLifecycleState,
    trigger: DirectConditionEarlyEndTrigger,
  ): DirectConditionLifecycleState =
    {
      ...state,
      targetCondition: directConditionWithoutSpellSource(state.targetCondition),
    }

  pure def resolveDirectConditionConcentrationCleanup(
    state: DirectConditionLifecycleState,
  ): DirectConditionLifecycleState =
    {
      ...state,
      targetCondition: directConditionWithoutSpellSource(state.targetCondition),
    }

  pure def tickDirectConditionDuration(
    state: DirectConditionLifecycleState,
  ): DirectConditionLifecycleState =
    {
      ...state,
      targetCondition: directConditionWithDurationTick(state.targetCondition),
    }
}
