// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

import { describe, expect, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  booleanField,
  decodeReducerRoute,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintField,
  quintStateRecord,
  quintVariantMappedValue,
  run,
  stateCheck,
  type ReducerRouteEvent,
  type ReducerRouteFill,
  type ReducerRouteHole,
  type ReducerRouteOwnerGroup,
  type ReducerRouteSubjectFamily,
} from "./battle-runtime-mbt-driver-kit.ts";

type ZeroHitPointStabilizationRouteSurface =
  (typeof ZERO_HIT_POINT_STABILIZATION_ROUTE_SURFACE_BY_TAG)[keyof typeof ZERO_HIT_POINT_STABILIZATION_ROUTE_SURFACE_BY_TAG];

type ZeroHitPointStabilizationRouteState = {
  readonly surface: ZeroHitPointStabilizationRouteSurface;
  readonly targetHp: number;
  readonly targetTemporaryHp: number;
  readonly targetStable: boolean;
  readonly targetUnconscious: boolean;
  readonly targetDead: boolean;
  readonly targetDeathSuccesses: number;
  readonly targetDeathFailures: number;
  readonly route: readonly ReducerRouteEvent[];
};

const ZERO_HIT_POINT_STABILIZATION_ROUTE_SURFACE_BY_TAG = {
  FreshRouteSurface: "fresh",
  ZeroHitPointStabilizationTargetFrontierRouteSurface:
    "zeroHitPointStabilizationTargetFrontier",
  ZeroHitPointStabilizationResolvedRouteSurface:
    "zeroHitPointStabilizationResolved",
} as const satisfies Readonly<Record<string, string>>;

const zeroHitPointStabilizationRouteDriverSchema = {
  init: {},
  doDiscoverZeroHitPointStabilizationTarget: {},
  doResolveZeroHitPointStabilizationTarget: {},
  step: {},
} as const;

const ROUTE_START_OWNER =
  "battleActionEconomy" satisfies ReducerRouteOwnerGroup;
const ZERO_HIT_POINT_STABILIZATION_ROUTE_SUBJECT =
  "zeroHitPointStabilization" satisfies ReducerRouteSubjectFamily;

function routeState(
  input: Omit<ZeroHitPointStabilizationRouteState, "route"> & {
    readonly route: readonly ReducerRouteEvent[];
  },
): ZeroHitPointStabilizationRouteState {
  return input;
}

function routeHoles(
  ...values: ReducerRouteHole[]
): readonly ReducerRouteHole[] {
  return [...values].sort();
}

function startRoute(): ReducerRouteEvent {
  return { kind: "startBattle", owner: ROUTE_START_OWNER };
}

function discoverRoute(input: {
  readonly subject: ReducerRouteSubjectFamily;
  readonly holes: readonly ReducerRouteHole[];
  readonly owner: ReducerRouteOwnerGroup;
}): ReducerRouteEvent {
  return {
    kind: "discoverBattleActs",
    subject: input.subject,
    holes: [...input.holes].sort(),
    owner: input.owner,
  };
}

function resolveRoute(input: {
  readonly subject: ReducerRouteSubjectFamily;
  readonly fill: ReducerRouteFill;
  readonly holes: readonly ReducerRouteHole[];
  readonly owner: ReducerRouteOwnerGroup;
}): ReducerRouteEvent {
  return {
    kind: "resolveBattleSubject",
    subject: input.subject,
    fill: input.fill,
    holes: [...input.holes].sort(),
    owner: input.owner,
  };
}

function initialState(): ZeroHitPointStabilizationRouteState {
  return routeState({
    surface: "fresh",
    targetHp: 0,
    targetTemporaryHp: 3,
    targetStable: false,
    targetUnconscious: true,
    targetDead: false,
    targetDeathSuccesses: 2,
    targetDeathFailures: 1,
    route: [startRoute()],
  });
}

function createZeroHitPointStabilizationRouteDriver() {
  return defineDriver(zeroHitPointStabilizationRouteDriverSchema, () => {
    let state = initialState();
    const reset = (): void => {
      state = initialState();
    };

    return {
      init: reset,
      doDiscoverZeroHitPointStabilizationTarget: () => {
        state = routeState({
          ...state,
          surface: "zeroHitPointStabilizationTargetFrontier",
          route: [
            ...state.route,
            discoverRoute({
              subject: ZERO_HIT_POINT_STABILIZATION_ROUTE_SUBJECT,
              holes: routeHoles("targetChoice"),
              owner: ROUTE_START_OWNER,
            }),
          ],
        });
      },
      doResolveZeroHitPointStabilizationTarget: () => {
        state = routeState({
          surface: "zeroHitPointStabilizationResolved",
          targetHp: 0,
          targetTemporaryHp: state.targetTemporaryHp,
          targetStable: true,
          targetUnconscious: true,
          targetDead: false,
          targetDeathSuccesses: 0,
          targetDeathFailures: 0,
          route: [
            ...state.route,
            resolveRoute({
              subject: ZERO_HIT_POINT_STABILIZATION_ROUTE_SUBJECT,
              fill: "targetChoice",
              holes: routeHoles(),
              owner: "battleHitPointAndZeroHpLifecycle",
            }),
          ],
        });
      },
      step: () => {},
      getState: () => state,
    };
  });
}

const zeroHitPointStabilizationRouteStateCheck = stateCheck(
  normalizeZeroHitPointStabilizationRouteQuintState,
  (
    spec: ZeroHitPointStabilizationRouteState,
    impl: ZeroHitPointStabilizationRouteState,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);

describe("zero-Hit-Point lifecycle reducer route connectors", () => {
  it(
    "routes stabilization through the zero-Hit-Point lifecycle owner",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-zero-hit-point-stabilization.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createZeroHitPointStabilizationRouteDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(2),
        stateCheck: zeroHitPointStabilizationRouteStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function normalizeZeroHitPointStabilizationRouteQuintState(
  raw: unknown,
): ZeroHitPointStabilizationRouteState {
  const state = quintStateRecord(raw);
  return {
    surface: quintVariantMappedValue(
      quintField(state, "qSurface"),
      "qSurface",
      ZERO_HIT_POINT_STABILIZATION_ROUTE_SURFACE_BY_TAG,
      "zero-Hit-Point stabilization route surface",
    ),
    targetHp: numberFromQuintInt(
      quintField(state, "qTargetHp"),
      "qTargetHp",
    ),
    targetTemporaryHp: numberFromQuintInt(
      quintField(state, "qTargetTemporaryHp"),
      "qTargetTemporaryHp",
    ),
    targetStable: booleanField(state, "qTargetStable"),
    targetUnconscious: booleanField(state, "qTargetUnconscious"),
    targetDead: booleanField(state, "qTargetDead"),
    targetDeathSuccesses: numberFromQuintInt(
      quintField(state, "qTargetDeathSuccesses"),
      "qTargetDeathSuccesses",
    ),
    targetDeathFailures: numberFromQuintInt(
      quintField(state, "qTargetDeathFailures"),
      "qTargetDeathFailures",
    ),
    route: decodeReducerRoute(quintField(state, "qRoute")),
  };
}
