// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS

module spellSlotExpenditure {
  // RAW anchors:
  // - Spells/Gaining-and-Casting.md: Spell Slots, Casting without Slots,
  //   and One Spell with a Spell Slot per Turn.

  type SpellSlotLedger = {
    slotLevel: int,
    slotsRemaining: int,
  }

  type SpellSlotExpenditureState = {
    slotLedger: SpellSlotLedger,
    slotSpellCastThisTurn: bool,
  }

  type SpellSlotExpenditureRequest =
    | SpellSlotExpenditureNotRequired
    | SpellSlotExpenditureRequired({ slotLevel: int })

  type SpellSlotExpenditureResult =
    | SpellSlotExpenditureRejected
    | SpellSlotExpenditureAcceptedSlotless
    | SpellSlotExpended({ state: SpellSlotExpenditureState })

  pure def legalSpellSlotLedger(ledger: SpellSlotLedger): bool = all {
    ledger.slotLevel >= 1,
    ledger.slotLevel <= 9,
    ledger.slotsRemaining >= 0,
    ledger.slotsRemaining <= 6,
  }

  pure def legalSpellSlotExpenditureState(state: SpellSlotExpenditureState): bool = all {
    legalSpellSlotLedger(state.slotLedger),
    state.slotSpellCastThisTurn.in(Set(true, false)),
  }

  pure def legalSpellSlotExpenditureRequest(slotRequest: SpellSlotExpenditureRequest): bool =
    match slotRequest {
      | SpellSlotExpenditureNotRequired => true
      | SpellSlotExpenditureRequired(data) => all {
          data.slotLevel >= 1,
          data.slotLevel <= 9,
        }
    }

  pure def canExpendSpellSlot(
    state: SpellSlotExpenditureState,
    slotRequest: SpellSlotExpenditureRequest
  ): bool =
    if (not(legalSpellSlotExpenditureState(state)) or not(legalSpellSlotExpenditureRequest(slotRequest))) false
    else match slotRequest {
      | SpellSlotExpenditureNotRequired => true
      | SpellSlotExpenditureRequired(data) => all {
          not(state.slotSpellCastThisTurn),
          data.slotLevel == state.slotLedger.slotLevel,
          state.slotLedger.slotsRemaining > 0,
        }
    }

  pure def applySpellSlotExpenditure(
    state: SpellSlotExpenditureState,
    slotRequest: SpellSlotExpenditureRequest
  ): SpellSlotExpenditureResult =
    if (not(canExpendSpellSlot(state, slotRequest)))
      SpellSlotExpenditureRejected
    else match slotRequest {
      | SpellSlotExpenditureNotRequired => SpellSlotExpenditureAcceptedSlotless
      | SpellSlotExpenditureRequired(_) => SpellSlotExpended({
          state: {
            slotLedger: state.slotLedger.with("slotsRemaining", state.slotLedger.slotsRemaining - 1),
            slotSpellCastThisTurn: true,
          },
        })
    }

  pure def spellSlotExpenditureResultState(
    priorState: SpellSlotExpenditureState,
    result: SpellSlotExpenditureResult
  ): SpellSlotExpenditureState =
    match result {
      | SpellSlotExpenditureRejected => priorState
      | SpellSlotExpenditureAcceptedSlotless => priorState
      | SpellSlotExpended(data) => data.state
    }

  pure def spellSlotExpenditureAccepted(result: SpellSlotExpenditureResult): bool =
    match result {
      | SpellSlotExpenditureRejected => false
      | SpellSlotExpenditureAcceptedSlotless => true
      | SpellSlotExpended(_) => true
    }

  pure def spellSlotWasExpended(result: SpellSlotExpenditureResult): bool =
    match result {
      | SpellSlotExpenditureRejected => false
      | SpellSlotExpenditureAcceptedSlotless => false
      | SpellSlotExpended(_) => true
    }
}
