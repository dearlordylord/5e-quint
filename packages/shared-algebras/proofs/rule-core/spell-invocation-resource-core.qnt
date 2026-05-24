// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS

module spellInvocationResourceCore {
  import actionTurnProcedures.* from "./action-turn-procedures"

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

  type SpellSlotLedger = {
    slotLevel: int,
    slotsRemaining: int,
  }

  type SpellInvocationResourceFacts = {
    invocationAction: SpellInvocationAction,
    hasSpellAccess: bool,
    slotSpend: SpellInvocationSlotSpend,
    selectedSlotLevel: int,
    targetCount: int,
    targetCardinality: SpellInvocationTargetCardinality,
    targetsAreValid: bool,
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

  pure def legalSpellSlotLedger(ledger: SpellSlotLedger): bool = all {
    ledger.slotLevel >= 1,
    ledger.slotLevel <= 9,
    ledger.slotsRemaining >= 0,
    ledger.slotsRemaining <= 6,
  }

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

  pure def canSpendSpellSlot(
    ledger: SpellSlotLedger,
    facts: SpellInvocationResourceFacts,
    slotSpellCastThisTurn: bool
  ): bool =
    match facts.slotSpend {
      | SpellInvocationWithoutSlot => true
      | SpellInvocationWithSlot(_) => all {
          not(slotSpellCastThisTurn),
          facts.selectedSlotLevel == ledger.slotLevel,
          ledger.slotsRemaining > 0,
        }
    }

  pure def spendSpellSlot(
    ledger: SpellSlotLedger,
    facts: SpellInvocationResourceFacts
  ): SpellSlotLedger =
    if (not(spellInvocationResourceRequiresSlot(facts))) ledger
    else ledger.with("slotsRemaining", ledger.slotsRemaining - 1)

  pure def resolveSpellInvocationResource(
    state: SpellcastingProcedureState,
    facts: SpellInvocationResourceFacts
  ): SpellInvocationResult = {
    val spentTurn = spendActionCost(state.turn, spellActionCost(facts.invocationAction))
    val admitted = all {
      facts.hasSpellAccess,
      legalSpellInvocationResourceFacts(facts),
      legalSpellcastingProcedureState(state),
      spentTurn != state.turn,
      canSpendSpellSlot(state.slotLedger, facts, state.slotSpellCastThisTurn),
    }
    val slotExpended = admitted and spellInvocationResourceRequiresSlot(facts)
    {
      state:
        if (not(admitted)) state
        else {
          turn: spentTurn,
          slotLedger: spendSpellSlot(state.slotLedger, facts),
          slotSpellCastThisTurn: state.slotSpellCastThisTurn or slotExpended,
        },
      admitted: admitted,
      slotExpended: slotExpended,
    }
  }

  pure def spellInvocationResourceCanAffectTargets(
    invocation: SpellInvocationResult,
    facts: SpellInvocationResourceFacts
  ): bool =
    invocation.admitted and facts.targetsAreValid
}
