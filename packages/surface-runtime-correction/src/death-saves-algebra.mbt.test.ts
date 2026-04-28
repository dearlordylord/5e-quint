import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  addDeathFailures,
  resetDeathSaveRuntimeState,
  resolveDeathSavingThrow,
  type DeathSaveRuntimeState,
} from "@dnd/shared-algebras/death-saves-algebra";

const quintStateSchema = z.object({
  qSuccesses: z.bigint(),
  qFailures: z.bigint(),
  qStable: z.boolean(),
  qDead: z.boolean(),
  qHpRegained: z.boolean(),
});

function normalizeQuintState(raw: unknown): DeathSaveRuntimeState {
  const parsed = quintStateSchema.parse(raw);
  return {
    deathSaves: {
      successes: Number(parsed.qSuccesses) as 0 | 1 | 2 | 3,
      failures: Number(parsed.qFailures) as 0 | 1 | 2 | 3,
    },
    stable: parsed.qStable,
    dead: parsed.qDead,
    hpRegained: parsed.qHpRegained,
  };
}

function compareState(
  spec: DeathSaveRuntimeState,
  impl: DeathSaveRuntimeState,
): boolean {
  expect(impl).toEqual(spec);
  return true;
}

const driverSchema = {
  init: {},
  doRollFail: {},
  doRollNat1: {},
  doRollSuccess: {},
  doRollNat20: {},
  doDamageFailure: {},
  doCriticalDamageFailure: {},
  step: {},
} as const;

function createDeathSavesDriver() {
  return defineDriver(driverSchema, () => {
    let state = resetDeathSaveRuntimeState();

    return {
      init: () => {
        state = resetDeathSaveRuntimeState();
      },
      doRollFail: () => {
        state = resolveDeathSavingThrow(state, 5);
      },
      doRollNat1: () => {
        state = resolveDeathSavingThrow(state, 1);
      },
      doRollSuccess: () => {
        state = resolveDeathSavingThrow(state, 10);
      },
      doRollNat20: () => {
        state = resolveDeathSavingThrow(state, 20);
      },
      doDamageFailure: () => {
        state = addDeathFailures(state, 1);
      },
      doCriticalDamageFailure: () => {
        state = addDeathFailures(state, 2);
      },
      step: () => {},
      getState: () => state,
    };
  });
}

const deathSavesStateCheck = stateCheck(normalizeQuintState, compareState);

describe("Death Saves Algebra MBT", () => {
  it("replays death-save traces against TS algebra", async () => {
    const specPath = path.resolve(
      import.meta.dirname,
      "../death-saves-algebra-mbt.qnt",
    );
    await run({
      spec: specPath,
      init: "init",
      step: "step",
      driver: createDeathSavesDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 16),
      stateCheck: deathSavesStateCheck,
    });
  }, 120_000);
});
