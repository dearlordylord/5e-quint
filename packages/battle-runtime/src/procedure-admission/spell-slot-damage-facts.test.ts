// RAW traceability: spell-slot admission and higher-level scaling follow
// .references/srd-5.2.1/Spells/Gaining-and-Casting.md:44-69.
import { NonNegativeInteger, spellSlotLevel } from "@dnd/shared/types";
import type { DiceAmount } from "@dnd/surface/surface/types";
import { describe, expect, test } from "vitest";

import {
  battleCharacterExecutionScopeRef,
  battleExecutionScopeOrdinal,
  battleId,
  battleResourcePoolExecutionRef,
  combatantId,
} from "../identity.ts";
import { supportedSpellSlotDamageFacts } from "./spell-slot-damage-facts.ts";

const freeCastResourcePoolRef = battleResourcePoolExecutionRef(
  battleCharacterExecutionScopeRef(
    battleId("spell-slot-damage-admission-test"),
    combatantId("synthetic-spell-slot-damage-caster"),
    battleExecutionScopeOrdinal(0),
  ),
  NonNegativeInteger(0),
);

describe("spell-slot damage admission facts", () => {
  test("filters low slots and correlates scaling with each payment variant", () => {
    const amount: DiceAmount = {
      kind: "linear_per_level",
      axis: "slot",
      startingAtLevel: 2,
      base: { dice: 1, dieSize: 8 },
      perLevel: { dice: 1 },
    };

    expect(
      supportedSpellSlotDamageFacts({
        slots: [
          { spellLevel: spellSlotLevel(1), payment: { tag: "slot" } },
          { spellLevel: spellSlotLevel(2), payment: { tag: "slot" } },
          {
            spellLevel: spellSlotLevel(2),
            payment: {
              tag: "spellAccessFreeCast",
              resourcePoolRef: freeCastResourcePoolRef,
            },
          },
          { spellLevel: spellSlotLevel(4), payment: { tag: "slot" } },
        ],
        amount,
        spellLevel: 2,
      }),
    ).toEqual([
      {
        slotLevel: spellSlotLevel(2),
        damageExpr: { dice: 1, dieSize: 8 },
        payment: { tag: "slot" },
      },
      {
        slotLevel: spellSlotLevel(2),
        damageExpr: { dice: 1, dieSize: 8 },
        payment: {
          tag: "spellAccessFreeCast",
          resourcePoolRef: freeCastResourcePoolRef,
        },
      },
      {
        slotLevel: spellSlotLevel(4),
        damageExpr: { dice: 3, dieSize: 8 },
        payment: { tag: "slot" },
      },
    ]);
  });

  test("omits projections whose damage amount has no supported slot expression", () => {
    const unsupportedAmount: DiceAmount = {
      kind: "threshold_tiers",
      axis: "slot",
      base: { dice: 1, dieSize: 6 },
      tiers: [{ atLevel: 3, override: { dice: 2 } }],
    };

    expect(
      supportedSpellSlotDamageFacts({
        slots: [
          { spellLevel: spellSlotLevel(1), payment: { tag: "slot" } },
          { spellLevel: spellSlotLevel(3), payment: { tag: "slot" } },
        ],
        amount: unsupportedAmount,
        spellLevel: 1,
      }),
    ).toEqual([]);
  });
});
