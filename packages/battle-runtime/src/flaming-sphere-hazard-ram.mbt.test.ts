// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE
import { describe, expect, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  booleanValue,
  defineDriver,
  focusedMbtMaxSteps,
  mbtPickSchemas,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintStateRecord,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.ts";
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

const driverSchema = {
  init: {
    slotLedgerLevel: mbtPickSchemas.int,
  },
  doCastFlamingSphere: {
    slotLevel: mbtPickSchemas.int,
  },
  doEndWithinFiveFeet: {
    savingThrowSucceeded: mbtPickSchemas.bool,
    rolledDamage: mbtPickSchemas.int,
  },
  doRam: {
    savingThrowSucceeded: mbtPickSchemas.bool,
    rolledDamage: mbtPickSchemas.int,
    moveFeet: mbtPickSchemas.int,
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
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-flaming-sphere-hazard-ram.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createFlamingSphereHazardRamDriver(),
      backend: "typescript",
      nTraces: mbtTraceCount(),
      maxSteps: focusedMbtMaxSteps(6),
      stateCheck: flamingSphereHazardRamStateCheck,
    });
  }, MBT_TEST_TIMEOUT_MS);
});

function normalizeFlamingSphereHazardRamQuintState(
  raw: unknown,
): FlamingSphereHazardRamState {
  const state = quintStateRecord(raw);
  return {
    actionAvailable: booleanValue(
      state["qActionAvailable"],
      "qActionAvailable",
    ),
    casterHasBonusAction: booleanValue(
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
    slotSpellCastThisTurn: booleanValue(
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
      dead: booleanValue(state["qTargetDead"], "qTargetDead"),
      unconscious: booleanValue(
        state["qTargetUnconscious"],
        "qTargetUnconscious",
      ),
    },
  };
}

function sphereFromQuintState(
  state: Readonly<Record<string, unknown>>,
): FlamingSphereHazardRamState["sphere"] {
  const sphereActive = booleanValue(
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
