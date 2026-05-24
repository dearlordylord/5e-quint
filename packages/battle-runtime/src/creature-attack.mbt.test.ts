// KERNEL-COVERAGE: parity-witness BATTLE.ATTACK.MINIMAL_RESOLUTION
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import {
  resolveCreatureAttack,
  type CreatureAttackState,
} from "./battle-reducer/creature-attack.ts";

const INITIAL_HP = 20;

const initialState: CreatureAttackState = {
  creatureAHp: INITIAL_HP,
  creatureBHp: INITIAL_HP,
};

const QuintIntAsNumber = Schema.transform(
  Schema.BigIntFromSelf,
  Schema.Number,
  { strict: true, decode: (n) => Number(n), encode: (n) => BigInt(n) },
);

const damageSchema = Schema.standardSchemaV1(QuintIntAsNumber);
const hitSchema = Schema.standardSchemaV1(Schema.Boolean);

const driverSchema = {
  init: {},
  doAttackerAAttacks: {
    damage: damageSchema,
    hit: hitSchema,
  },
  doAttackerBAttacks: {
    damage: damageSchema,
    hit: hitSchema,
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
  it("matches TS reducer against bounded random MBT traces", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../creature-attack.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createCreatureAttackDriver(),
      backend: "typescript",
      nTraces: 10,
      maxSteps: 6,
      stateCheck: creatureAttackStateCheck,
    });
  }, 120_000);
});

function normalizeCreatureAttackQuintState(
  raw: unknown,
): CreatureAttackState {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint creature-attack state object.");
  }
  const state: Readonly<Record<string, unknown>> = Object.fromEntries(
    Object.entries(raw),
  );
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

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "bigint") return Number(raw);
  throw new Error(`Expected Quint integer field ${field}.`);
}
