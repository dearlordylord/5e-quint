import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Either } from "effect";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  resetTurnActionEconomy,
  spendActivationResource,
  type ActionEconomyState,
} from "#/reducer-action-economy.ts";

const quintStateSchema = z.object({
  qActions: z.bigint(),
  qHasBonusAction: z.boolean(),
  qHasFreeAction: z.boolean(),
});

function normalizeQuintState(raw: unknown): ActionEconomyState {
  const parsed = quintStateSchema.parse(raw);
  return {
    currentActionsAvailable: Number(parsed.qActions) as 0 | 1 | 2,
    currentHasBonusAction: parsed.qHasBonusAction,
    currentHasFreeAction: parsed.qHasFreeAction,
  };
}

function compareState(
  spec: ActionEconomyState,
  impl: ActionEconomyState,
): boolean {
  expect(impl).toEqual(spec);
  return true;
}

function expectRight<T, E>(value: Either.Either<T, E>): T {
  if (Either.isLeft(value)) {
    throw new Error(String(value.left));
  }

  return value.right;
}

const driverSchema = {
  init: {},
  doSpendAction: {},
  doSpendBonusAction: {},
  doSpendFreeAction: {},
  doResetTurn: {},
  step: {},
} as const;

function createActionEconomyDriver() {
  return defineDriver(driverSchema, () => {
    let state: ActionEconomyState = {
      currentActionsAvailable: 1,
      currentHasBonusAction: true,
      currentHasFreeAction: true,
    };

    return {
      init: () => {
        state = resetTurnActionEconomy(state);
      },
      doSpendAction: () => {
        state = expectRight(spendActivationResource(state, { kind: "action" }));
      },
      doSpendBonusAction: () => {
        state = expectRight(
          spendActivationResource(state, { kind: "bonusAction" }),
        );
      },
      doSpendFreeAction: () => {
        state = expectRight(spendActivationResource(state, { kind: "free" }));
      },
      doResetTurn: () => {
        state = resetTurnActionEconomy(state);
      },
      step: () => {},
      getState: () => state,
    };
  });
}

const actionEconomyStateCheck = stateCheck(normalizeQuintState, compareState);

describe("Action Economy Algebra MBT", () => {
  it("replays action-economy traces against TS algebra", async () => {
    const specPath = path.resolve(
      import.meta.dirname,
      "../action-economy-algebra-mbt.qnt",
    );
    await run({
      spec: specPath,
      init: "init",
      step: "step",
      driver: createActionEconomyDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 16),
      stateCheck: actionEconomyStateCheck,
    });
  }, 120_000);
});
