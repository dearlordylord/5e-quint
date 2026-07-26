import {
  applySpellSlotExpenditure,
  spellSlotExpenditureAccepted,
  spellSlotExpenditureRequired,
  spellSlotExpenditureResultState,
} from "@dnd/shared-algebras/spell-slot-expenditure-algebra";
import { resourceCount, spellSlotLevel } from "@dnd/shared/types";

export type ActionSpellSlotState = {
  readonly actionAvailable: boolean;
  readonly slotLedger: {
    readonly slotLevel: number;
    readonly slotsRemaining: number;
  };
  readonly slotSpellCastThisTurn: boolean;
};

export function expendActionSpellSlot(
  state: ActionSpellSlotState,
  requestedSlotLevel: number,
  minimumSlotLevel: number,
):
  | {
      readonly slotLedger: ActionSpellSlotState["slotLedger"];
      readonly slotSpellCastThisTurn: boolean;
    }
  | undefined {
  if (
    !state.actionAvailable ||
    !Number.isInteger(requestedSlotLevel) ||
    requestedSlotLevel < minimumSlotLevel ||
    requestedSlotLevel > 9 ||
    !Number.isInteger(state.slotLedger.slotLevel) ||
    state.slotLedger.slotLevel < 1 ||
    state.slotLedger.slotLevel > 9 ||
    !Number.isInteger(state.slotLedger.slotsRemaining) ||
    state.slotLedger.slotsRemaining < 0
  ) {
    return undefined;
  }
  const slotState = {
    slotLedger: {
      slotLevel: spellSlotLevel(state.slotLedger.slotLevel),
      slotsRemaining: resourceCount(state.slotLedger.slotsRemaining),
    },
    slotSpellCastThisTurn: state.slotSpellCastThisTurn,
  };
  const slotResult = applySpellSlotExpenditure(
    slotState,
    spellSlotExpenditureRequired(spellSlotLevel(requestedSlotLevel)),
  );
  if (!spellSlotExpenditureAccepted(slotResult)) {
    return undefined;
  }
  const next = spellSlotExpenditureResultState(slotState, slotResult);
  return {
    slotLedger: {
      slotLevel: Number(next.slotLedger.slotLevel),
      slotsRemaining: Number(next.slotLedger.slotsRemaining),
    },
    slotSpellCastThisTurn: next.slotSpellCastThisTurn,
  };
}
