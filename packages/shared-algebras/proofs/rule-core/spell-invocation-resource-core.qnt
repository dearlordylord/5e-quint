// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS

module spellInvocationResourceCore {
  import actionTurnProcedures.* from "./action-turn-procedures"
  import spellSlotExpenditure.* from "./spell-slot-expenditure"

  // RAW anchors:
  // - Spells/Gaining-and-Casting.md: Spell Slots, Casting without Slots,
  //   Casting Time, One Spell with a Spell Slot per Turn, and Targets.
  // - UBIQUITOUS_LANGUAGE.md: Magic Action, Bonus Action, Spell Slot, Spend,
  //   Pool, and Quota.

  type SpellInvocationAction =
    | ActionTimeSpellInvocation
    | BonusActionSpellInvocation

  type SpellInvocationSlotSpend =
    | SpellInvocationWithoutSlot
    | SpellInvocationWithSlot({ minimumSlotLevel: int })

  type SpellInvocationTargetCardinality =
    | SpellInvocationBoundedTargets({
        minimumTargetCount: int,
        maximumTargetCount: int,
      })
    | SpellInvocationOpenUpperTargets({ minimumTargetCount: int })

  type SpellInvocationResourceFacts = {
    invocationAction: SpellInvocationAction,
    hasSpellAccess: bool,
    slotSpend: SpellInvocationSlotSpend,
    selectedSlotLevel: int,
    targetCount: int,
    targetCardinality: SpellInvocationTargetCardinality,
    targetsAreValid: bool,
  }

  type RepeatedDamageAllocationInvocationFacts = {
    hasSpellAccess: bool,
    selectedSlotLevel: int,
    targetCount: int,
    targetsAreValid: bool,
    repeatedEffectCount: int,
  }

  type SpellcastingProcedureState = {
    turn: TurnProcedureState,
    slotLedger: SpellSlotLedger,
    slotSpellCastThisTurn: bool,
  }

  type SpellInvocationResult = {
    state: SpellcastingProcedureState,
    admitted: bool,
    slotExpended: bool,
  }

  pure def initialSpellSlotLedger: SpellSlotLedger = {
    slotLevel: 1,
    slotsRemaining: 2,
  }

  pure def initialSpellcastingProcedureState: SpellcastingProcedureState = {
    turn: initialTurnProcedureState,
    slotLedger: initialSpellSlotLedger,
    slotSpellCastThisTurn: false,
  }

  pure def spellActionCost(invocationAction: SpellInvocationAction): ActionCost =
    if (invocationAction == BonusActionSpellInvocation) BonusActionCost
    else StandardActionCost(MagicAction)

  pure def legalSpellcastingProcedureState(state: SpellcastingProcedureState): bool = all {
    legalTurnProcedureState(state.turn),
    legalSpellSlotLedger(state.slotLedger),
    state.slotSpellCastThisTurn.in(Set(true, false)),
  }

  pure def legalSpellInvocationSlotSpend(
    slotSpend: SpellInvocationSlotSpend,
    selectedSlotLevel: int
  ): bool =
    match slotSpend {
      | SpellInvocationWithoutSlot => selectedSlotLevel == 0
      | SpellInvocationWithSlot(data) => all {
          data.minimumSlotLevel >= 1,
          data.minimumSlotLevel <= 9,
          selectedSlotLevel >= data.minimumSlotLevel,
          selectedSlotLevel <= 9,
        }
    }

  pure def spellInvocationSlotSpendRequiresSlot(
    slotSpend: SpellInvocationSlotSpend
  ): bool =
    match slotSpend {
      | SpellInvocationWithoutSlot => false
      | SpellInvocationWithSlot(_) => true
    }

  pure def spellInvocationResourceRequiresSlot(
    facts: SpellInvocationResourceFacts
  ): bool =
    spellInvocationSlotSpendRequiresSlot(facts.slotSpend)

  pure def spellInvocationExpenditureRequest(
    facts: SpellInvocationResourceFacts
  ): SpellSlotExpenditureRequest =
    match facts.slotSpend {
      | SpellInvocationWithoutSlot => SpellSlotExpenditureNotRequired
      | SpellInvocationWithSlot(_) => SpellSlotExpenditureRequired({
          slotLevel: facts.selectedSlotLevel,
        })
    }

  pure def spellInvocationExpenditureState(
    state: SpellcastingProcedureState
  ): SpellSlotExpenditureState = {
    slotLedger: state.slotLedger,
    slotSpellCastThisTurn: state.slotSpellCastThisTurn,
  }

  pure def legalSpellInvocationTargetCardinality(
    targetCardinality: SpellInvocationTargetCardinality,
    targetCount: int
  ): bool =
    match targetCardinality {
      | SpellInvocationBoundedTargets(data) => all {
          data.minimumTargetCount >= 1,
          data.maximumTargetCount >= data.minimumTargetCount,
          targetCount >= data.minimumTargetCount,
          targetCount <= data.maximumTargetCount,
        }
      | SpellInvocationOpenUpperTargets(data) => all {
          data.minimumTargetCount >= 1,
          targetCount >= data.minimumTargetCount,
        }
    }

  pure def legalSpellInvocationResourceFacts(
    facts: SpellInvocationResourceFacts
  ): bool = all {
    facts.hasSpellAccess.in(Set(true, false)),
    facts.targetsAreValid.in(Set(true, false)),
    legalSpellInvocationSlotSpend(facts.slotSpend, facts.selectedSlotLevel),
    legalSpellInvocationTargetCardinality(facts.targetCardinality, facts.targetCount),
  }

  pure def resolveSpellInvocationResourceWithActionCost(
    state: SpellcastingProcedureState,
    facts: SpellInvocationResourceFacts,
    actionCost: ActionCost
  ): SpellInvocationResult = {
    val spentTurn = spendActionCost(state.turn, actionCost)
    val slotExpenditureState = spellInvocationExpenditureState(state)
    val slotExpenditure = applySpellSlotExpenditure(
      slotExpenditureState,
      spellInvocationExpenditureRequest(facts)
    )
    val admitted = all {
      facts.hasSpellAccess,
      legalSpellInvocationResourceFacts(facts),
      legalSpellcastingProcedureState(state),
      spentTurn != state.turn,
      spellSlotExpenditureAccepted(slotExpenditure),
    }
    val slotExpended = admitted and spellSlotWasExpended(slotExpenditure)
    val nextSlotExpenditureState = spellSlotExpenditureResultState(slotExpenditureState, slotExpenditure)
    {
      state:
        if (not(admitted)) state
        else {
          turn: spentTurn,
          slotLedger: nextSlotExpenditureState.slotLedger,
          slotSpellCastThisTurn: nextSlotExpenditureState.slotSpellCastThisTurn,
        },
      admitted: admitted,
      slotExpended: slotExpended,
    }
  }

  pure def resolveSpellInvocationResource(
    state: SpellcastingProcedureState,
    facts: SpellInvocationResourceFacts
  ): SpellInvocationResult =
    resolveSpellInvocationResourceWithActionCost(
      state,
      facts,
      spellActionCost(facts.invocationAction)
    )

  pure def repeatedDamageAllocationInvocationResourceFacts(
    facts: RepeatedDamageAllocationInvocationFacts
  ): SpellInvocationResourceFacts = {
    invocationAction: ActionTimeSpellInvocation,
    hasSpellAccess: facts.hasSpellAccess,
    slotSpend: SpellInvocationWithSlot({ minimumSlotLevel: 1 }),
    selectedSlotLevel: facts.selectedSlotLevel,
    targetCount: facts.targetCount,
    targetCardinality: SpellInvocationBoundedTargets({
      minimumTargetCount: 1,
      maximumTargetCount: facts.repeatedEffectCount,
    }),
    targetsAreValid: facts.targetsAreValid,
  }

  pure def legalRepeatedDamageAllocationInvocationFacts(
    facts: RepeatedDamageAllocationInvocationFacts
  ): bool =
    legalSpellInvocationResourceFacts(
      repeatedDamageAllocationInvocationResourceFacts(facts)
    )

  pure def resolveRepeatedDamageAllocationInvocation(
    state: SpellcastingProcedureState,
    facts: RepeatedDamageAllocationInvocationFacts
  ): SpellInvocationResult =
    resolveSpellInvocationResource(
      state,
      repeatedDamageAllocationInvocationResourceFacts(facts)
    )

  pure def spellInvocationResourceCanAffectTargets(
    invocation: SpellInvocationResult,
    facts: SpellInvocationResourceFacts
  ): bool =
    invocation.admitted and facts.targetsAreValid

  pure def repeatedDamageAllocationInvocationCanAffectTargets(
    invocation: SpellInvocationResult,
    facts: RepeatedDamageAllocationInvocationFacts
  ): bool =
    spellInvocationResourceCanAffectTargets(
      invocation,
      repeatedDamageAllocationInvocationResourceFacts(facts)
    )
}
