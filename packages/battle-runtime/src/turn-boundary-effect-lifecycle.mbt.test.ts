// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.TURN_BOUNDARY_EFFECT_LIFECYCLE_ORDERING
// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md#The Order of Combat: combat
//   advances through initiative-ordered turns and then the next round.
// - .references/srd-5.2.1/Rules-Glossary.md#Simultaneous Effects: multiple
//   same-timing effects on a turn have a table-chosen order.
// - .references/srd-5.2.1/Rules-Glossary.md#Reaction and #Ready Action:
//   effects may last until the start of a creature's next turn.
// - .references/srd-5.2.1/Rules-Glossary.md#Burning: start-of-turn damage is a
//   rules-defined turn-boundary trigger shape.
// - UBIQUITOUS_LANGUAGE.md: Boundary Crossing, Spell Effect, Reaction, Timer.
// Boundary: bounded source/target fixture; not exhaustive same-timing ordering.
// Death Saving Throw resolution ordering is outside this witness; the mixed
// boundary case asserts only that the table receives the required order choice.
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  difficultyClass,
  Hp,
  NonNegativeInteger,
  Round,
} from "@dnd/shared/types";
import {
  battleProcedureExecutionCursor,
  battleProcedureExecutionRef,
} from "./identity.ts";
import { describe, expect, it } from "vitest";
import { Result, Schema } from "effect";

import {
  MBT_TEST_TIMEOUT_MS,
  assertWitnessProtocolConsistentWithScenario,
  booleanField,
  decodeReducerRoute,
  decodeWitnessProtocolState,
  defineDriver,
  focusedMbtMaxSteps,
  quintField,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintRecordField,
  quintStateRecord,
  quintVariantTag,
  quintVariantValue,
  run,
  stateCheck,
  type ReducerRouteEvent,
} from "./battle-runtime-mbt-driver-kit.test-support.ts";
import {
  characterSeed,
  damageRollFillWithGroups,
  fighterId,
  findAct,
  findHole,
  goblinId,
  magicSubject,
  resolveBattleSubject,
  savingThrowOutcomeFill,
  spellRecord,
  startBattleSessionRight,
  startBattleRight,
  wizardId,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  battleReducerStartRouteEvent,
  battleId,
  BattleSnapshotSchema,
  currentBattleCheckpointFrontierEnvelope,
  endTurn,
  resolveBattleRuntimeSubject,
  snapshotBattle,
  type ActiveOngoingFeatureOccurrence,
  type BattleFill,
  type BattleCreatureState,
  type BattleResolutionResult,
  type BattleRuntimeSession,
  type BattleSubject,
  type BattleProcedureExecutionRef,
  type BattleHole,
  type BattleState,
  type OngoingFeatureSourceKey,
} from "./index.ts";
import type { UnitFeatureProcedureExecution } from "./character-execution-admission.ts";
import {
  battleStateWithLowLevelSourceOwnedEffectOccurrenceForTest,
  type LowLevelEffectOccurrenceTemplate,
} from "./low-level-effect-occurrence.test-support.ts";

type TurnBoundaryLifecycleScenario =
  | "init"
  | "targetStartTurnDamagePending"
  | "targetStartTurnSavePending"
  | "targetStartTurnResolved"
  | "sourceNextTurnPending"
  | "sourceNextTurnResolved";

type TurnBoundaryActor = "sourceTurn" | "targetTurn";

type TurnBoundaryHoleOrder =
  | "noBoundaryHoles"
  | "turnStartDamageThenSave"
  | "turnEndDamageOnly";

const scenarioByQuintTag = {
  Init: "init",
  TargetStartTurnDamagePending: "targetStartTurnDamagePending",
  TargetStartTurnSavePending: "targetStartTurnSavePending",
  TargetStartTurnResolved: "targetStartTurnResolved",
  SourceNextTurnPending: "sourceNextTurnPending",
  SourceNextTurnResolved: "sourceNextTurnResolved",
} as const satisfies Readonly<Record<string, TurnBoundaryLifecycleScenario>>;

const actorByQuintTag = {
  SourceTurn: "sourceTurn",
  TargetTurn: "targetTurn",
} as const satisfies Readonly<Record<string, TurnBoundaryActor>>;

const holeOrderByQuintTag = {
  NoBoundaryHoles: "noBoundaryHoles",
  TurnStartDamageThenSave: "turnStartDamageThenSave",
  TurnEndDamageOnly: "turnEndDamageOnly",
} as const satisfies Readonly<Record<string, TurnBoundaryHoleOrder>>;

type TurnBoundaryLifecycleHole =
  | "turnStartDamage"
  | "turnStartSave"
  | "turnEndDamage"
  | "turnBoundaryLifecycle";

type TurnBoundaryOpenRequest =
  | "startTurnSpellDamageAndSave"
  | "outgoingEndTurn";

type TurnBoundaryLifecycleFrontier =
  | { readonly kind: "noOpenFrontier" }
  | {
      readonly kind: "openTurnBoundary";
      readonly durableCurrentTurnOwner: TurnBoundaryActor;
      readonly replayRootOwner: TurnBoundaryActor;
      readonly pendingProcedureOwner: TurnBoundaryActor;
      readonly request: TurnBoundaryOpenRequest;
      readonly sourceTurnOwner: TurnBoundaryActor;
      readonly sourceTurnRound: number;
    };

type TurnBoundaryLifecycleProjection = {
  readonly scenario: TurnBoundaryLifecycleScenario;
  readonly actor: TurnBoundaryActor;
  readonly frontier: TurnBoundaryLifecycleFrontier;
  readonly round: number;
  readonly targetHp: number;
  readonly turnStartDamageActive: boolean;
  readonly turnEndDamageActive: boolean;
  readonly untilNextTurnActive: boolean;
  readonly startTurnOngoingFeatureActive: boolean;
  readonly endTurnOngoingFeatureActive: boolean;
  readonly turnStartDamageAppliedBeforeEndDamage: boolean;
  readonly turnEndDamageAppliedBeforeExpiry: boolean;
  readonly endTurnOngoingExpiredAtTargetEnd: boolean;
  readonly untilNextTurnExpiredAtSourceStart: boolean;
  readonly startTurnOngoingExpiredAtSourceStart: boolean;
  readonly turnStartDurationExpiredAfterRoundTick: boolean;
  readonly lastHoleOrder: TurnBoundaryHoleOrder;
};

type TurnBoundaryLifecycleRuntimeState = {
  readonly session: BattleRuntimeSession;
  readonly envelope: ReturnType<typeof currentBattleCheckpointFrontierEnvelope>;
  readonly pendingFills: readonly BattleFill[];
  readonly effectProcedureRefs: TurnBoundaryEffectProcedureRefs;
  readonly scenario: TurnBoundaryLifecycleScenario;
  readonly turnStartDamageAppliedBeforeEndDamage: boolean;
  readonly turnEndDamageAppliedBeforeExpiry: boolean;
  readonly endTurnOngoingExpiredAtTargetEnd: boolean;
  readonly untilNextTurnExpiredAtSourceStart: boolean;
  readonly startTurnOngoingExpiredAtSourceStart: boolean;
  readonly turnStartDurationExpiredAfterRoundTick: boolean;
  readonly lastHoleOrder: TurnBoundaryHoleOrder;
};

type TurnBoundaryEffectProcedureRefs = {
  readonly turnStartDamage: BattleProcedureExecutionRef;
  readonly turnEndDamage: BattleProcedureExecutionRef;
  readonly untilNextTurn: BattleProcedureExecutionRef;
};

type TurnBoundaryRuntimeResolutionResult = ReturnType<
  typeof resolveBattleRuntimeSubject
>;
type TurnBoundaryRuntimeNeedsHoles = Extract<
  TurnBoundaryRuntimeResolutionResult,
  { readonly tag: "needsHoles" }
>;
type TurnBoundaryOrdinaryHolesResultBase = Extract<
  BattleResolutionResult,
  { readonly tag: "needsHoles" }
>;
type TurnBoundaryOrdinaryHolesResult = TurnBoundaryOrdinaryHolesResultBase & {
  readonly frontier: Extract<
    TurnBoundaryOrdinaryHolesResultBase["frontier"],
    { readonly kind: "holes" }
  >;
};
type TurnBoundaryRuntimeResolved = Extract<
  TurnBoundaryRuntimeResolutionResult,
  { readonly tag: "resolved" }
>;
type TurnBoundaryPendingProcedure = Extract<
  ReturnType<typeof currentBattleCheckpointFrontierEnvelope>["frontier"],
  { readonly kind: "holes" }
>["pendingProcedure"];
type TurnBoundaryProcedure = Extract<
  TurnBoundaryPendingProcedure,
  { readonly kind: "turnBoundary" }
>;

type TurnBoundaryLifecycleDriverAction =
  | "doDiscoverTargetStartTurn"
  | "doFillTargetStartTurnDamage"
  | "doResolveTargetStartTurn"
  | "doDiscoverSourceNextTurn"
  | "doResolveSourceNextTurn";

type TurnBoundaryLifecycleReplaySequence = {
  readonly name: string;
  readonly actions: readonly TurnBoundaryLifecycleDriverAction[];
  readonly expected: TurnBoundaryLifecycleProjection;
};

type TurnBoundaryRouteSurface =
  | "fresh"
  | "targetStartTurnResolved"
  | "sourceNextTurnResolved";

type TurnBoundaryRouteProjection = {
  readonly surface: TurnBoundaryRouteSurface;
  readonly route: readonly ReducerRouteEvent[];
};

const turnBoundaryRouteSurfaceByQuintTag = {
  FreshRouteSurface: "fresh",
  TargetStartTurnResolvedRouteSurface: "targetStartTurnResolved",
  SourceNextTurnResolvedRouteSurface: "sourceNextTurnResolved",
} as const satisfies Readonly<Record<string, TurnBoundaryRouteSurface>>;

const initialTargetHp = 10;
const turnStartDamageRoll = 2;
const turnEndDamageRoll = 3;

const driverSchema = {
  init: {},
  doDiscoverTargetStartTurn: {},
  doFillTargetStartTurnDamage: {},
  doResolveTargetStartTurn: {},
  doDiscoverSourceNextTurn: {},
  doResolveSourceNextTurn: {},
  step: {},
} as const;

const routeDriverSchema = {
  init: {},
  doResolveTargetStartTurn: {},
  doResolveSourceNextTurn: {},
  step: {},
} as const;

const noOpenFrontier = {
  kind: "noOpenFrontier",
} as const satisfies TurnBoundaryLifecycleFrontier;

const targetStartTurnFrontier = {
  kind: "openTurnBoundary",
  durableCurrentTurnOwner: "sourceTurn",
  replayRootOwner: "sourceTurn",
  pendingProcedureOwner: "targetTurn",
  request: "startTurnSpellDamageAndSave",
  sourceTurnOwner: "targetTurn",
  sourceTurnRound: 1,
} as const satisfies TurnBoundaryLifecycleFrontier;

const sourceNextTurnFrontier = {
  kind: "openTurnBoundary",
  durableCurrentTurnOwner: "targetTurn",
  replayRootOwner: "targetTurn",
  pendingProcedureOwner: "targetTurn",
  request: "outgoingEndTurn",
  sourceTurnOwner: "sourceTurn",
  sourceTurnRound: 2,
} as const satisfies TurnBoundaryLifecycleFrontier;

function expectedLifecycleProjection(
  overrides: Partial<TurnBoundaryLifecycleProjection>,
): TurnBoundaryLifecycleProjection {
  return {
    scenario: "init",
    actor: "sourceTurn",
    frontier: noOpenFrontier,
    round: 1,
    targetHp: initialTargetHp,
    turnStartDamageActive: true,
    turnEndDamageActive: true,
    untilNextTurnActive: true,
    startTurnOngoingFeatureActive: true,
    endTurnOngoingFeatureActive: true,
    turnStartDamageAppliedBeforeEndDamage: false,
    turnEndDamageAppliedBeforeExpiry: false,
    endTurnOngoingExpiredAtTargetEnd: false,
    untilNextTurnExpiredAtSourceStart: false,
    startTurnOngoingExpiredAtSourceStart: false,
    turnStartDurationExpiredAfterRoundTick: false,
    lastHoleOrder: "noBoundaryHoles",
    ...overrides,
  };
}

const replaySequences = [
  {
    name: "target-start-turn-damage-frontier",
    actions: ["doDiscoverTargetStartTurn"],
    expected: expectedLifecycleProjection({
      scenario: "targetStartTurnDamagePending",
      frontier: targetStartTurnFrontier,
      lastHoleOrder: "turnStartDamageThenSave",
    }),
  },
  {
    name: "target-start-turn-save-frontier-retains-occurrence",
    actions: ["doDiscoverTargetStartTurn", "doFillTargetStartTurnDamage"],
    expected: expectedLifecycleProjection({
      scenario: "targetStartTurnSavePending",
      frontier: targetStartTurnFrontier,
      lastHoleOrder: "turnStartDamageThenSave",
    }),
  },
  {
    name: "target-start-turn-damage-before-target-end-turn-damage",
    actions: [
      "doDiscoverTargetStartTurn",
      "doFillTargetStartTurnDamage",
      "doResolveTargetStartTurn",
    ],
    expected: expectedLifecycleProjection({
      scenario: "targetStartTurnResolved",
      actor: "targetTurn",
      targetHp: 8,
      frontier: noOpenFrontier,
      turnStartDamageAppliedBeforeEndDamage: true,
      lastHoleOrder: "turnStartDamageThenSave",
    }),
  },
  {
    name: "source-next-turn-outgoing-frontier-correlates-round-two",
    actions: [
      "doDiscoverTargetStartTurn",
      "doFillTargetStartTurnDamage",
      "doResolveTargetStartTurn",
      "doDiscoverSourceNextTurn",
    ],
    expected: expectedLifecycleProjection({
      scenario: "sourceNextTurnPending",
      actor: "targetTurn",
      frontier: sourceNextTurnFrontier,
      targetHp: 8,
      lastHoleOrder: "turnEndDamageOnly",
      turnStartDamageAppliedBeforeEndDamage: true,
    }),
  },
  {
    name: "source-next-turn-expiry-after-target-end-turn-damage",
    actions: [
      "doDiscoverTargetStartTurn",
      "doFillTargetStartTurnDamage",
      "doResolveTargetStartTurn",
      "doDiscoverSourceNextTurn",
      "doResolveSourceNextTurn",
    ],
    expected: expectedLifecycleProjection({
      scenario: "sourceNextTurnResolved",
      actor: "sourceTurn",
      round: 2,
      targetHp: 5,
      frontier: noOpenFrontier,
      turnStartDamageActive: false,
      turnEndDamageActive: false,
      untilNextTurnActive: false,
      startTurnOngoingFeatureActive: false,
      endTurnOngoingFeatureActive: false,
      turnStartDamageAppliedBeforeEndDamage: true,
      turnEndDamageAppliedBeforeExpiry: true,
      endTurnOngoingExpiredAtTargetEnd: true,
      untilNextTurnExpiredAtSourceStart: true,
      startTurnOngoingExpiredAtSourceStart: true,
      turnStartDurationExpiredAfterRoundTick: true,
      lastHoleOrder: "turnEndDamageOnly",
    }),
  },
] as const satisfies ReadonlyArray<TurnBoundaryLifecycleReplaySequence>;

describe("turn-boundary effect lifecycle MBT", () => {
  function assertLowLevelEffectSourceSnapshotContract(): void {
    const snapshot = snapshotBattle(battleWithTurnBoundaryEffects());
    const encoded = Schema.encodeSync(BattleSnapshotSchema)(snapshot);
    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(BattleSnapshotSchema)(encoded),
      ),
    ).toBe(true);
    const fighter = encoded.combatants.find(
      (combatant) => combatant.combatantId === fighterId,
    );
    if (fighter?.origin.kind !== "character") {
      throw new Error("Expected encoded fighter character origin.");
    }
    const sourceBinding = fighter.origin.execution.procedureBindings.find(
      (binding) => binding.procedure.kind === "effectOccurrenceSource",
    );
    if (sourceBinding?.procedure.kind !== "effectOccurrenceSource") {
      throw new Error("Expected a low-level effect occurrence source binding.");
    }
    const encodedWithEffectKind = (effectKind: string): unknown => ({
      ...encoded,
      combatants: encoded.combatants.map((combatant) =>
        combatant.combatantId !== fighterId ||
        combatant.origin.kind !== "character"
          ? combatant
          : {
              ...combatant,
              origin: {
                ...combatant.origin,
                execution: {
                  ...combatant.origin.execution,
                  procedureBindings:
                    combatant.origin.execution.procedureBindings.map(
                      (binding) =>
                        binding.procedureRef !== sourceBinding.procedureRef
                          ? binding
                          : {
                              ...binding,
                              procedure: {
                                ...sourceBinding.procedure,
                                effectKind,
                              },
                            },
                    ),
                },
              },
            },
      ),
    });
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleSnapshotSchema)(
          encodedWithEffectKind("spellCondition"),
        ),
      ),
    ).toBe(true);
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleSnapshotSchema)(
          encodedWithEffectKind("damageResistance"),
        ),
      ),
    ).toBe(true);
  }

  it("replays the bounded turn-boundary lifecycle sequence deterministically", async () => {
    assertLowLevelEffectSourceSnapshotContract();
    const replayedActions = new Set<TurnBoundaryLifecycleDriverAction>();

    for (const sequence of replaySequences) {
      const driver = createTurnBoundaryLifecycleDriver()();

      for (const actionName of sequence.actions) {
        replayedActions.add(actionName);
        await driver.actions[actionName].handler({});
      }

      const runtime = driver.getState?.();
      if (runtime === undefined) {
        throw new Error("Turn-boundary lifecycle driver must expose getState.");
      }
      expect(runtime, sequence.name).toEqual(sequence.expected);
    }

    expect(replayedActions).toEqual(
      new Set(replaySequences.flatMap((sequence) => sequence.actions)),
    );
  });

  it(
    "compares turn-boundary public reducer route to copied qRoute",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-turn-boundary-effect-lifecycle.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createTurnBoundaryRouteReplayDriver(),
        backend: "typescript",
        nTraces: 1,
        maxSteps: focusedMbtMaxSteps(2),
        stateCheck: turnBoundaryRouteStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it("requests occurrence ordering before mixed death-save and turn-boundary ownership", () => {
    const mixedBattle = battleWithTurnBoundaryEffectsAndDeathSave();
    const awaitingBoundary = endTurn({
      state: mixedBattle,
      actorId: fighterId,
    });
    assertNeedsHoles(awaitingBoundary, "mixed death-save route discovery");
    expect(awaitingBoundary.frontier.holes).toEqual([
      expect.objectContaining({
        kind: "startTurnOccurrenceOrder",
        occurrences: expect.arrayContaining([
          expect.objectContaining({ kind: "deathSavingThrow" }),
          expect.objectContaining({ kind: "spellTurnStartDamageAndSave" }),
        ]),
      }),
    ]);
    expect(
      routeEventsOf(awaitingBoundary, "mixed death-save route discovery"),
    ).toEqual([
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "battleAction",
        holes: [],
        owner: "battleActionEconomy",
      },
    ]);
    expect(
      routeEventsOf(awaitingBoundary, "mixed death-save route discovery"),
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ subject: "afterHitSpell" }),
      ]),
    );

    const publicAwaitingBoundary = resolveBattleRuntimeSubject({
      session: battleRuntimeSessionForTest({
        state: mixedBattle,
        context: turnBoundaryCharacterSession().context,
      }),
      subject: turnBoundaryRuntimeSubject(fighterId),
      fills: [],
    });
    const publicNeedsHoles = assertRuntimeNeedsHoles(
      publicAwaitingBoundary,
      "mixed public occurrence-order discovery",
    );
    expect(publicNeedsHoles.envelope.frontier).toMatchObject({
      kind: "holes",
      replaySubject: turnBoundaryRuntimeSubject(fighterId),
      pendingProcedure: {
        kind: "turnBoundary",
        endingActorId: fighterId,
        request: { kind: "startTurnOccurrenceOrder" },
        sourceTurn: {
          actorId: goblinId,
        },
      },
    });
  });

  it("splits mixed repeat-save and turn-boundary discovery route ownership", () => {
    const awaitingBoundary = endTurn({
      state: battleWithTurnBoundaryEffectsAndSleepRepeatSave(),
      actorId: fighterId,
    });
    assertNeedsHoles(awaitingBoundary, "mixed repeat-save route discovery");
    expect(awaitingBoundary.frontier.holes.map((hole) => hole.kind)).toEqual([
      "savingThrowOutcome",
    ]);
    expect(
      awaitingBoundary.frontier.holes.some(
        (hole) =>
          hole.kind === "savingThrowOutcome" &&
          "stagedConditionRepeatSave" in hole,
      ),
    ).toBe(true);
    expect(
      routeEventsOf(awaitingBoundary, "mixed repeat-save route discovery"),
    ).toEqual([
      {
        kind: "discoverBattleActs",
        subject: "repeatSaveConditionEffect",
        holes: ["savingThrowOutcome"],
        owner: "battleTurnBoundary",
      },
    ]);
  });

  it("splits concentration holes after turn-boundary damage route ownership", () => {
    const awaitingBoundary = endTurn({
      state: battleWithCurrentActorEndTurnDamageAndConcentration(),
      actorId: fighterId,
    });
    assertNeedsHoles(awaitingBoundary, "end-turn concentration route setup");
    expect(awaitingBoundary.frontier.holes.map((hole) => hole.kind)).toEqual([
      "rolledDice",
    ]);
    const damageResolved = endTurn({
      state: awaitingBoundary.state,
      actorId: fighterId,
      fills: [
        damageRollFillWithGroups(
          findHole(awaitingBoundary.frontier.holes, "rolledDice"),
          [[turnEndDamageRoll]],
        ),
      ],
    });
    assertNeedsHoles(damageResolved, "turn-boundary concentration route");
    expect(damageResolved.frontier.holes.map((hole) => hole.kind)).toEqual([
      "concentrationSavingThrow",
    ]);
    expect(
      routeEventsOf(damageResolved, "turn-boundary concentration route"),
    ).toEqual([
      {
        kind: "resolveBattleSubject",
        subject: "turnBoundaryEffectLifecycle",
        fill: "rolledDice",
        holes: [],
        owner: "battleHitPoint",
      },
      {
        kind: "resolveBattleSubject",
        subject: "concentrationTeardown",
        fill: "rolledDice",
        holes: ["concentrationSavingThrow"],
        owner: "battleConcentration",
      },
    ]);
  });

  it("does not route non-boundary end-turn save fills as turn-boundary lifecycle", () => {
    const awaitingBoundary = endTurn({
      state: battleWithTurnBoundaryEffectsAndConditionSave(),
      actorId: fighterId,
    });
    assertNeedsHoles(awaitingBoundary, "mixed saving throw route discovery");
    expect(awaitingBoundary.frontier.holes.map((hole) => hole.kind)).toEqual([
      "savingThrowOutcome",
    ]);

    const conditionSaveHole = findSpellConditionEndTurnSaveHole(
      awaitingBoundary.frontier.holes,
    );
    const conditionSaveResolved = endTurn({
      state: awaitingBoundary.state,
      actorId: fighterId,
      fills: [
        savingThrowOutcomeFill(conditionSaveHole, [
          { targetId: fighterId, succeeded: false },
        ]),
      ],
    });
    assertNeedsHoles(
      conditionSaveResolved,
      "non-boundary save before turn-boundary save",
    );
    expect(
      conditionSaveResolved.frontier.holes.map((hole) => hole.kind),
    ).toEqual(["rolledDice"]);
    const routeEvents = routeEventsOf(
      conditionSaveResolved,
      "non-boundary save before turn-boundary save",
    );
    expect(routeEvents).toEqual([
      {
        kind: "resolveBattleSubject",
        subject: "compelledBehaviorEffect",
        fill: "savingThrowOutcome",
        holes: ["rolledDice"],
        owner: "battleActiveEffect",
      },
    ]);
    expect(routeEvents).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: "turnBoundaryEffectLifecycle",
          fill: "savingThrowOutcome",
          owner: "battleActiveEffect",
        }),
      ]),
    );
  });

  it("does not route invalid turn-boundary damage roll fills as hit-point ownership", () => {
    const awaitingBoundary = endTurn({
      state: battleWithTurnBoundaryEffects(),
      actorId: fighterId,
    });
    assertNeedsHoles(awaitingBoundary, "invalid rolled-dice route discovery");
    const damageFill = damageRollFillWithGroups(
      findHole(awaitingBoundary.frontier.holes, "rolledDice"),
      [[turnStartDamageRoll]],
    );
    const invalid = endTurn({
      state: awaitingBoundary.state,
      actorId: fighterId,
      fills: [damageFill, damageFill],
    });
    expect(invalid).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
    expect(invalid.routeEvents).toBeUndefined();
  });

  it(
    "matches focused turn-boundary lifecycle traces against Quint",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-turn-boundary-effect-lifecycle.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createTurnBoundaryLifecycleDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(5),
        stateCheck: turnBoundaryLifecycleStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function createTurnBoundaryLifecycleDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialRuntimeState();
    return {
      init: () => {
        state = initialRuntimeState();
      },
      doDiscoverTargetStartTurn: () => {
        state = discoverTargetStartTurn(state);
      },
      doFillTargetStartTurnDamage: () => {
        state = fillTargetStartTurnDamage(state);
      },
      doResolveTargetStartTurn: () => {
        state = resolveTargetStartTurn(state);
      },
      doDiscoverSourceNextTurn: () => {
        state = discoverSourceNextTurn(state);
      },
      doResolveSourceNextTurn: () => {
        state = resolveSourceNextTurn(state);
      },
      step: () => {},
      getState: () => turnBoundaryLifecycleProjection(state),
    };
  });
}

function createTurnBoundaryRouteReplayDriver() {
  return defineDriver(routeDriverSchema, () => {
    let state = initialTurnBoundaryRouteProjection();

    function reset(): void {
      state = initialTurnBoundaryRouteProjection();
    }

    reset();

    return {
      init: reset,
      doResolveTargetStartTurn: () => {
        state = resolveTargetStartTurnRoute(state);
      },
      doResolveSourceNextTurn: () => {
        state = resolveSourceNextTurnRoute(state);
      },
      step: () => {},
      getState: (): TurnBoundaryRouteProjection => ({
        surface: state.surface,
        route: state.route,
      }),
    };
  });
}

function initialRuntimeState(): TurnBoundaryLifecycleRuntimeState {
  const fixture = battleWithTurnBoundaryEffectsFixture();
  const baseSession = turnBoundaryCharacterSession();
  const session = battleRuntimeSessionForTest({
    state: fixture.state,
    context: baseSession.context,
  });
  return {
    session,
    envelope: currentBattleCheckpointFrontierEnvelope(session),
    pendingFills: [],
    effectProcedureRefs: fixture.effectProcedureRefs,
    scenario: "init",
    turnStartDamageAppliedBeforeEndDamage: false,
    turnEndDamageAppliedBeforeExpiry: false,
    endTurnOngoingExpiredAtTargetEnd: false,
    untilNextTurnExpiredAtSourceStart: false,
    startTurnOngoingExpiredAtSourceStart: false,
    turnStartDurationExpiredAfterRoundTick: false,
    lastHoleOrder: "noBoundaryHoles",
  };
}

function initialTurnBoundaryRouteProjection(): TurnBoundaryRouteProjection & {
  readonly battle: BattleState;
} {
  const battle = battleWithTurnBoundaryEffects();
  return {
    battle,
    surface: "fresh",
    route: [battleReducerStartRouteEvent()],
  };
}

function resolveTargetStartTurnRoute(
  state: TurnBoundaryRouteProjection & { readonly battle: BattleState },
): TurnBoundaryRouteProjection & { readonly battle: BattleState } {
  expect(state.surface).toBe("fresh");
  const awaitingBoundary = endTurn({ state: state.battle, actorId: fighterId });
  assertNeedsHoles(awaitingBoundary, "target start-turn route discovery");
  const damageFill = damageRollFillWithGroups(
    findHole(awaitingBoundary.frontier.holes, "rolledDice"),
    [[turnStartDamageRoll]],
  );
  const damageResolved = endTurn({
    state: awaitingBoundary.state,
    actorId: fighterId,
    fills: [damageFill],
  });
  assertNeedsHoles(damageResolved, "target start-turn damage route");
  const saveFill = savingThrowOutcomeFill(
    findHole(damageResolved.frontier.holes, "savingThrowOutcome"),
    [{ targetId: goblinId, succeeded: false }],
  );
  const saveResolved = endTurn({
    state: awaitingBoundary.state,
    actorId: fighterId,
    fills: [damageFill, saveFill],
  });
  assertResolved(saveResolved, "target start-turn save route");
  return {
    battle: saveResolved.state,
    surface: "targetStartTurnResolved",
    route: [
      ...state.route,
      ...routeEventsOf(awaitingBoundary, "target start-turn route discovery"),
      ...routeEventsOf(damageResolved, "target start-turn damage route"),
      ...routeEventsOf(saveResolved, "target start-turn save route"),
    ],
  };
}

function resolveSourceNextTurnRoute(
  state: TurnBoundaryRouteProjection & { readonly battle: BattleState },
): TurnBoundaryRouteProjection & { readonly battle: BattleState } {
  expect(state.surface).toBe("targetStartTurnResolved");
  const awaitingBoundary = endTurn({ state: state.battle, actorId: goblinId });
  assertNeedsHoles(awaitingBoundary, "source next-turn route discovery");
  const damageResolved = endTurn({
    state: awaitingBoundary.state,
    actorId: goblinId,
    fills: [
      damageRollFillWithGroups(
        findHole(awaitingBoundary.frontier.holes, "rolledDice"),
        [[turnEndDamageRoll]],
      ),
    ],
  });
  assertResolved(damageResolved, "source next-turn damage route");
  return {
    battle: damageResolved.state,
    surface: "sourceNextTurnResolved",
    route: [
      ...state.route,
      ...routeEventsOf(awaitingBoundary, "source next-turn route discovery"),
      ...routeEventsOf(damageResolved, "source next-turn damage route"),
    ],
  };
}

function discoverTargetStartTurn(
  state: TurnBoundaryLifecycleRuntimeState,
): TurnBoundaryLifecycleRuntimeState {
  expect(state.scenario).toBe("init");
  const result = resolveTurnBoundaryRuntimeSubject({
    session: state.session,
    actorId: fighterId,
    fills: [],
  });
  const needsHoles = assertRuntimeNeedsHoles(
    result,
    "target start-turn damage discovery",
  );
  expect(runtimeHoles(needsHoles.envelope).map((hole) => hole.kind)).toEqual([
    "rolledDice",
  ]);
  expect(startTurnOccurrenceFromEnvelope(needsHoles.envelope).kind).toBe(
    "spellTurnStartDamageAndSave",
  );
  return {
    ...state,
    session: needsHoles.session,
    envelope: needsHoles.envelope,
    pendingFills: [],
    scenario: "targetStartTurnDamagePending",
    lastHoleOrder: "turnStartDamageThenSave",
  };
}

function fillTargetStartTurnDamage(
  state: TurnBoundaryLifecycleRuntimeState,
): TurnBoundaryLifecycleRuntimeState {
  expect(state.scenario).toBe("targetStartTurnDamagePending");
  const damageFill = damageRollFillWithGroups(
    findHole(runtimeHoles(state.envelope), "rolledDice"),
    [[turnStartDamageRoll]],
  );
  const result = resolveTurnBoundaryRuntimeSubject({
    session: state.session,
    actorId: fighterId,
    fills: [damageFill],
  });
  const needsHoles = assertRuntimeNeedsHoles(
    result,
    "target start-turn save discovery",
  );
  expect(runtimeHoles(needsHoles.envelope).map((hole) => hole.kind)).toEqual([
    "savingThrowOutcome",
  ]);
  expect(startTurnOccurrenceFromEnvelope(needsHoles.envelope)).toEqual(
    startTurnOccurrenceFromEnvelope(state.envelope),
  );
  return {
    ...state,
    session: needsHoles.session,
    envelope: needsHoles.envelope,
    pendingFills: [damageFill],
    scenario: "targetStartTurnSavePending",
    lastHoleOrder: "turnStartDamageThenSave",
  };
}

function resolveTargetStartTurn(
  state: TurnBoundaryLifecycleRuntimeState,
): TurnBoundaryLifecycleRuntimeState {
  expect(state.scenario).toBe("targetStartTurnSavePending");
  const saveFill = savingThrowOutcomeFill(
    findHole(runtimeHoles(state.envelope), "savingThrowOutcome"),
    [{ targetId: goblinId, succeeded: false }],
  );
  const result = resolveTurnBoundaryRuntimeSubject({
    session: state.session,
    actorId: fighterId,
    fills: [...state.pendingFills, saveFill],
  });
  const resolved = assertRuntimeResolved(
    result,
    "target start-turn boundary resolution",
  );
  const resolvedState = resolved.session.state;
  return {
    ...state,
    session: resolved.session,
    envelope: resolved.envelope,
    pendingFills: [],
    scenario: "targetStartTurnResolved",
    turnStartDamageAppliedBeforeEndDamage:
      targetHp(resolvedState) === initialTargetHp - turnStartDamageRoll &&
      hasEffect(
        resolvedState,
        goblinId,
        state.effectProcedureRefs.turnEndDamage,
      ),
    lastHoleOrder: "turnStartDamageThenSave",
  };
}

function discoverSourceNextTurn(
  state: TurnBoundaryLifecycleRuntimeState,
): TurnBoundaryLifecycleRuntimeState {
  expect(state.scenario).toBe("targetStartTurnResolved");
  const result = resolveTurnBoundaryRuntimeSubject({
    session: state.session,
    actorId: goblinId,
    fills: [],
  });
  const needsHoles = assertRuntimeNeedsHoles(
    result,
    "source next-turn damage discovery",
  );
  expect(holeOrder(runtimeHoles(needsHoles.envelope))).toBe(
    "turnEndDamageOnly",
  );
  return {
    ...state,
    session: needsHoles.session,
    envelope: needsHoles.envelope,
    pendingFills: [],
    scenario: "sourceNextTurnPending",
    lastHoleOrder: "turnEndDamageOnly",
  };
}

function resolveSourceNextTurn(
  state: TurnBoundaryLifecycleRuntimeState,
): TurnBoundaryLifecycleRuntimeState {
  expect(state.scenario).toBe("sourceNextTurnPending");
  const hpBeforeEndTurn = targetHp(state.session.state);
  const damageFill = damageRollFillWithGroups(
    findHole(runtimeHoles(state.envelope), "rolledDice"),
    [[turnEndDamageRoll]],
  );
  const result = resolveTurnBoundaryRuntimeSubject({
    session: state.session,
    actorId: goblinId,
    fills: [damageFill],
  });
  const resolved = assertRuntimeResolved(
    result,
    "source next-turn boundary resolution",
  );
  const resolvedState = resolved.session.state;
  return {
    ...state,
    session: resolved.session,
    envelope: resolved.envelope,
    pendingFills: [],
    scenario: "sourceNextTurnResolved",
    turnEndDamageAppliedBeforeExpiry:
      targetHp(resolvedState) === hpBeforeEndTurn - turnEndDamageRoll &&
      !hasEffect(
        resolvedState,
        goblinId,
        state.effectProcedureRefs.turnEndDamage,
      ),
    endTurnOngoingExpiredAtTargetEnd: !hasOngoingFeature(
      resolvedState,
      fighterId,
      ongoingFeatureProcedureRef(resolvedState, "fixedDuration"),
    ),
    untilNextTurnExpiredAtSourceStart: !hasEffect(
      resolvedState,
      fighterId,
      state.effectProcedureRefs.untilNextTurn,
    ),
    startTurnOngoingExpiredAtSourceStart: !hasOngoingFeature(
      resolvedState,
      fighterId,
      ongoingFeatureProcedureRef(resolvedState, "turnBoundary"),
    ),
    turnStartDurationExpiredAfterRoundTick: !hasEffect(
      resolvedState,
      goblinId,
      state.effectProcedureRefs.turnStartDamage,
    ),
    lastHoleOrder: "turnEndDamageOnly",
  };
}

function resolveTurnBoundaryRuntimeSubject(input: {
  readonly session: BattleRuntimeSession;
  readonly actorId: typeof fighterId | typeof goblinId;
  readonly fills: readonly BattleFill[];
}): TurnBoundaryRuntimeResolutionResult {
  return resolveBattleRuntimeSubject({
    session: input.session,
    subject: turnBoundaryRuntimeSubject(input.actorId),
    fills: input.fills,
  });
}

function turnBoundaryRuntimeSubject(
  actorId: typeof fighterId | typeof goblinId,
): Extract<
  BattleSubject,
  { readonly tag: "runtimeCommand"; readonly command: "endTurn" }
> {
  return { tag: "runtimeCommand", actorId, command: "endTurn" };
}

function assertRuntimeNeedsHoles(
  result: TurnBoundaryRuntimeResolutionResult,
  label: string,
): TurnBoundaryRuntimeNeedsHoles {
  if (result.tag !== "needsHoles") {
    throw new Error(`Expected ${label} to need holes.`);
  }
  if (result.envelope.frontier.kind !== "holes") {
    throw new Error(`Expected ${label} to expose a Hole frontier.`);
  }
  return result;
}

function assertRuntimeResolved(
  result: TurnBoundaryRuntimeResolutionResult,
  label: string,
): TurnBoundaryRuntimeResolved {
  if (result.tag !== "resolved") {
    throw new Error(`Expected ${label} to resolve.`);
  }
  return result;
}

function runtimeHoles(
  envelope: ReturnType<typeof currentBattleCheckpointFrontierEnvelope>,
): readonly BattleHole[] {
  return envelope.frontier.kind === "holes" ? envelope.frontier.holes : [];
}

function startTurnOccurrenceFromEnvelope(
  envelope: ReturnType<typeof currentBattleCheckpointFrontierEnvelope>,
): Extract<
  TurnBoundaryProcedure["request"],
  { readonly kind: "startTurnOccurrence" }
>["occurrence"] {
  if (
    envelope.frontier.kind !== "holes" ||
    envelope.frontier.pendingProcedure.kind !== "turnBoundary" ||
    envelope.frontier.pendingProcedure.request.kind !== "startTurnOccurrence"
  ) {
    throw new Error(
      "Expected turn-boundary lifecycle envelope to expose a start-turn occurrence.",
    );
  }
  return envelope.frontier.pendingProcedure.request.occurrence;
}

function battleWithTurnBoundaryEffects(input?: {
  readonly baseBattle?: BattleState;
  readonly targetHp?: number;
}): BattleState {
  return battleWithTurnBoundaryEffectsFixture(input).state;
}

function battleWithTurnBoundaryEffectsFixture(input?: {
  readonly baseBattle?: BattleState;
  readonly targetHp?: number;
}): {
  readonly state: BattleState;
  readonly effectProcedureRefs: TurnBoundaryEffectProcedureRefs;
} {
  const battle = input?.baseBattle ?? turnBoundaryCharacterBattle();
  const startOngoing =
    stateWithAllocatedSyntheticOngoingFeatureProcedureForTest(
      battle,
      fighterId,
      syntheticOngoingFeatureExecution("turnBoundary"),
    );
  const endOngoing = stateWithAllocatedSyntheticOngoingFeatureProcedureForTest(
    startOngoing.state,
    fighterId,
    syntheticOngoingFeatureExecution("fixedDuration"),
  );
  const fighter = requireCombatant(endOngoing.state, fighterId);
  const goblin = requireCombatant(endOngoing.state, goblinId);
  const stateWithOngoingFeatures = {
    ...endOngoing.state,
    combatants: new Map(endOngoing.state.combatants)
      .set(fighterId, {
        ...fighter,
        activeOngoingFeatureOccurrences: new Map([
          ...fighter.activeOngoingFeatureOccurrences,
          [startOngoing.procedureRef, startTurnOngoingFeature()],
          [endOngoing.procedureRef, endTurnOngoingFeature()],
        ]),
      })
      .set(goblinId, {
        ...goblin,
        hp: Hp(input?.targetHp ?? initialTargetHp),
        maxHp: Hp(initialTargetHp),
        positiveHpUnconscious: null,
      }),
  };
  const untilNextTurn =
    battleStateWithLowLevelSourceOwnedEffectOccurrenceForTest({
      state: stateWithOngoingFeatures,
      sourceCombatantId: fighterId,
      ownerId: fighterId,
      effect: untilNextTurnEffect(),
    });
  const turnStartDamage =
    battleStateWithLowLevelSourceOwnedEffectOccurrenceForTest({
      state: untilNextTurn.state,
      sourceCombatantId: fighterId,
      ownerId: goblinId,
      effect: turnStartDamageEffect(),
    });
  const turnEndDamage =
    battleStateWithLowLevelSourceOwnedEffectOccurrenceForTest({
      state: turnStartDamage.state,
      sourceCombatantId: fighterId,
      ownerId: goblinId,
      effect: turnEndDamageEffect(),
    });
  return {
    state: turnEndDamage.state,
    effectProcedureRefs: {
      turnStartDamage: turnStartDamage.sourceProcedureRef,
      turnEndDamage: turnEndDamage.sourceProcedureRef,
      untilNextTurn: untilNextTurn.sourceProcedureRef,
    },
  };
}

function turnBoundaryCharacterBattle(): BattleState {
  return turnBoundaryCharacterSession().state;
}

function turnBoundaryCharacterSession(): BattleRuntimeSession {
  return startBattleSessionRight({
    battleId: battleId("battle-turn-boundary-effect-lifecycle"),
    combatants: [
      characterSeed({ combatantId: fighterId, initiative: 20 }),
      characterSeed({
        combatantId: goblinId,
        displayName: "Target Fighter",
        initiative: 10,
        currentHp: initialTargetHp,
        maxHp: initialTargetHp,
        attack: null,
      }),
    ],
  });
}

function battleWithTurnBoundaryEffectsAndDeathSave(): BattleState {
  return battleWithTurnBoundaryEffects({
    baseBattle: startBattleRight({
      battleId: battleId("battle-turn-boundary-death-save-frontier"),
      combatants: [
        characterSeed({ combatantId: fighterId, initiative: 20 }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Target Fighter",
          initiative: 10,
          currentHp: 0,
          maxHp: initialTargetHp,
          attack: null,
          zeroHpLifecycle: {
            policy: "usesDeathSavingThrows",
            deathSaves: {
              deathSaves: { successes: 0, failures: 0 },
              stable: false,
              dead: false,
              hpRegained: false,
            },
          },
        }),
      ],
    }),
    targetHp: 0,
  });
}

function battleWithTurnBoundaryEffectsAndConditionSave(): BattleState {
  const battle = battleWithTurnBoundaryEffects();
  return battleStateWithLowLevelSourceOwnedEffectOccurrenceForTest({
    state: battle,
    sourceCombatantId: goblinId,
    ownerId: fighterId,
    effect: fighterSpellConditionEndTurnSaveEffect(),
  }).state;
}

function battleWithTurnBoundaryEffectsAndSleepRepeatSave(): BattleState {
  const session = startBattleSessionRight({
    battleId: battleId("battle-turn-boundary-sleep-repeat-save-frontier"),
    combatants: [
      characterSeed({ combatantId: fighterId, initiative: 15 }),
      characterSeed({
        combatantId: wizardId,
        displayName: "Sleep caster",
        initiative: 20,
        attack: null,
        spellcasting: wizardSpellcasting({
          cantrips: [],
          preparedSpells: [spellRecord("sleep")],
          spellSlots: [{ spellLevel: 1, count: 1 }],
        }),
      }),
      characterSeed({ combatantId: goblinId, initiative: 10 }),
    ],
  });
  const act = findAct(session, magicSubject("sleep"));
  const initialSave = findHole(act.initialHoles, "savingThrowOutcome");
  const cast = resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [
      savingThrowOutcomeFill(initialSave, [
        { targetId: fighterId, succeeded: false },
      ]),
    ],
  });
  assertResolved(cast, "Sleep mixed-boundary setup cast");
  const fighterTurn = endTurn({ state: cast.state, actorId: wizardId });
  assertResolved(fighterTurn, "Sleep mixed-boundary caster turn");
  return battleWithTurnBoundaryEffects({ baseBattle: fighterTurn.state });
}

function battleWithCurrentActorEndTurnDamageAndConcentration(): BattleState {
  const battle = turnBoundaryCharacterBattle();
  const incomingDamage =
    battleStateWithLowLevelSourceOwnedEffectOccurrenceForTest({
      state: battle,
      sourceCombatantId: goblinId,
      ownerId: fighterId,
      effect: fighterTurnEndDamageEffect(),
    });
  const concentration =
    battleStateWithLowLevelSourceOwnedEffectOccurrenceForTest({
      state: incomingDamage.state,
      sourceCombatantId: fighterId,
      ownerId: fighterId,
      effect: fighterConcentrationEffect(),
    });
  const fighter = requireCombatant(concentration.state, fighterId);
  return {
    ...concentration.state,
    combatants: new Map(concentration.state.combatants).set(fighterId, {
      ...fighter,
      concentration: {
        sourceProcedureRef: concentration.sourceProcedureRef,
        effectKind: "spellEffect",
      },
    }),
  };
}

function fighterSpellConditionEndTurnSaveEffect(): Extract<
  LowLevelEffectOccurrenceTemplate,
  { readonly kind: "spellConditionEndTurnSave" }
> {
  return {
    kind: "spellConditionEndTurnSave",
    condition: "poisoned",
    conditionHadNonSpellSource: false,
    heightenedSpellTargetDisadvantage: null,
    save: {
      ability: "con",
      dc: { kind: "fixed", dc: difficultyClass(11) },
    },
    expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(10) },
  };
}

function fighterTurnEndDamageEffect(): Extract<
  LowLevelEffectOccurrenceTemplate,
  { readonly kind: "spellTurnEndDamage" }
> {
  return {
    kind: "spellTurnEndDamage",
    damage: {
      expr: { dice: 1, dieSize: 6 },
      damageType: "fire",
    },
    expiresAt: { kind: "endOfTurn", combatantId: fighterId, round: Round(1) },
  };
}

function fighterConcentrationEffect(): Extract<
  LowLevelEffectOccurrenceTemplate,
  { readonly kind: "nextAttackRollBySelf" }
> {
  return {
    kind: "nextAttackRollBySelf",
    mode: "advantage",
    expiresAt: {
      kind: "concentration",
      combatantId: fighterId,
      durationTicks: elapsedTimeTicks(10),
    },
  };
}

function stateWithAllocatedSyntheticOngoingFeatureProcedureForTest(
  state: BattleState,
  sourceCombatantId: typeof fighterId,
  execution: Extract<
    UnitFeatureProcedureExecution,
    { readonly kind: "ongoingFeature" }
  >,
): {
  readonly state: BattleState;
  readonly procedureRef: BattleProcedureExecutionRef;
} {
  const source = requireCombatant(state, sourceCombatantId);
  if (source.origin.kind !== "character") {
    throw new Error(
      "Turn-boundary ongoing-feature procedures require a character source.",
    );
  }
  const ordinal = Number(source.origin.execution.nextProcedureOrdinal);
  const procedureRef = battleProcedureExecutionRef(
    source.origin.execution.scopeRef,
    NonNegativeInteger(ordinal),
  );
  return {
    procedureRef,
    state: {
      ...state,
      combatants: new Map(state.combatants).set(sourceCombatantId, {
        ...source,
        origin: {
          ...source.origin,
          execution: {
            ...source.origin.execution,
            nextProcedureOrdinal: battleProcedureExecutionCursor(ordinal + 1),
            procedureBindings: [
              ...source.origin.execution.procedureBindings,
              {
                procedureRef,
                procedure: {
                  kind: "unitFeature",
                  source: { kind: "intrinsic" },
                  execution,
                },
              },
            ],
          },
        },
      }),
    },
  };
}

function syntheticOngoingFeatureExecution(
  lifecycleKind: "turnBoundary" | "fixedDuration",
): Extract<UnitFeatureProcedureExecution, { readonly kind: "ongoingFeature" }> {
  return {
    kind: "ongoingFeature",
    activationTrigger: "bonusAction",
    spendsUse: false,
    lifecycle:
      lifecycleKind === "turnBoundary"
        ? {
            kind: "turnBoundary",
            initialExpiration: "startOfNextTurn",
            earlyEndConditions: [],
            earlyEndArmorCategories: [],
            extensionTriggers: [],
          }
        : {
            kind: "fixedDuration",
            maximumDurationRounds: 1,
            earlyEndConditions: [],
            earlyEndArmorCategories: [],
            extensionTriggers: [],
          },
    actionRestrictions: [],
    rollModifiers: [],
    spellModifiers: [],
    damageModifiers: [],
    resistances: [],
  };
}

function ongoingFeatureProcedureRef(
  state: BattleState,
  lifecycleKind: "turnBoundary" | "fixedDuration",
): OngoingFeatureSourceKey {
  const fighter = requireCombatant(state, fighterId);
  if (fighter.origin.kind !== "character") {
    throw new Error("Expected the ongoing-feature source character.");
  }
  const binding = fighter.origin.execution.procedureBindings.find(
    ({ procedure }) =>
      procedure.kind === "unitFeature" &&
      procedure.execution.kind === "ongoingFeature" &&
      procedure.execution.lifecycle.kind === lifecycleKind,
  );
  if (binding === undefined) {
    throw new Error(`Expected ${lifecycleKind} ongoing-feature procedure.`);
  }
  return binding.procedureRef;
}

function startTurnOngoingFeature(): ActiveOngoingFeatureOccurrence {
  return {
    kind: "turnBoundary",
    expiresAt: { kind: "startOfTurn", combatantId: fighterId },
  };
}

function endTurnOngoingFeature(): ActiveOngoingFeatureOccurrence {
  return {
    kind: "fixedDuration",
    expiresAt: { kind: "endOfTurn", combatantId: goblinId, round: Round(1) },
  };
}

function turnStartDamageEffect(): Extract<
  LowLevelEffectOccurrenceTemplate,
  { readonly kind: "spellTurnStartDamageAndSave" }
> {
  return {
    kind: "spellTurnStartDamageAndSave",
    source: "turnBoundaryEffectLifecycle",
    damage: {
      expr: { dice: 1, dieSize: 4 },
      damageType: "fire",
    },
    save: {
      ability: "con",
      dc: { kind: "fixed", dc: difficultyClass(12) },
      successEnds: "spell",
    },
    expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(1) },
  };
}

function turnEndDamageEffect(): Extract<
  LowLevelEffectOccurrenceTemplate,
  { readonly kind: "spellTurnEndDamage" }
> {
  return {
    kind: "spellTurnEndDamage",
    damage: {
      expr: { dice: 1, dieSize: 6 },
      damageType: "fire",
    },
    expiresAt: { kind: "endOfTurn", combatantId: goblinId, round: Round(1) },
  };
}

function untilNextTurnEffect(): Extract<
  LowLevelEffectOccurrenceTemplate,
  { readonly kind: "nextAttackRollBySelf" }
> {
  return {
    kind: "nextAttackRollBySelf",
    mode: "advantage",
    expiresAt: { kind: "startOfTurn", combatantId: fighterId },
  };
}

function turnBoundaryLifecycleProjection(
  state: TurnBoundaryLifecycleRuntimeState,
): TurnBoundaryLifecycleProjection {
  const snapshot = state.envelope.checkpoint;
  const mechanics = state.session.state;
  return {
    scenario: state.scenario,
    actor: currentActorProjection(snapshot),
    frontier: turnBoundaryLifecycleFrontier(state.envelope),
    round: Number(snapshot.round),
    targetHp: targetHp(mechanics),
    turnStartDamageActive: hasEffect(
      mechanics,
      goblinId,
      state.effectProcedureRefs.turnStartDamage,
    ),
    turnEndDamageActive: hasEffect(
      mechanics,
      goblinId,
      state.effectProcedureRefs.turnEndDamage,
    ),
    untilNextTurnActive: hasEffect(
      mechanics,
      fighterId,
      state.effectProcedureRefs.untilNextTurn,
    ),
    startTurnOngoingFeatureActive: hasOngoingFeature(
      mechanics,
      fighterId,
      ongoingFeatureProcedureRef(mechanics, "turnBoundary"),
    ),
    endTurnOngoingFeatureActive: hasOngoingFeature(
      mechanics,
      fighterId,
      ongoingFeatureProcedureRef(mechanics, "fixedDuration"),
    ),
    turnStartDamageAppliedBeforeEndDamage:
      state.turnStartDamageAppliedBeforeEndDamage,
    turnEndDamageAppliedBeforeExpiry: state.turnEndDamageAppliedBeforeExpiry,
    endTurnOngoingExpiredAtTargetEnd: state.endTurnOngoingExpiredAtTargetEnd,
    untilNextTurnExpiredAtSourceStart: state.untilNextTurnExpiredAtSourceStart,
    startTurnOngoingExpiredAtSourceStart:
      state.startTurnOngoingExpiredAtSourceStart,
    turnStartDurationExpiredAfterRoundTick:
      state.turnStartDurationExpiredAfterRoundTick,
    lastHoleOrder: state.lastHoleOrder,
  };
}

function turnBoundaryLifecycleFrontier(
  envelope: ReturnType<typeof currentBattleCheckpointFrontierEnvelope>,
): TurnBoundaryLifecycleFrontier {
  if (envelope.frontier.kind !== "holes") {
    return noOpenFrontier;
  }
  const pendingProcedure = envelope.frontier.pendingProcedure;
  if (pendingProcedure.kind !== "turnBoundary") {
    throw new Error(
      "Expected turn-boundary lifecycle holes to expose a turn-boundary procedure.",
    );
  }
  const replayOwner = turnBoundaryActorForCombatant(
    envelope.frontier.replaySubject,
  );
  const durableOwner = turnBoundaryActorForCombatant(
    envelope.checkpoint.currentActorId,
  );
  const sourceTurnOwner = turnBoundaryActorForSourceTurn(
    pendingProcedure.sourceTurn,
  );
  if (pendingProcedure.request.kind === "outgoingEndTurn") {
    return {
      kind: "openTurnBoundary",
      durableCurrentTurnOwner: durableOwner,
      replayRootOwner: replayOwner,
      pendingProcedureOwner: turnBoundaryActorForCombatant(
        pendingProcedure.endingActorId,
      ),
      request: "outgoingEndTurn",
      sourceTurnOwner,
      sourceTurnRound: pendingProcedure.sourceTurn.round,
    };
  }
  if (pendingProcedure.request.kind === "startTurnOccurrenceOrder") {
    throw new Error(
      "The focused lifecycle fixture expects a single start-turn occurrence.",
    );
  }
  const request =
    pendingProcedure.request.occurrence.kind === "spellTurnStartDamageAndSave"
      ? "startTurnSpellDamageAndSave"
      : undefined;
  if (request === undefined) {
    throw new Error(
      "Expected focused lifecycle frontier to expose the spell start-turn occurrence.",
    );
  }
  return {
    kind: "openTurnBoundary",
    durableCurrentTurnOwner: durableOwner,
    replayRootOwner: replayOwner,
    pendingProcedureOwner: sourceTurnOwner,
    request,
    sourceTurnOwner,
    sourceTurnRound: pendingProcedure.sourceTurn.round,
  };
}

function turnBoundaryActorForCombatant(
  subject: BattleSubject | string,
): TurnBoundaryActor {
  const combatantId =
    typeof subject === "string"
      ? subject
      : subject.tag === "runtimeCommand"
        ? subject.actorId
        : undefined;
  if (combatantId === fighterId) {
    return "sourceTurn";
  }
  if (combatantId === goblinId) {
    return "targetTurn";
  }
  throw new Error("Unexpected combatant in turn-boundary lifecycle frontier.");
}

function turnBoundaryActorForSourceTurn(
  sourceTurn: TurnBoundaryProcedure["sourceTurn"],
): TurnBoundaryActor {
  return turnBoundaryActorForCombatant(sourceTurn.actorId);
}

function assertNeedsHoles(
  result: BattleResolutionResult,
  label: string,
): asserts result is TurnBoundaryOrdinaryHolesResult {
  if (result.tag !== "needsHoles" || result.frontier.kind !== "holes") {
    throw new Error(`Expected ${label} to need holes.`);
  }
}

function assertResolved(
  result: BattleResolutionResult,
  label: string,
): asserts result is Extract<
  BattleResolutionResult,
  { readonly tag: "resolved" }
> {
  if (result.tag !== "resolved") {
    throw new Error(`Expected ${label} to resolve.`);
  }
}

function routeEventsOf(
  result: BattleResolutionResult,
  label: string,
): readonly ReducerRouteEvent[] {
  if (result.routeEvents === undefined) {
    throw new Error(`Expected public reducer route events for ${label}.`);
  }
  return result.routeEvents;
}

function findSpellConditionEndTurnSaveHole(
  holes: readonly BattleHole[],
): Extract<
  BattleHole,
  {
    readonly kind: "savingThrowOutcome";
    readonly spellConditionEndTurnSave: unknown;
  }
> {
  const hole = holes.find(
    (
      candidate,
    ): candidate is Extract<
      BattleHole,
      {
        readonly kind: "savingThrowOutcome";
        readonly spellConditionEndTurnSave: unknown;
      }
    > =>
      candidate.kind === "savingThrowOutcome" &&
      "spellConditionEndTurnSave" in candidate,
  );
  if (hole === undefined) {
    throw new Error("Expected spell condition end-turn save hole.");
  }
  return hole;
}

const turnBoundaryLifecycleStateCheck = stateCheck(
  turnBoundaryLifecycleProjectionFromQuint,
  (
    spec: TurnBoundaryLifecycleProjection,
    impl: TurnBoundaryLifecycleProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);

const turnBoundaryRouteStateCheck = stateCheck(
  turnBoundaryRouteProjectionFromQuint,
  (spec: TurnBoundaryRouteProjection, impl: TurnBoundaryRouteProjection) => {
    expect(impl).toEqual(spec);
    return true;
  },
);

function turnBoundaryLifecycleProjectionFromQuint(
  rawState: unknown,
): TurnBoundaryLifecycleProjection {
  const state = quintRecordField(quintStateRecord(rawState), "qState");
  const scenario = variantValue(
    state["qScenario"],
    "qScenario",
    scenarioByQuintTag,
  );
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "none",
    decodeHole: turnBoundaryLifecycleHole,
  });
  assertWitnessProtocolConsistentWithScenario({
    label: "turn-boundary lifecycle",
    scenarioOutcome: scenario,
    protocol,
  });
  return {
    scenario,
    actor: variantValue(state["qActor"], "qActor", actorByQuintTag),
    frontier: turnBoundaryLifecycleFrontierFromQuint(
      quintField(state, "frontier"),
    ),
    round: numberFromQuintInt(state["qRound"], "qRound"),
    targetHp: numberFromQuintInt(state["qTargetHp"], "qTargetHp"),
    turnStartDamageActive: booleanField(state, "qTurnStartDamageActive"),
    turnEndDamageActive: booleanField(state, "qTurnEndDamageActive"),
    untilNextTurnActive: booleanField(state, "qUntilNextTurnActive"),
    startTurnOngoingFeatureActive: booleanField(
      state,
      "qStartTurnOngoingFeatureActive",
    ),
    endTurnOngoingFeatureActive: booleanField(
      state,
      "qEndTurnOngoingFeatureActive",
    ),
    turnStartDamageAppliedBeforeEndDamage: booleanField(
      state,
      "qTurnStartDamageAppliedBeforeEndDamage",
    ),
    turnEndDamageAppliedBeforeExpiry: booleanField(
      state,
      "qTurnEndDamageAppliedBeforeExpiry",
    ),
    endTurnOngoingExpiredAtTargetEnd: booleanField(
      state,
      "qEndTurnOngoingExpiredAtTargetEnd",
    ),
    untilNextTurnExpiredAtSourceStart: booleanField(
      state,
      "qUntilNextTurnExpiredAtSourceStart",
    ),
    startTurnOngoingExpiredAtSourceStart: booleanField(
      state,
      "qStartTurnOngoingExpiredAtSourceStart",
    ),
    turnStartDurationExpiredAfterRoundTick: booleanField(
      state,
      "qTurnStartDurationExpiredAfterRoundTick",
    ),
    lastHoleOrder: variantValue(
      state["qLastHoleOrder"],
      "qLastHoleOrder",
      holeOrderByQuintTag,
    ),
  };
}

function turnBoundaryLifecycleFrontierFromQuint(
  raw: unknown,
): TurnBoundaryLifecycleFrontier {
  const tag = quintVariantTag(raw, "qState.frontier");
  if (tag === "NoOpenFrontier") {
    return noOpenFrontier;
  }
  if (tag !== "OpenTurnBoundary") {
    throw new Error(`Unexpected qState.frontier variant ${tag}.`);
  }
  const value = quintRecordField(
    { value: quintVariantValue(raw, "OpenTurnBoundary", "qState.frontier") },
    "value",
  );
  const request = variantValue(
    quintField(value, "request"),
    "qState.frontier.request",
    {
      StartTurnSpellDamageAndSave: "startTurnSpellDamageAndSave",
      OutgoingEndTurn: "outgoingEndTurn",
    } as const,
  );
  return {
    kind: "openTurnBoundary",
    durableCurrentTurnOwner: variantValue(
      quintField(value, "durableCurrentTurnOwner"),
      "qState.frontier.durableCurrentTurnOwner",
      actorByQuintTag,
    ),
    replayRootOwner: variantValue(
      quintField(value, "replayRootOwner"),
      "qState.frontier.replayRootOwner",
      actorByQuintTag,
    ),
    pendingProcedureOwner: variantValue(
      quintField(value, "pendingProcedureOwner"),
      "qState.frontier.pendingProcedureOwner",
      actorByQuintTag,
    ),
    request,
    sourceTurnOwner: variantValue(
      quintField(value, "sourceTurnOwner"),
      "qState.frontier.sourceTurnOwner",
      actorByQuintTag,
    ),
    sourceTurnRound: numberFromQuintInt(
      quintField(value, "sourceTurnRound"),
      "qState.frontier.sourceTurnRound",
    ),
  };
}

function turnBoundaryRouteProjectionFromQuint(
  rawState: unknown,
): TurnBoundaryRouteProjection {
  const state = quintStateRecord(rawState);
  return {
    surface: variantValue(
      quintField(state, "qSurface"),
      "qSurface",
      turnBoundaryRouteSurfaceByQuintTag,
    ),
    route: decodeReducerRoute(quintField(state, "qRoute")),
  };
}

function turnBoundaryLifecycleHole(raw: unknown): TurnBoundaryLifecycleHole {
  const tag = quintVariantTag(raw);
  const byTag: Readonly<Record<string, TurnBoundaryLifecycleHole>> = {
    TurnStartDamage: "turnStartDamage",
    TurnStartSave: "turnStartSave",
    TurnEndDamage: "turnEndDamage",
    TurnBoundaryLifecycle: "turnBoundaryLifecycle",
  };
  const value = byTag[tag];
  if (value !== undefined) {
    return value;
  }
  throw new Error(`Unexpected turn-boundary lifecycle hole ${tag}.`);
}

function variantValue<const Value extends string>(
  raw: unknown,
  field: string,
  byTag: Readonly<Record<string, Value>>,
): Value {
  const tag = quintVariantTag(raw, field);
  const value = byTag[tag];
  if (value !== undefined) {
    return value;
  }
  throw new Error(`Unexpected ${field} variant ${tag}.`);
}

function currentActorProjection(
  snapshot: ReturnType<typeof snapshotBattle>,
): TurnBoundaryActor {
  return snapshot.currentActorId === fighterId ? "sourceTurn" : "targetTurn";
}

function holeOrder(holes: readonly BattleHole[]): TurnBoundaryHoleOrder {
  const kinds = holes.map((hole) => hole.kind);
  if (kinds.length === 0) {
    return "noBoundaryHoles";
  }
  if (
    kinds.length === 2 &&
    kinds[0] === "rolledDice" &&
    kinds[1] === "savingThrowOutcome"
  ) {
    return "turnStartDamageThenSave";
  }
  if (kinds.length === 1 && kinds[0] === "rolledDice") {
    return "turnEndDamageOnly";
  }
  throw new Error(`Unexpected turn-boundary hole order ${kinds.join(",")}.`);
}

function hasEffect(
  state: BattleState,
  combatantId: typeof fighterId | typeof goblinId,
  sourceProcedureRef: BattleProcedureExecutionRef,
): boolean {
  return requireCombatant(state, combatantId).activeEffects.some(
    (effect) =>
      "sourceProcedureRef" in effect &&
      effect.sourceProcedureRef === sourceProcedureRef,
  );
}

function hasOngoingFeature(
  state: BattleState,
  combatantId: typeof fighterId | typeof goblinId,
  sourceKey: OngoingFeatureSourceKey,
): boolean {
  return requireCombatant(
    state,
    combatantId,
  ).activeOngoingFeatureOccurrences.has(sourceKey);
}

function targetHp(state: BattleState): number {
  return Number(requireCombatant(state, goblinId).hp);
}

function requireCombatant(
  state: BattleState,
  combatantId: typeof fighterId | typeof goblinId,
): BattleCreatureState {
  const combatant = state.combatants.get(combatantId);
  if (combatant === undefined) {
    throw new Error(`Expected combatant ${combatantId}.`);
  }
  return combatant;
}
