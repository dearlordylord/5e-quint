import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Either } from "effect";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { CreatureId } from "@dnd/shared/types";

import {
  grantUnitActionResource,
  resetTurnActionEconomy,
  spendActivationResource,
  type ActionEconomyState,
} from "@dnd/shared-algebras/action-economy-algebra";

const quintStateSchema = z.object({
  qTurnActionAvailable: z.boolean(),
  qRestrictedUnitActionOrder: z.bigint().transform(Number),
  qHasBonusAction: z.boolean(),
});
const ownerA = "A" as CreatureId;
const ownerB = "B" as CreatureId;

function restrictedUnitResources(
  order: number,
): ActionEconomyState["actionResources"] {
  const unitA = {
    kind: "action" as const,
    source: "unit" as const,
    sourceOwnerId: ownerA,
    sourceUnitId: "fighter_action_surge_l2_a",
    restriction: {
      kind: "exclude" as const,
      actions: ["magic"] as const,
    },
  };
  const unitB = {
    kind: "action" as const,
    source: "unit" as const,
    sourceOwnerId: ownerB,
    sourceUnitId: "fighter_action_surge_l2_b",
    restriction: {
      kind: "exclude" as const,
      actions: ["magic"] as const,
    },
  };

  if (order === 1) return [unitA];
  if (order === 2) return [unitB];
  if (order === 3) return [unitA, unitB];
  if (order === 4) return [unitB, unitA];
  return [];
}

function normalizeQuintState(raw: unknown): ActionEconomyState {
  const parsed = quintStateSchema.parse(raw);
  return {
    actionResources: [
      ...(parsed.qTurnActionAvailable
        ? [{ kind: "action" as const, source: "turn" as const }]
        : []),
      ...restrictedUnitResources(parsed.qRestrictedUnitActionOrder),
    ],
    currentHasBonusAction: parsed.qHasBonusAction,
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
  doSpendAttackAction: {},
  doSpendMagicAction: {},
  doGrantRestrictedUnitActionA: {},
  doGrantRestrictedUnitActionB: {},
  doSpendBonusAction: {},
  doSpendFreeAction: {},
  doResetTurn: {},
  step: {},
} as const;

function createActionEconomyDriver() {
  return defineDriver(driverSchema, () => {
    let state: ActionEconomyState = {
      actionResources: [{ kind: "action", source: "turn" }],
      currentHasBonusAction: true,
    };

    return {
      init: () => {
        state = resetTurnActionEconomy(state);
      },
      doSpendAttackAction: () => {
        state = expectRight(
          spendActivationResource(state, { kind: "action", action: "attack" }),
        );
      },
      doSpendMagicAction: () => {
        state = expectRight(
          spendActivationResource(state, { kind: "action", action: "magic" }),
        );
      },
      doGrantRestrictedUnitActionA: () => {
        state = expectRight(
          grantUnitActionResource(state, ownerA, "fighter_action_surge_l2_a", {
            kind: "exclude",
            actions: ["magic"],
          }),
        );
      },
      doGrantRestrictedUnitActionB: () => {
        state = expectRight(
          grantUnitActionResource(state, ownerB, "fighter_action_surge_l2_b", {
            kind: "exclude",
            actions: ["magic"],
          }),
        );
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
