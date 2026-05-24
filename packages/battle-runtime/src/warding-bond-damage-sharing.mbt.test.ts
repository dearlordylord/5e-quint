// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.LINKED_EFFECT_DAMAGE_SHARING
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import {
  resolveWardingBondCleanup,
  resolveWardingBondSharedDamage,
  wardingBondDamageSharingInitialState,
  type WardingBondDamageSharingState,
} from "./battle-reducer/warding-bond.ts";

function initialState(input: {
  readonly sourceHitPoints: number;
  readonly wardHitPoints: number;
  readonly bondPresent: boolean;
}): WardingBondDamageSharingState {
  return wardingBondDamageSharingInitialState(input);
}

const QuintIntAsNumber = Schema.transform(
  Schema.BigIntFromSelf,
  Schema.Number,
  { strict: true, decode: (n) => Number(n), encode: (n) => BigInt(n) },
);

const intSchema = Schema.standardSchemaV1(QuintIntAsNumber);
const boolSchema = Schema.standardSchemaV1(Schema.Boolean);

const driverSchema = {
  init: {
    sourceHitPoints: intSchema,
    wardHitPoints: intSchema,
    bondPresent: boolSchema,
  },
  doSharedDamage: {
    incomingDamage: intSchema,
  },
  doSeparationCleanup: {
    separatedBeyondSixtyFeet: boolSchema,
  },
  doRecastCleanup: {
    recastOnConnectedCreature: boolSchema,
  },
  step: {},
} as const;

function createWardingBondDamageSharingDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialState({
      sourceHitPoints: 12,
      wardHitPoints: 12,
      bondPresent: true,
    });
    return {
      init: ({ sourceHitPoints, wardHitPoints, bondPresent }) => {
        state = initialState({
          sourceHitPoints,
          wardHitPoints,
          bondPresent,
        });
      },
      doSharedDamage: ({ incomingDamage }) => {
        state = resolveWardingBondSharedDamage(state, {
          incomingDamage,
        });
      },
      doSeparationCleanup: ({ separatedBeyondSixtyFeet }) => {
        state = resolveWardingBondCleanup(state, {
          separatedBeyondSixtyFeet,
          recastOnConnectedCreature: false,
        });
      },
      doRecastCleanup: ({ recastOnConnectedCreature }) => {
        state = resolveWardingBondCleanup(state, {
          separatedBeyondSixtyFeet: false,
          recastOnConnectedCreature,
        });
      },
      step: () => {},
      getState: () => state,
    };
  });
}

const wardingBondDamageSharingStateCheck = stateCheck(
  normalizeWardingBondDamageSharingQuintState,
  compareWardingBondDamageSharingState,
);

describe("Warding Bond damage-sharing MBT parity", () => {
  it("shares the same post-Resistance damage with the source", () => {
    const damaged = resolveWardingBondSharedDamage(
      initialState({
        sourceHitPoints: 12,
        wardHitPoints: 12,
        bondPresent: true,
      }),
      {
        incomingDamage: 9,
      },
    );

    expect(damaged).toEqual({
      sourceHitPoints: 8,
      wardHitPoints: 8,
      bondPresent: true,
      sourceTookSharedDamage: true,
    });
  });

  it("does not share damage when no linked bond is present", () => {
    const damaged = resolveWardingBondSharedDamage(
      initialState({
        sourceHitPoints: 12,
        wardHitPoints: 12,
        bondPresent: false,
      }),
      {
        incomingDamage: 9,
      },
    );

    expect(damaged).toEqual({
      sourceHitPoints: 12,
      wardHitPoints: 3,
      bondPresent: false,
      sourceTookSharedDamage: false,
    });
  });

  it("cleans up the link on source zero, separation, or recast", () => {
    const active = initialState({
      sourceHitPoints: 4,
      wardHitPoints: 12,
      bondPresent: true,
    });

    expect(
      resolveWardingBondSharedDamage(active, {
        incomingDamage: 9,
      }).bondPresent,
    ).toBe(false);
    expect(
      resolveWardingBondCleanup(active, {
        separatedBeyondSixtyFeet: true,
        recastOnConnectedCreature: false,
      }).bondPresent,
    ).toBe(false);
    expect(
      resolveWardingBondCleanup(active, {
        separatedBeyondSixtyFeet: false,
        recastOnConnectedCreature: true,
      }).bondPresent,
    ).toBe(false);
  });

  it("matches the TS reducer slice against bounded random MBT traces", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-warding-bond-damage-sharing.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createWardingBondDamageSharingDriver(),
      backend: "typescript",
      nTraces: 10,
      maxSteps: 6,
      stateCheck: wardingBondDamageSharingStateCheck,
    });
  }, 120_000);
});

function normalizeWardingBondDamageSharingQuintState(
  raw: unknown,
): WardingBondDamageSharingState {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint Warding Bond damage-sharing state.");
  }
  const state: Readonly<Record<string, unknown>> = Object.fromEntries(
    Object.entries(raw),
  );
  return {
    sourceHitPoints: numberFromQuintInt(
      state["qSourceHitPoints"],
      "qSourceHitPoints",
    ),
    wardHitPoints: numberFromQuintInt(
      state["qWardHitPoints"],
      "qWardHitPoints",
    ),
    bondPresent: booleanFromQuint(state["qBondPresent"], "qBondPresent"),
    sourceTookSharedDamage: booleanFromQuint(
      state["qSourceTookSharedDamage"],
      "qSourceTookSharedDamage",
    ),
  };
}

function compareWardingBondDamageSharingState(
  runtime: WardingBondDamageSharingState,
  quint: WardingBondDamageSharingState,
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

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "bigint") return Number(raw);
  throw new Error(`Expected Quint integer field ${field}.`);
}

function booleanFromQuint(raw: unknown, field: string): boolean {
  if (typeof raw === "boolean") return raw;
  throw new Error(`Expected Quint Boolean field ${field}.`);
}
