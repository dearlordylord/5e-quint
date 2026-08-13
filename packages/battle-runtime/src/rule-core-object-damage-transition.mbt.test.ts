// KERNEL-COVERAGE: parity-witness BATTLE.DAMAGE.OBJECT_DAMAGE_TRANSITION
import {
  MBT_TEST_TIMEOUT_MS,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.test-support.ts";
import { describe, expect, it } from "vitest";
import { damageAmount, Hp } from "@dnd/shared/types";
import { battleObjectId } from "./identity.ts";
import { objectDamageOutcomeFromComponents } from "./battle-reducer/object-damage.ts";

const scenarios = [
  "init",
  "mixed-immune-threshold-blocked",
  "mixed-immune-threshold-passed",
] as const;
type Scenario = (typeof scenarios)[number];
type ReplayScenario = Exclude<Scenario, "init">;

type Projection = {
  readonly scenario: Scenario;
  readonly rolledDamage: number;
  readonly damageAfterImmunities: number;
  readonly damageThreshold: number;
  readonly immuneComponentDamage: number;
  readonly otherComponentDamage: number;
  readonly effectiveDamage: number;
  readonly nextHitPoints: number;
  readonly replayIndex: number;
};

const initialProjection: Projection = {
  scenario: "init",
  rolledDamage: 0,
  damageAfterImmunities: 0,
  damageThreshold: 0,
  immuneComponentDamage: 0,
  otherComponentDamage: 0,
  effectiveDamage: 0,
  nextHitPoints: 30,
  replayIndex: 0,
};

const driverSchema = {
  init: {},
  doMixedImmuneThresholdBlocked: {},
  doMixedImmuneThresholdPassed: {},
  step: {},
} as const;

function createDriver() {
  return defineDriver(driverSchema, () => {
    let projection = initialProjection;
    return {
      init: () => {
        projection = initialProjection;
      },
      doMixedImmuneThresholdBlocked: () => {
        projection = applyScenario("mixed-immune-threshold-blocked");
      },
      doMixedImmuneThresholdPassed: () => {
        projection = applyScenario("mixed-immune-threshold-passed");
      },
      step: () => {},
      getState: () => projection,
    };
  });
}

describe("rule-core object damage transition deterministic QNT replay", () => {
  it(
    "filters immune components before applying the attack damage threshold",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "rule-core-object-damage-transition.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(2),
        stateCheck: stateCheck(normalizeQuintState, compareState),
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function applyScenario(scenario: ReplayScenario): Projection {
  const passed = scenario === "mixed-immune-threshold-passed";
  const outcome = objectDamageOutcomeFromComponents({
    objectId: battleObjectId("ordinary_object_parity"),
    components: [
      {
        damageType: passed ? "psychic" : "poison",
        amount: passed ? 20 : 9,
      },
      { damageType: "slashing", amount: passed ? 9 : 7 },
    ],
    disposition: {
      kind: "hitPointsWithDamageThreshold",
      hitPoints: Hp(30),
      damageThreshold: damageAmount(8),
    },
  });
  if (outcome.kind !== "hitPoints") {
    throw new Error("Expected Hit Point object damage outcome.");
  }
  return {
    scenario,
    rolledDamage: Number(outcome.rolledDamage),
    damageAfterImmunities: Number(outcome.damageAfterImmunities),
    damageThreshold: Number(outcome.damageThreshold ?? 0),
    immuneComponentDamage: Number(outcome.components[0].rolledDamage),
    otherComponentDamage: Number(outcome.components[1].rolledDamage),
    effectiveDamage: Number(outcome.effectiveDamage),
    nextHitPoints: Number(outcome.nextHitPoints),
    replayIndex: passed ? 2 : 1,
  };
}

function normalizeQuintState(raw: unknown): Projection {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected object damage transition Quint state.");
  }
  const state: Readonly<Record<string, unknown>> = Object.fromEntries(
    Object.entries(raw),
  );
  const scenario = state["qScenario"];
  if (typeof scenario !== "string" || !isScenario(scenario)) {
    throw new Error(
      `Unknown object damage transition scenario ${String(scenario)}.`,
    );
  }
  return {
    scenario,
    rolledDamage: numberFromQuintInt(state["qRolledDamage"], "qRolledDamage"),
    damageAfterImmunities: numberFromQuintInt(
      state["qDamageAfterImmunities"],
      "qDamageAfterImmunities",
    ),
    damageThreshold: numberFromQuintInt(
      state["qDamageThreshold"],
      "qDamageThreshold",
    ),
    immuneComponentDamage: numberFromQuintInt(
      state["qImmuneComponentDamage"],
      "qImmuneComponentDamage",
    ),
    otherComponentDamage: numberFromQuintInt(
      state["qOtherComponentDamage"],
      "qOtherComponentDamage",
    ),
    effectiveDamage: numberFromQuintInt(
      state["qEffectiveDamage"],
      "qEffectiveDamage",
    ),
    nextHitPoints: numberFromQuintInt(
      state["qNextHitPoints"],
      "qNextHitPoints",
    ),
    replayIndex: numberFromQuintInt(state["qReplayIndex"], "qReplayIndex"),
  };
}

function isScenario(value: string): value is Scenario {
  return scenarios.some((candidate) => candidate === value);
}

function compareState(runtime: Projection, quint: Projection): boolean {
  expect(runtime).toEqual(quint);
  return true;
}
