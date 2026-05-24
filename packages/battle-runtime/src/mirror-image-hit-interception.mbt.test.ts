// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.MIRROR_IMAGE_HIT_INTERCEPTION
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import {
  MIRROR_IMAGE_HIT_INTERCEPTION_DUPLICATE_COUNTS,
  resolveMirrorImageHitInterception,
  type MirrorImageHitInterceptionDuplicateCount,
  type MirrorImageHitInterceptionFills,
  type MirrorImageHitInterceptionState,
} from "./battle-reducer/mirror-image-hit-interception.ts";

const initialState: MirrorImageHitInterceptionState = {
  remainingDuplicates: 3,
  normalDamageContinues: false,
};

const driverSchema = {
  init: {},
  doResolveMirrorImageHitInterception: {
    attackHits: Schema.standardSchemaV1(Schema.Boolean),
    attackerBlinded: Schema.standardSchemaV1(Schema.Boolean),
    attackerHasBlindsight: Schema.standardSchemaV1(Schema.Boolean),
    attackerHasTruesight: Schema.standardSchemaV1(Schema.Boolean),
    duplicateRollSucceeds: Schema.standardSchemaV1(Schema.Boolean),
  },
  step: {},
} as const;

function createMirrorImageHitInterceptionDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialState;
    return {
      init: () => {
        state = initialState;
      },
      doResolveMirrorImageHitInterception: (
        fills: MirrorImageHitInterceptionFills,
      ) => {
        state = resolveMirrorImageHitInterception(state, fills);
      },
      step: () => {},
      getState: () => state,
    };
  });
}

const mirrorImageHitInterceptionStateCheck = stateCheck(
  normalizeMirrorImageHitInterceptionQuintState,
  compareMirrorImageHitInterceptionState,
);

describe("Mirror Image hit-interception MBT parity", () => {
  it("matches the TS reducer slice against bounded random MBT traces", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-mirror-image-hit-interception.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createMirrorImageHitInterceptionDriver(),
      backend: "typescript",
      nTraces: 10,
      maxSteps: 6,
      stateCheck: mirrorImageHitInterceptionStateCheck,
    });
  }, 120_000);
});

function normalizeMirrorImageHitInterceptionQuintState(
  raw: unknown,
): MirrorImageHitInterceptionState {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint Mirror Image hit-interception state.");
  }
  const state: Readonly<Record<string, unknown>> = Object.fromEntries(
    Object.entries(raw),
  );
  return {
    remainingDuplicates: mirrorImageHitInterceptionDuplicateCount(
      numberFromQuintInt(state["qRemainingDuplicates"], "qRemainingDuplicates"),
    ),
    normalDamageContinues: booleanFromQuint(
      state["qNormalDamageContinues"],
      "qNormalDamageContinues",
    ),
  };
}

function compareMirrorImageHitInterceptionState(
  runtime: MirrorImageHitInterceptionState,
  quint: MirrorImageHitInterceptionState,
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

function mirrorImageHitInterceptionDuplicateCount(
  value: number,
): MirrorImageHitInterceptionDuplicateCount {
  const count = MIRROR_IMAGE_HIT_INTERCEPTION_DUPLICATE_COUNTS.find(
    (candidate) => candidate === value,
  );
  if (count === undefined) {
    throw new Error(`Expected Mirror Image duplicate count 0..3, got ${value}.`);
  }
  return count;
}

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "bigint") return Number(raw);
  throw new Error(`Expected Quint integer field ${field}.`);
}

function booleanFromQuint(raw: unknown, field: string): boolean {
  if (typeof raw === "boolean") return raw;
  throw new Error(`Expected Quint Boolean field ${field}.`);
}
