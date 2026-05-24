import { describe, expect, test } from "vitest";

import { resourceCount, spellSlotLevel } from "@dnd/shared/types";

import {
  applySpellSlotExpenditure,
  canExpendSpellSlot,
  expendSpellSlotInCapacities,
  spellSlotCapacitySlotsRemaining,
  spellSlotExpenditureAccepted,
  spellSlotExpenditureNotRequired,
  spellSlotExpenditureRequired,
  spellSlotExpenditureResultState,
  spellSlotWasExpended,
  type SpellSlotExpenditureState,
} from "./spell-slot-expenditure-algebra.ts";

const level1 = spellSlotLevel(1);
const level2 = spellSlotLevel(2);

function slotState(input?: {
  readonly slotsRemaining?: number;
  readonly slotSpellCastThisTurn?: boolean;
}): SpellSlotExpenditureState {
  return {
    slotLedger: {
      slotLevel: level1,
      slotsRemaining: resourceCount(input?.slotsRemaining ?? 2),
    },
    slotSpellCastThisTurn: input?.slotSpellCastThisTurn ?? false,
  };
}

describe("spell slot expenditure algebra", () => {
  test("slotless spellcasting does not consume the spell slot ledger", () => {
    const state = slotState();
    const result = applySpellSlotExpenditure(
      state,
      spellSlotExpenditureNotRequired,
    );

    expect(result).toEqual({
      tag: "spellSlotExpenditureAcceptedSlotless",
    });
    expect(spellSlotExpenditureAccepted(result)).toBe(true);
    expect(spellSlotExpenditureResultState(state, result)).toEqual(state);
    expect(spellSlotWasExpended(result)).toBe(false);
  });

  test("leveled spellcasting consumes one matching available slot", () => {
    const result = applySpellSlotExpenditure(
      slotState(),
      spellSlotExpenditureRequired(level1),
    );

    expect(result).toEqual({
      tag: "spellSlotExpended",
      state: {
        slotLedger: { slotLevel: level1, slotsRemaining: resourceCount(1) },
        slotSpellCastThisTurn: true,
      },
    });
    expect(spellSlotWasExpended(result)).toBe(true);
  });

  test("leveled spellcasting is rejected after a slot was already used this turn", () => {
    const state = slotState({ slotSpellCastThisTurn: true });

    expect(canExpendSpellSlot(state, spellSlotExpenditureRequired(level1))).toBe(
      false,
    );
    const result = applySpellSlotExpenditure(
      state,
      spellSlotExpenditureRequired(level1),
    );
    expect(result).toEqual({ tag: "spellSlotExpenditureRejected" });
    expect(spellSlotExpenditureResultState(state, result)).toEqual(state);
    expect(
      spellSlotExpenditureAccepted(
        applySpellSlotExpenditure(state, spellSlotExpenditureRequired(level1)),
      ),
    ).toBe(false);
  });

  test("leveled spellcasting is rejected without a matching available slot", () => {
    expect(
      canExpendSpellSlot(slotState(), spellSlotExpenditureRequired(level2)),
    ).toBe(false);
    expect(
      canExpendSpellSlot(
        slotState({ slotsRemaining: 0 }),
        spellSlotExpenditureRequired(level1),
      ),
    ).toBe(false);
  });

  test("capacity projection spends the existing slot state without adding another ledger", () => {
    const slots = [
      { spellLevel: level1, count: resourceCount(2), expended: resourceCount(1) },
      { spellLevel: level2, count: resourceCount(1), expended: resourceCount(1) },
    ];

    expect(spellSlotCapacitySlotsRemaining(slots[0])).toEqual(
      resourceCount(1),
    );
    expect(expendSpellSlotInCapacities(slots, level1)).toEqual([
      { spellLevel: level1, count: resourceCount(2), expended: resourceCount(2) },
      { spellLevel: level2, count: resourceCount(1), expended: resourceCount(1) },
    ]);
    expect(expendSpellSlotInCapacities(slots, level2)).toEqual(slots);
  });

  test("capacity projection spends one matching slot level when duplicate capacities are supplied", () => {
    const slots = [
      { spellLevel: level1, count: resourceCount(2), expended: resourceCount(0) },
      { spellLevel: level1, count: resourceCount(2), expended: resourceCount(0) },
    ];

    expect(expendSpellSlotInCapacities(slots, level1)).toEqual([
      { spellLevel: level1, count: resourceCount(2), expended: resourceCount(1) },
      { spellLevel: level1, count: resourceCount(2), expended: resourceCount(0) },
    ]);
  });
});
