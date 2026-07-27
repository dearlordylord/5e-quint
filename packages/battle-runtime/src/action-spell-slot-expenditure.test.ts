import { describe, expect, it } from "vitest";
import { expendActionSpellSlot } from "./battle-reducer/action-spell-slot-expenditure.ts";

const availableSecondLevelSlot = {
  actionAvailable: true,
  slotLedger: {
    slotLevel: 2,
    slotsRemaining: 1,
  },
  slotSpellCastThisTurn: false,
} as const;

describe("action spell slot expenditure", () => {
  it("commits the matching available slot and records the turn cast", () => {
    expect(expendActionSpellSlot(availableSecondLevelSlot, 2, 2)).toEqual({
      slotLedger: {
        slotLevel: 2,
        slotsRemaining: 0,
      },
      slotSpellCastThisTurn: true,
    });
  });

  it.each([
    [
      "no action",
      { ...availableSecondLevelSlot, actionAvailable: false },
      2,
      2,
    ],
    ["below minimum", availableSecondLevelSlot, 1, 2],
    ["above level nine", availableSecondLevelSlot, 10, 2],
    [
      "no matching slot",
      {
        ...availableSecondLevelSlot,
        slotLedger: { slotLevel: 3, slotsRemaining: 1 },
      },
      2,
      2,
    ],
    [
      "no slots remaining",
      {
        ...availableSecondLevelSlot,
        slotLedger: { slotLevel: 2, slotsRemaining: 0 },
      },
      2,
      2,
    ],
  ])(
    "rejects %s without a state projection",
    (_label, state, level, minimum) => {
      expect(expendActionSpellSlot(state, level, minimum)).toBeUndefined();
    },
  );
});
