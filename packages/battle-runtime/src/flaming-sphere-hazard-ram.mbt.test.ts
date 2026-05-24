// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import {
  resolveFlamingSphereCast,
  resolveFlamingSphereHazardRam,
  type FlamingSphereHazardRamState,
} from "./battle-reducer/flaming-sphere-hazard-ram.ts";

function initialState(slotLedgerLevel: number): FlamingSphereHazardRamState {
  return {
    actionAvailable: true,
    casterHasBonusAction: true,
    sphere: { tag: "absent" },
    slotLedger: { slotLevel: slotLedgerLevel, slotsRemaining: 1 },
    slotSpellCastThisTurn: false,
    targetVitals: {
      kind: "monsterCreature",
      hitPoints: 12,
      hitPointMaximum: 12,
      temporaryHitPoints: 0,
      dead: false,
      unconscious: false,
    },
  };
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
    slotLedgerLevel: intSchema,
  },
  doCastFlamingSphere: {
    slotLevel: intSchema,
  },
  doEndWithinFiveFeet: {
    savingThrowSucceeded: boolSchema,
    rolledDamage: intSchema,
  },
  doRam: {
    savingThrowSucceeded: boolSchema,
    rolledDamage: intSchema,
    moveFeet: intSchema,
  },
  step: {},
} as const;

function createFlamingSphereHazardRamDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialState(2);
    return {
      init: ({ slotLedgerLevel }) => {
        state = initialState(slotLedgerLevel);
      },
      doCastFlamingSphere: ({ slotLevel }) => {
        state = resolveFlamingSphereCast(state, slotLevel);
      },
      doEndWithinFiveFeet: ({ savingThrowSucceeded, rolledDamage }) => {
        state = resolveFlamingSphereHazardRam(state, "endWithinFiveFeet", {
          savingThrowSucceeded,
          rolledDamage,
          moveFeet: 0,
        });
      },
      doRam: ({ savingThrowSucceeded, rolledDamage, moveFeet }) => {
        state = resolveFlamingSphereHazardRam(state, "ram", {
          savingThrowSucceeded,
          rolledDamage,
          moveFeet,
        });
      },
      step: () => {},
      getState: () => state,
    };
  });
}

const flamingSphereHazardRamStateCheck = stateCheck(
  normalizeFlamingSphereHazardRamQuintState,
  compareFlamingSphereHazardRamState,
);

describe("Flaming Sphere hazard/ram MBT parity", () => {
  it("rejects a cast whose requested slot level does not match the ledger", () => {
    const state = initialState(2);

    expect(resolveFlamingSphereCast(state, 3)).toEqual(state);
  });

  it("derives active sphere damage dice from the matching expended slot level", () => {
    expect(resolveFlamingSphereCast(initialState(4), 4)).toMatchObject({
      sphere: {
        tag: "active",
        damageDice: 4,
      },
      slotLedger: {
        slotLevel: 4,
        slotsRemaining: 0,
      },
    });
  });

  it("rejects damage rolls outside the active sphere dice bounds", () => {
    const cast = resolveFlamingSphereCast(initialState(2), 2);

    expect(
      resolveFlamingSphereHazardRam(cast, "endWithinFiveFeet", {
        savingThrowSucceeded: false,
        rolledDamage: 24,
        moveFeet: 0,
      }),
    ).toEqual(cast);
  });

  it("accepts damage rolls at the active sphere dice upper bound", () => {
    const cast = resolveFlamingSphereCast(initialState(4), 4);

    expect(
      resolveFlamingSphereHazardRam(cast, "endWithinFiveFeet", {
        savingThrowSucceeded: false,
        rolledDamage: 24,
        moveFeet: 0,
      }).targetVitals,
    ).toMatchObject({
      hitPoints: 0,
      dead: true,
    });
  });

  it("matches the TS reducer slice against bounded random MBT traces", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-flaming-sphere-hazard-ram.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createFlamingSphereHazardRamDriver(),
      backend: "typescript",
      nTraces: 10,
      maxSteps: 6,
      stateCheck: flamingSphereHazardRamStateCheck,
    });
  }, 120_000);
});

function normalizeFlamingSphereHazardRamQuintState(
  raw: unknown,
): FlamingSphereHazardRamState {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint Flaming Sphere hazard/ram state.");
  }
  const state: Readonly<Record<string, unknown>> = Object.fromEntries(
    Object.entries(raw),
  );
  return {
    actionAvailable: booleanFromQuint(
      state["qActionAvailable"],
      "qActionAvailable",
    ),
    casterHasBonusAction: booleanFromQuint(
      state["qCasterHasBonusAction"],
      "qCasterHasBonusAction",
    ),
    sphere: sphereFromQuintState(state),
    slotLedger: {
      slotLevel: numberFromQuintInt(
        state["qSlotLedgerLevel"],
        "qSlotLedgerLevel",
      ),
      slotsRemaining: numberFromQuintInt(
        state["qSlotsRemaining"],
        "qSlotsRemaining",
      ),
    },
    slotSpellCastThisTurn: booleanFromQuint(
      state["qSlotSpellCastThisTurn"],
      "qSlotSpellCastThisTurn",
    ),
    targetVitals: {
      kind: "monsterCreature",
      hitPoints: numberFromQuintInt(
        state["qTargetHitPoints"],
        "qTargetHitPoints",
      ),
      hitPointMaximum: numberFromQuintInt(
        state["qTargetHitPointMaximum"],
        "qTargetHitPointMaximum",
      ),
      temporaryHitPoints: numberFromQuintInt(
        state["qTargetTemporaryHitPoints"],
        "qTargetTemporaryHitPoints",
      ),
      dead: booleanFromQuint(state["qTargetDead"], "qTargetDead"),
      unconscious: booleanFromQuint(
        state["qTargetUnconscious"],
        "qTargetUnconscious",
      ),
    },
  };
}

function sphereFromQuintState(
  state: Readonly<Record<string, unknown>>,
): FlamingSphereHazardRamState["sphere"] {
  const sphereActive = booleanFromQuint(
    state["qSphereActive"],
    "qSphereActive",
  );
  return sphereActive
    ? {
        tag: "active",
        damageDice: numberFromQuintInt(
          state["qSphereDamageDice"],
          "qSphereDamageDice",
        ),
        durationTicks: numberFromQuintInt(
          state["qSphereDurationTicks"],
          "qSphereDurationTicks",
        ),
        ramMaxMoveFeet: numberFromQuintInt(
          state["qSphereRamMaxMoveFeet"],
          "qSphereRamMaxMoveFeet",
        ),
      }
    : { tag: "absent" };
}

function compareFlamingSphereHazardRamState(
  runtime: FlamingSphereHazardRamState,
  quint: FlamingSphereHazardRamState,
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
