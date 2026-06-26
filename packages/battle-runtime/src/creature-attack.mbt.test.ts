// KERNEL-COVERAGE: parity-witness BATTLE.ATTACK.MINIMAL_RESOLUTION
import { describe, expect, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  decodeReducerRoute,
  defineDriver,
  focusedMbtMaxSteps,
  mbtPickSchemas,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintField,
  quintStateRecord,
  reducerRouteDiscoverBattleActs,
  reducerRouteResolveBattleSubject,
  reducerRouteStartBattle,
  run,
  stateCheck,
  type ReducerRouteEvent,
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
type CreatureAttackRouteState = CreatureAttackState & {
  readonly route: readonly ReducerRouteEvent[];
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
  return createCreatureAttackDriverWithProjection((state) => state);
}

function createCreatureAttackRouteDriver() {
  return createCreatureAttackDriverWithProjection((state, route) => ({
    ...state,
    route,
  }));
}

function createCreatureAttackDriverWithProjection<State>(
  projectState: (
    state: CreatureAttackState,
    route: readonly ReducerRouteEvent[],
  ) => State,
) {
  return defineDriver<typeof driverSchema, State>(driverSchema, () => {
    let state: CreatureAttackState = initialState;
    let route: readonly ReducerRouteEvent[] = [];
    function recordAttackRoute(hit: boolean): void {
      const discoveredRoute = [
        ...route,
        reducerRouteDiscoverBattleActs({
          subject: "creatureAttack",
          holes: [{ kind: "attackRoll" }],
          owner: "battleAttackRoll",
        }),
      ];
      const attackRoute = [
        ...discoveredRoute,
        reducerRouteResolveBattleSubject({
          subject: "creatureAttack",
          fill: "attackRoll",
          holes: hit ? [{ kind: "rolledDice" }] : [],
          owner: "battleAttackRoll",
        }),
      ];
      route = hit
        ? [
            ...attackRoute,
            reducerRouteResolveBattleSubject({
              subject: "creatureAttack",
              fill: "rolledDice",
              holes: [],
              owner: "battleHitPoint",
            }),
          ]
        : attackRoute;
    }
    return {
      init: () => {
        state = initialState;
        route = [reducerRouteStartBattle("battleActionEconomy")];
      },
      doAttackerAAttacks: ({ damage, hit }) => {
        state = resolveCreatureAttack(state, "attackerA", { damage, hit });
        recordAttackRoute(hit);
      },
      doAttackerBAttacks: ({ damage, hit }) => {
        state = resolveCreatureAttack(state, "attackerB", { damage, hit });
        recordAttackRoute(hit);
      },
      step: () => {},
      getState: () => projectState(state, route),
    };
  });
}

const creatureAttackStateCheck = stateCheck(
  normalizeCreatureAttackQuintState,
  compareCreatureAttackState,
);
const creatureAttackRouteStateCheck = stateCheck(
  normalizeCreatureAttackRouteQuintState,
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

  it(
    "routes minimal creature attacks through the shared reducer-route vocabulary",
    async () => {
      await run({
        spec: mbtSpecPath(import.meta.dirname, "creature-attack.route.mbt.qnt"),
        init: "init",
        step: "step",
        driver: createCreatureAttackRouteDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(6),
        stateCheck: creatureAttackRouteStateCheck,
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

function normalizeCreatureAttackRouteQuintState(
  raw: unknown,
): CreatureAttackRouteState {
  const state = quintStateRecord(raw);
  return {
    ...normalizeCreatureAttackQuintState(raw),
    route: decodeReducerRoute(quintField(state, "qRoute")),
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
