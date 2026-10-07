import { spellSlotLevel } from "@dnd/shared/types";
import { expect, test } from "vitest";
import {
  supportedRepeatedEffectCount,
  supportedDamageAmountExpr,
} from "./spells-execution-facts.ts";

test("fixed repeated target counts remain unchanged across slot levels", () => {
  const count = supportedRepeatedEffectCount(
    {
      mode: "choose_up_to",
      repeatsAllowed: true,
      targetKinds: ["creature", "object"],
      count: 3,
    },
    2,
  );

  expect(count?.(spellSlotLevel(2))).toBe(3);
  expect(count?.(spellSlotLevel(5))).toBe(3);
});

test("casters without a character level retain base threshold damage instead of inventing scaling", () => {
  expect(
    supportedDamageAmountExpr({
      characterLevel: null,
      amount: {
        kind: "threshold_tiers",
        axis: "character",
        base: { dice: 1, dieSize: 6 },
        tiers: [{ atLevel: 5, override: { dice: 2 } }],
      },
    }),
  ).toEqual({ dice: 1, dieSize: 6 });
  expect(
    supportedDamageAmountExpr({
      characterLevel: null,
      amount: {
        kind: "threshold_tiers_exploding_max_die",
        axis: "character",
        baseDice: 1,
        dieSize: 6,
        tiers: [{ atLevel: 5, dice: 2 }],
        maxAdditionalDice: "spellcasting_ability_modifier",
      },
    }),
  ).toEqual({ dice: 1, dieSize: 6 });
  expect(
    supportedDamageAmountExpr({
      characterLevel: null,
      amount: { kind: "fixed", expr: { dice: 2, dieSize: 8 } },
    }),
  ).toEqual({ dice: 2, dieSize: 8 });
});

test("an absent character level cannot project a character scaling procedure", () => {
  expect(
    supportedDamageAmountExpr({
      amount: {
        kind: "threshold_tiers_exploding_max_die",
        axis: "character",
        baseDice: 1,
        dieSize: 6,
        tiers: [{ atLevel: 5, dice: 2 }],
        maxAdditionalDice: "spellcasting_ability_modifier",
      },
    }),
  ).toBeNull();
});

test("repeated target slot scaling preserves its base below the declared threshold", () => {
  const count = supportedRepeatedEffectCount(
    {
      mode: "choose_up_to",
      repeatsAllowed: true,
      targetKinds: ["creature"],
      count: { kind: "linear", base: 2, perSlotAboveBase: 1, baseLevel: 3 },
    },
    3,
  );
  expect(count?.(spellSlotLevel(2))).toBe(2);
  expect(count?.(spellSlotLevel(3))).toBe(2);
  expect(count?.(spellSlotLevel(5))).toBe(4);
});
