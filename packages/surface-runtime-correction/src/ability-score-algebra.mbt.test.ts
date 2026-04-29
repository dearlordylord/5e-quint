import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  isValidAbilityScoreAssignment,
  type AbilityScoreAssignment,
  type SupportedAbilityScoreMethod,
} from "@dnd/shared-algebras/ability-score-algebra";

type AbilityScoreAlgebraState = {
  readonly method: SupportedAbilityScoreMethod;
  readonly scores: AbilityScoreAssignment;
  readonly valid: boolean;
};

const quintStateSchema = z.object({
  qMethod: z.union([z.literal("standardArray"), z.literal("pointBuy")]),
  qStr: z.bigint(),
  qDex: z.bigint(),
  qCon: z.bigint(),
  qInt: z.bigint(),
  qWis: z.bigint(),
  qCha: z.bigint(),
  qValid: z.boolean(),
});

function normalizeQuintState(raw: unknown): AbilityScoreAlgebraState {
  const parsed = quintStateSchema.parse(raw);
  return {
    method: parsed.qMethod,
    scores: {
      str: Number(parsed.qStr),
      dex: Number(parsed.qDex),
      con: Number(parsed.qCon),
      int: Number(parsed.qInt),
      wis: Number(parsed.qWis),
      cha: Number(parsed.qCha),
    },
    valid: parsed.qValid,
  };
}

function assignment(
  method: SupportedAbilityScoreMethod,
  scores: AbilityScoreAssignment,
): AbilityScoreAlgebraState {
  return {
    method,
    scores,
    valid: isValidAbilityScoreAssignment(method, scores),
  };
}

function compareState(
  spec: AbilityScoreAlgebraState,
  impl: AbilityScoreAlgebraState,
): boolean {
  expect(impl).toEqual(spec);
  return true;
}

const driverSchema = {
  init: {},
  setStandardArrayValid: {},
  setStandardArrayInvalid: {},
  setPointBuyValid: {},
  setPointBuyBudgetInvalid: {},
  setPointBuyRangeInvalid: {},
  setPointBuyStandardArrayValid: {},
  step: {},
} as const;

function createAbilityScoreDriver() {
  return defineDriver(driverSchema, () => {
    let state = assignment("standardArray", {
      str: 15,
      dex: 14,
      con: 13,
      int: 12,
      wis: 10,
      cha: 8,
    });

    return {
      init: () => {
        state = assignment("standardArray", {
          str: 15,
          dex: 14,
          con: 13,
          int: 12,
          wis: 10,
          cha: 8,
        });
      },
      setStandardArrayValid: () => {
        state = assignment("standardArray", {
          str: 14,
          dex: 15,
          con: 13,
          int: 8,
          wis: 10,
          cha: 12,
        });
      },
      setStandardArrayInvalid: () => {
        state = assignment("standardArray", {
          str: 15,
          dex: 15,
          con: 13,
          int: 8,
          wis: 10,
          cha: 12,
        });
      },
      setPointBuyValid: () => {
        state = assignment("pointBuy", {
          str: 13,
          dex: 13,
          con: 13,
          int: 12,
          wis: 12,
          cha: 12,
        });
      },
      setPointBuyBudgetInvalid: () => {
        state = assignment("pointBuy", {
          str: 15,
          dex: 15,
          con: 15,
          int: 15,
          wis: 8,
          cha: 8,
        });
      },
      setPointBuyRangeInvalid: () => {
        state = assignment("pointBuy", {
          str: 16,
          dex: 14,
          con: 13,
          int: 12,
          wis: 10,
          cha: 8,
        });
      },
      setPointBuyStandardArrayValid: () => {
        state = assignment("pointBuy", {
          str: 15,
          dex: 14,
          con: 13,
          int: 12,
          wis: 10,
          cha: 8,
        });
      },
      step: () => {},
      getState: () => state,
    };
  });
}

const abilityScoreStateCheck = stateCheck(normalizeQuintState, compareState);

describe("Ability Score Algebra MBT", () => {
  it("replays ability-score method traces against TS algebra", async () => {
    const specPath = path.resolve(
      import.meta.dirname,
      "../ability-score-algebra-mbt.qnt",
    );
    await run({
      spec: specPath,
      init: "init",
      step: "step",
      driver: createAbilityScoreDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 16),
      stateCheck: abilityScoreStateCheck,
    });
  }, 120_000);
});
