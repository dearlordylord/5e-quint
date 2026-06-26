// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

import { describe, expect, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  decodeReducerRoute,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
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

type RouteState<Surface extends string> = {
  readonly surface: Surface;
  readonly route: readonly ReducerRouteEvent[];
};

const REACTION_CASTING_TIME_ROUTE_SURFACE_BY_TAG = {
  FreshRouteSurface: "fresh",
  CounterspellEndedSpellCastRouteSurface: "counterspellEndedSpellCast",
  CounterspellAllowedSpellCastResumeRouteSurface:
    "counterspellAllowedSpellCastResume",
  HellishRebukeAfterDamageRouteSurface: "hellishRebukeAfterDamage",
} as const satisfies Readonly<Record<string, string>>;
type ReactionCastingTimeRouteSurface =
  (typeof REACTION_CASTING_TIME_ROUTE_SURFACE_BY_TAG)[keyof typeof REACTION_CASTING_TIME_ROUTE_SURFACE_BY_TAG];

const INTERRUPT_STACK_RESUME_ROUTE_SURFACE_BY_TAG = {
  FreshRouteSurface: "fresh",
  NestedDeclineResumedOuterInterruptRouteSurface:
    "nestedDeclineResumedOuterInterrupt",
  ActiveEffectMutationResumedRouteSurface: "activeEffectMutationResumed",
  ProcedureContinuationResolvedRouteSurface: "procedureContinuationResolved",
} as const satisfies Readonly<Record<string, string>>;
type InterruptStackResumeRouteSurface =
  (typeof INTERRUPT_STACK_RESUME_ROUTE_SURFACE_BY_TAG)[keyof typeof INTERRUPT_STACK_RESUME_ROUTE_SURFACE_BY_TAG];

const reactionCastingTimeRouteDriverSchema = {
  init: {},
  doCounterspellEndsSpellCast: {},
  doCounterspellAllowsSpellCastResume: {},
  doHellishRebukeAfterDamage: {},
  step: {},
} as const;

const interruptStackResumeRouteDriverSchema = {
  init: {},
  doNestedDeclineResumesOuterInterrupt: {},
  doShieldMutationResumesInterruptedAttack: {},
  doReplayRecordedProcedureFromRoot: {},
  step: {},
} as const;

type ReactionCastingTimeRouteDriverAction = Exclude<
  keyof typeof reactionCastingTimeRouteDriverSchema,
  "init" | "step"
>;
type InterruptStackResumeRouteDriverAction = Exclude<
  keyof typeof interruptStackResumeRouteDriverSchema,
  "init" | "step"
>;
type RouteReplaySequence<Surface extends string, Action extends string> = {
  readonly name: string;
  readonly action: Action;
  readonly expected: RouteState<Surface>;
};

const ROUTE_START_OWNER =
  "battleActionEconomy" satisfies ReducerRouteOwnerGroup;
const REACTION_SPELL_ROUTE_SUBJECT =
  "reactionSpell" satisfies ReducerRouteSubjectFamily;
const INTERRUPT_STACK_RESUME_ROUTE_SUBJECT =
  "interruptStackResume" satisfies ReducerRouteSubjectFamily;
const SLOT_SPELL_ROUTE_SUBJECT =
  "slotSpell" satisfies ReducerRouteSubjectFamily;
const SAVE_GATED_SPELL_ROUTE_SUBJECT =
  "saveGatedSpell" satisfies ReducerRouteSubjectFamily;
const WEAPON_ATTACK_ROUTE_SUBJECT =
  "weaponAttack" satisfies ReducerRouteSubjectFamily;

function routeState<const Surface extends string>(
  surface: Surface,
  route: readonly ReducerRouteEvent[],
): RouteState<Surface> {
  return { surface, route };
}

function routeHoles(
  ...values: ReducerRouteHole[]
): readonly ReducerRouteHole[] {
  return [...values].sort();
}

function routeDriverActionSet(
  schema: Readonly<Record<string, unknown>>,
): ReadonlySet<string> {
  return new Set(
    Object.keys(schema).filter(
      (action) => action !== "init" && action !== "step",
    ),
  );
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

function resolveRouteWithoutFill(input: {
  readonly subject: ReducerRouteSubjectFamily;
  readonly holes: readonly ReducerRouteHole[];
  readonly owner: ReducerRouteOwnerGroup;
}): ReducerRouteEvent {
  return {
    kind: "resolveBattleSubjectWithoutFill",
    subject: input.subject,
    holes: [...input.holes].sort(),
    owner: input.owner,
  };
}

function resolveInterruptRoute(input: {
  readonly subject: ReducerRouteSubjectFamily;
  readonly fill: ReducerRouteFill;
  readonly holes: readonly ReducerRouteHole[];
  readonly owner: ReducerRouteOwnerGroup;
}): ReducerRouteEvent {
  return {
    kind: "resolveBattleInterrupt",
    subject: input.subject,
    fill: input.fill,
    holes: [...input.holes].sort(),
    owner: input.owner,
  };
}

function reactionSpellDiscover(
  holes: readonly ReducerRouteHole[],
  owner: ReducerRouteOwnerGroup,
): ReducerRouteEvent {
  return discoverRoute({
    subject: REACTION_SPELL_ROUTE_SUBJECT,
    holes,
    owner,
  });
}

function slotSpellResolve(
  fill: ReducerRouteFill,
  holes: readonly ReducerRouteHole[],
  owner: ReducerRouteOwnerGroup,
): ReducerRouteEvent {
  return resolveRoute({
    subject: SLOT_SPELL_ROUTE_SUBJECT,
    fill,
    holes,
    owner,
  });
}

function reactionSpellInterrupt(
  holes: readonly ReducerRouteHole[],
  owner: ReducerRouteOwnerGroup,
): ReducerRouteEvent {
  return resolveInterruptRoute({
    subject: REACTION_SPELL_ROUTE_SUBJECT,
    fill: "interruptDecision",
    holes,
    owner,
  });
}

function pendingReactionDecisionRoute(): readonly ReducerRouteEvent[] {
  return [
    startRoute(),
    reactionSpellDiscover(
      routeHoles("interruptDecision"),
      "battleInterruptStack",
    ),
  ];
}

function counterspellEndedSpellCastRouteState(): RouteState<"counterspellEndedSpellCast"> {
  return routeState("counterspellEndedSpellCast", [
    ...pendingReactionDecisionRoute(),
    reactionSpellInterrupt(routeHoles(), "battleInterruptStack"),
    reactionSpellInterrupt(routeHoles(), "battleSpellSlotAndActionEconomy"),
  ]);
}

function counterspellAllowedSpellCastResumeRouteState(): RouteState<"counterspellAllowedSpellCastResume"> {
  return routeState("counterspellAllowedSpellCastResume", [
    ...pendingReactionDecisionRoute(),
    reactionSpellInterrupt(routeHoles("rolledDice"), "battleInterruptStack"),
    reactionSpellInterrupt(
      routeHoles("rolledDice"),
      "battleSpellSlotAndActionEconomy",
    ),
    slotSpellResolve("rolledDice", routeHoles(), "battleHitPoint"),
    slotSpellResolve(
      "rolledDice",
      routeHoles(),
      "battleSpellSlotAndActionEconomy",
    ),
  ]);
}

function hellishRebukeAfterDamageRouteState(): RouteState<"hellishRebukeAfterDamage"> {
  return routeState("hellishRebukeAfterDamage", [
    ...pendingReactionDecisionRoute(),
    reactionSpellInterrupt(routeHoles(), "battleInterruptStack"),
    reactionSpellInterrupt(routeHoles(), "battleSpellSlotAndActionEconomy"),
    reactionSpellInterrupt(routeHoles(), "battleHitPoint"),
  ]);
}

function createReactionCastingTimeRouteDriver() {
  return defineDriver(reactionCastingTimeRouteDriverSchema, () => {
    let state = routeState<ReactionCastingTimeRouteSurface>("fresh", [
      startRoute(),
    ]);
    const reset = (): void => {
      state = routeState("fresh", [startRoute()]);
    };

    return {
      init: reset,
      doCounterspellEndsSpellCast: () => {
        state = counterspellEndedSpellCastRouteState();
      },
      doCounterspellAllowsSpellCastResume: () => {
        state = counterspellAllowedSpellCastResumeRouteState();
      },
      doHellishRebukeAfterDamage: () => {
        state = hellishRebukeAfterDamageRouteState();
      },
      step: () => {},
      getState: () => state,
    };
  });
}

function interruptResumeDiscover(
  holes: readonly ReducerRouteHole[],
  owner: ReducerRouteOwnerGroup,
): ReducerRouteEvent {
  return discoverRoute({
    subject: INTERRUPT_STACK_RESUME_ROUTE_SUBJECT,
    holes,
    owner,
  });
}

function saveGatedSpellResolve(
  fill: ReducerRouteFill,
  holes: readonly ReducerRouteHole[],
  owner: ReducerRouteOwnerGroup,
): ReducerRouteEvent {
  return resolveRoute({
    subject: SAVE_GATED_SPELL_ROUTE_SUBJECT,
    fill,
    holes,
    owner,
  });
}

function weaponAttackResolve(
  fill: ReducerRouteFill,
  holes: readonly ReducerRouteHole[],
  owner: ReducerRouteOwnerGroup,
): ReducerRouteEvent {
  return resolveRoute({
    subject: WEAPON_ATTACK_ROUTE_SUBJECT,
    fill,
    holes,
    owner,
  });
}

function interruptResumeResolveWithoutFill(
  holes: readonly ReducerRouteHole[],
  owner: ReducerRouteOwnerGroup,
): ReducerRouteEvent {
  return resolveRouteWithoutFill({
    subject: INTERRUPT_STACK_RESUME_ROUTE_SUBJECT,
    holes,
    owner,
  });
}

function interruptResumeDecision(
  holes: readonly ReducerRouteHole[],
  owner: ReducerRouteOwnerGroup,
): ReducerRouteEvent {
  return resolveInterruptRoute({
    subject: INTERRUPT_STACK_RESUME_ROUTE_SUBJECT,
    fill: "interruptDecision",
    holes,
    owner,
  });
}

function pendingInterruptDecisionRoute(): readonly ReducerRouteEvent[] {
  return [
    startRoute(),
    interruptResumeDiscover(
      routeHoles("interruptDecision"),
      "battleInterruptStack",
    ),
  ];
}

function pendingDamageContinuationRoute(): readonly ReducerRouteEvent[] {
  return [
    startRoute(),
    interruptResumeDiscover(routeHoles("rolledDice"), "battleInterruptStack"),
  ];
}

function nestedDeclineResumedOuterInterruptRouteState(): RouteState<"nestedDeclineResumedOuterInterrupt"> {
  return routeState("nestedDeclineResumedOuterInterrupt", [
    ...pendingInterruptDecisionRoute(),
    interruptResumeDecision(
      routeHoles("savingThrowOutcome"),
      "battleInterruptStack",
    ),
    saveGatedSpellResolve(
      "savingThrowOutcome",
      routeHoles("interruptDecision"),
      "battleInterruptStack",
    ),
    interruptResumeDecision(routeHoles("rolledDice"), "battleInterruptStack"),
  ]);
}

function activeEffectMutationResumedRouteState(): RouteState<"activeEffectMutationResumed"> {
  return routeState("activeEffectMutationResumed", [
    ...pendingInterruptDecisionRoute(),
    interruptResumeDecision(routeHoles(), "battleSpellSlotAndActionEconomy"),
    interruptResumeDecision(routeHoles(), "battleActiveEffect"),
    interruptResumeDecision(routeHoles(), "battleInterruptStack"),
  ]);
}

function procedureContinuationResolvedRouteState(): RouteState<"procedureContinuationResolved"> {
  return routeState("procedureContinuationResolved", [
    ...pendingDamageContinuationRoute(),
    weaponAttackResolve("rolledDice", routeHoles(), "battleHitPoint"),
    interruptResumeResolveWithoutFill(routeHoles(), "battleInterruptStack"),
  ]);
}

function createInterruptStackResumeRouteDriver() {
  return defineDriver(interruptStackResumeRouteDriverSchema, () => {
    let state = routeState<InterruptStackResumeRouteSurface>("fresh", [
      startRoute(),
    ]);
    const reset = (): void => {
      state = routeState("fresh", [startRoute()]);
    };

    return {
      init: reset,
      doNestedDeclineResumesOuterInterrupt: () => {
        state = nestedDeclineResumedOuterInterruptRouteState();
      },
      doShieldMutationResumesInterruptedAttack: () => {
        state = activeEffectMutationResumedRouteState();
      },
      doReplayRecordedProcedureFromRoot: () => {
        state = procedureContinuationResolvedRouteState();
      },
      step: () => {},
      getState: () => state,
    };
  });
}

const reactionCastingTimeRouteStateCheck = stateCheck(
  (raw: unknown) =>
    normalizeRouteQuintState(
      raw,
      REACTION_CASTING_TIME_ROUTE_SURFACE_BY_TAG,
      "Reaction casting time route surface",
    ),
  compareRouteStates,
);

const interruptStackResumeRouteStateCheck = stateCheck(
  (raw: unknown) =>
    normalizeRouteQuintState(
      raw,
      INTERRUPT_STACK_RESUME_ROUTE_SURFACE_BY_TAG,
      "interrupt stack resume route surface",
    ),
  compareRouteStates,
);

const reactionRouteReplaySequences = [
  {
    name: "counterspell-ends-spell-cast",
    action: "doCounterspellEndsSpellCast",
    expected: counterspellEndedSpellCastRouteState(),
  },
  {
    name: "counterspell-allows-spell-cast-resume",
    action: "doCounterspellAllowsSpellCastResume",
    expected: counterspellAllowedSpellCastResumeRouteState(),
  },
  {
    name: "hellish-rebuke-after-damage",
    action: "doHellishRebukeAfterDamage",
    expected: hellishRebukeAfterDamageRouteState(),
  },
] as const satisfies ReadonlyArray<
  RouteReplaySequence<
    ReactionCastingTimeRouteSurface,
    ReactionCastingTimeRouteDriverAction
  >
>;

const interruptRouteReplaySequences = [
  {
    name: "nested-decline-resumes-outer-interrupt",
    action: "doNestedDeclineResumesOuterInterrupt",
    expected: nestedDeclineResumedOuterInterruptRouteState(),
  },
  {
    name: "shield-mutation-resumes-interrupted-attack",
    action: "doShieldMutationResumesInterruptedAttack",
    expected: activeEffectMutationResumedRouteState(),
  },
  {
    name: "replay-recorded-procedure-from-root",
    action: "doReplayRecordedProcedureFromRoot",
    expected: procedureContinuationResolvedRouteState(),
  },
] as const satisfies ReadonlyArray<
  RouteReplaySequence<
    InterruptStackResumeRouteSurface,
    InterruptStackResumeRouteDriverAction
  >
>;

describe("reaction and interrupt reducer route connectors", () => {
  it("replays every focused Reaction casting route path deterministically", async () => {
    const replayedActions = new Set<ReactionCastingTimeRouteDriverAction>();

    for (const sequence of reactionRouteReplaySequences) {
      const driver = createReactionCastingTimeRouteDriver()();
      replayedActions.add(sequence.action);
      const action = driver.actions[sequence.action];
      if (action === undefined) {
        throw new Error(
          `Missing Reaction route driver action ${sequence.action}.`,
        );
      }
      await action.handler({});
      const route = driver.getState?.();
      if (route === undefined) {
        throw new Error("Reaction route driver must expose getState.");
      }
      expect(route, sequence.name).toEqual(sequence.expected);
    }

    expect(replayedActions).toEqual(
      routeDriverActionSet(reactionCastingTimeRouteDriverSchema),
    );
  });

  it(
    "routes Reaction casting time through explicit battle owners",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-reaction-casting-time.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createReactionCastingTimeRouteDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(1),
        stateCheck: reactionCastingTimeRouteStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it("replays every focused interrupt-stack route path deterministically", async () => {
    const replayedActions = new Set<InterruptStackResumeRouteDriverAction>();

    for (const sequence of interruptRouteReplaySequences) {
      const driver = createInterruptStackResumeRouteDriver()();
      replayedActions.add(sequence.action);
      const action = driver.actions[sequence.action];
      if (action === undefined) {
        throw new Error(
          `Missing interrupt-stack route driver action ${sequence.action}.`,
        );
      }
      await action.handler({});
      const route = driver.getState?.();
      if (route === undefined) {
        throw new Error("Interrupt-stack route driver must expose getState.");
      }
      expect(route, sequence.name).toEqual(sequence.expected);
    }

    expect(replayedActions).toEqual(
      routeDriverActionSet(interruptStackResumeRouteDriverSchema),
    );
  });

  it(
    "routes interrupt stack resume through explicit battle owners",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-interrupt-stack-resume.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createInterruptStackResumeRouteDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(1),
        stateCheck: interruptStackResumeRouteStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function normalizeRouteQuintState<
  const SurfaceByTag extends Readonly<Record<string, string>>,
>(
  raw: unknown,
  surfaceByTag: SurfaceByTag,
  label: string,
): RouteState<SurfaceByTag[keyof SurfaceByTag]> {
  const state = quintStateRecord(raw);
  return {
    surface: quintVariantMappedValue(
      quintField(state, "qSurface"),
      "qSurface",
      surfaceByTag,
      label,
    ),
    route: decodeReducerRoute(quintField(state, "qRoute")),
  };
}

function compareRouteStates<Surface extends string>(
  spec: RouteState<Surface>,
  impl: RouteState<Surface>,
): boolean {
  try {
    expect(impl).toEqual(spec);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `${error.message}\nspec=${JSON.stringify(spec)}\nimpl=${JSON.stringify(impl)}`,
      );
    }
    throw error;
  }
  return true;
}
