// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.MIRROR_IMAGE_HIT_INTERCEPTION
import { describe, expect, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  booleanValue,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtPickSchemas,
  mbtTraceCount,
  numberFromQuintInt,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.test-support.ts";
import {
  MIRROR_IMAGE_HIT_INTERCEPTION_DUPLICATE_COUNTS,
  resolveDuplicateHitInterception,
  type DuplicateHitInterceptionDuplicateCount,
  type DuplicateHitInterceptionFills,
  type DuplicateHitInterceptionState,
} from "./battle-reducer/mirror-image-hit-interception.ts";

const initialState: DuplicateHitInterceptionState = {
  remainingDuplicates: 3,
  normalDamageContinues: false,
};

const driverSchema = {
  init: {},
  doResolveDuplicateHitInterception: {
    attackHits: mbtPickSchemas.bool,
    attackerBlinded: mbtPickSchemas.bool,
    attackerHasBlindsight: mbtPickSchemas.bool,
    attackerHasTruesight: mbtPickSchemas.bool,
    duplicateRollSucceeds: mbtPickSchemas.bool,
  },
  step: {},
} as const;

function createDuplicateHitInterceptionDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialState;
    return {
      init: () => {
        state = initialState;
      },
      doResolveDuplicateHitInterception: (
        fills: DuplicateHitInterceptionFills,
      ) => {
        state = resolveDuplicateHitInterception(state, fills);
      },
      step: () => {},
      getState: () => state,
    };
  });
}

const duplicateHitInterceptionStateCheck = stateCheck(
  normalizeDuplicateHitInterceptionQuintState,
  compareDuplicateHitInterceptionState,
);

describe("Mirror Image hit-interception MBT parity", () => {
  it(
    "matches the TS reducer slice against bounded random MBT traces",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-mirror-image-hit-interception.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createDuplicateHitInterceptionDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(6),
        stateCheck: duplicateHitInterceptionStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function normalizeDuplicateHitInterceptionQuintState(
  raw: unknown,
): DuplicateHitInterceptionState {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint Mirror Image hit-interception state.");
  }
  const state: Readonly<Record<string, unknown>> = Object.fromEntries(
    Object.entries(raw),
  );
  return {
    remainingDuplicates: duplicateHitInterceptionDuplicateCount(
      numberFromQuintInt(state["qRemainingDuplicates"], "qRemainingDuplicates"),
    ),
    normalDamageContinues: booleanValue(
      state["qNormalDamageContinues"],
      "qNormalDamageContinues",
    ),
  };
}

function compareDuplicateHitInterceptionState(
  runtime: DuplicateHitInterceptionState,
  quint: DuplicateHitInterceptionState,
): boolean {
  try {
    expect(runtime).toEqual(quint);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw error;
  }
  return true;
}

function duplicateHitInterceptionDuplicateCount(
  value: number,
): DuplicateHitInterceptionDuplicateCount {
  const count = MIRROR_IMAGE_HIT_INTERCEPTION_DUPLICATE_COUNTS.find(
    (candidate) => candidate === value,
  );
  if (count === undefined) {
    throw new Error(
      `Expected Mirror Image duplicate count 0..3, got ${value}.`,
    );
  }
  return count;
}
