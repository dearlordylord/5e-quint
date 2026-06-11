// KERNEL-COVERAGE: parity-witness BATTLE.ATTACK.MINIMAL_RESOLUTION
import { describe, expect, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
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
  resolveCreatureAttack,
  type CreatureAttackState,
} from "./battle-reducer/creature-attack.ts";

const INITIAL_HP = 20;

const initialState: CreatureAttackState = {
  creatureAHp: INITIAL_HP,
  creatureBHp: INITIAL_HP,
};

const driverSchema = {
  init: {},
  doAttackerAAttacks: {
    damage: mbtPickSchemas.int,
    hit: mbtPickSchemas.bool,
  },
  doAttackerBAttacks: {
    damage: mbtPickSchemas.int,
    hit: mbtPickSchemas.bool,
  },
  step: {},
} as const;

function createCreatureAttackDriver() {
  return defineDriver(driverSchema, () => {
    let state: CreatureAttackState = initialState;
    return {
      init: () => {
        state = initialState;
      },
      doAttackerAAttacks: ({ damage, hit }) => {
        state = resolveCreatureAttack(state, "attackerA", { damage, hit });
      },
      doAttackerBAttacks: ({ damage, hit }) => {
        state = resolveCreatureAttack(state, "attackerB", { damage, hit });
      },
      step: () => {},
      getState: () => state,
    };
  });
}

const creatureAttackStateCheck = stateCheck(
  normalizeCreatureAttackQuintState,
  compareCreatureAttackState,
);

describe("creature-attack minimal MBT parity", () => {
  it(
    "matches TS reducer against bounded random MBT traces",
    async () => {
      await run({
        spec: mbtSpecPath(import.meta.dirname, "creature-attack.mbt.qnt"),
        init: "init",
        step: "step",
        driver: createCreatureAttackDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(6),
        stateCheck: creatureAttackStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function normalizeCreatureAttackQuintState(raw: unknown): CreatureAttackState {
  const state = quintStateRecord(raw);
  return {
    creatureAHp: numberFromQuintInt(state["qCreatureAHp"], "qCreatureAHp"),
    creatureBHp: numberFromQuintInt(state["qCreatureBHp"], "qCreatureBHp"),
  };
}

function compareCreatureAttackState(
  runtime: CreatureAttackState,
  quint: CreatureAttackState,
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
