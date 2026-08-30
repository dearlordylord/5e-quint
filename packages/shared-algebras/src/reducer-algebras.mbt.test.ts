import * as path from "node:path";

import {
  defineDriver,
  ITFBigInt,
  quintRun,
  stateCheck,
} from "@firfi/quint-connect/effect";
import {
  Brand,
  Effect,
  Match,
  Option,
  Result,
  Schema,
  SchemaGetter,
} from "effect";
import { describe, expect, it } from "vitest";

import type { ActionRestriction } from "@dnd/surface/surface/types";
import {
  CreatureId as CreatureIdSchema,
  Index,
  Initiative,
  Round,
  type BattleProcedureExecutionRef,
} from "@dnd/shared/types";

import {
  grantUnitActionResource,
  resetTurnActionEconomy,
  spendAction,
  spendActivationResource,
  type ActionEconomyState,
  type RuntimeActionResource,
} from "./action-economy-algebra.ts";
import {
  applyCondition,
  EMPTY_CONDITION_STATE,
  hasCondition,
  isIncapacitated,
  removeCondition,
  type ConditionState,
} from "./conditions-algebra.ts";
import {
  addDeathFailures,
  resetDeathSaveRuntimeState,
  resolveDeathSavingThrow,
  type DeathSaveRuntimeState,
} from "./death-saves-algebra.ts";
import {
  createInitiativeStack,
  insertByInitiative,
  nextInitiative,
  removeFromInitiative,
  type InitiativeEntry,
  type InitiativeStack,
  type InitiativeTieDecision,
} from "./initiative-algebra.ts";

type ActionEconomyProjection = {
  readonly turnActionAvailable: boolean;
  readonly restrictedUnitActionProcedureRefs: readonly BattleProcedureExecutionRef[];
  readonly hasBonusAction: boolean;
};

type ConditionsProjection = {
  readonly blinded: boolean;
  readonly charmed: boolean;
  readonly deafened: boolean;
  readonly frightened: boolean;
  readonly grappled: boolean;
  readonly invisible: boolean;
  readonly paralyzed: boolean;
  readonly petrified: boolean;
  readonly poisoned: boolean;
  readonly prone: boolean;
  readonly restrained: boolean;
  readonly stunned: boolean;
  readonly unconscious: boolean;
  readonly directIncapacitated: boolean;
  readonly hasIncapacitated: boolean;
  readonly hasProne: boolean;
};

type DeathSavesProjection = {
  readonly successes: number;
  readonly failures: number;
  readonly stable: boolean;
  readonly dead: boolean;
  readonly hpRegained: boolean;
};

type InitiativeProjection = {
  readonly round: number;
  readonly alreadyActed: readonly InitiativeProjectionEntry[];
  readonly stillToAct: readonly InitiativeProjectionEntry[];
  readonly lastInsert: InitiativeLastInsert;
};

type InitiativeLastInsert =
  | { readonly status: "none" | "ok" | "error"; readonly tie: readonly [] }
  | { readonly status: "decide"; readonly tie: readonly [string, ...string[]] };

type InitiativeProjectionEntry = {
  readonly creature: string;
  readonly initiative: number;
};

const actionEconomyDriverSchema = {
  init: {},
  doSpendAttackAction: {},
  doSpendMagicAction: {},
  doGrantRestrictedUnitActionA: {},
  doGrantRestrictedUnitActionB: {},
  doSpendBonusAction: {},
  doSpendFreeAction: {},
  doResetTurn: {},
  step: {},
} as const;

const conditionsDriverSchema = {
  init: {},
  doApplyBlinded: {},
  doRemoveBlinded: {},
  doApplyProne: {},
  doRemoveProne: {},
  doApplyParalyzed: {},
  doRemoveParalyzed: {},
  doApplyUnconscious: {},
  doRemoveUnconscious: {},
  doApplyDirectIncapacitated: {},
  doRemoveDirectIncapacitated: {},
  step: {},
} as const;

const deathSavesDriverSchema = {
  init: {},
  doRollFail: {},
  doRollNat1: {},
  doRollSuccess: {},
  doRollNat20: {},
  doDamageFailure: {},
  doCriticalDamageFailure: {},
  step: {},
} as const;

const initiativeDriverSchema = {
  init: {},
  doNext: {},
  doRemoveC1: {},
  doRemoveC2: {},
  doInsertC3NoDecision: {},
  doInsertCxTieNoDecision: {},
  doInsertCxTieDecision: {},
  doInsertC3WrongDecision: {},
  step: {},
} as const;

const unitOwnerId = Schema.decodeUnknownSync(CreatureIdSchema)("algebra-owner");
const battleProcedureExecutionRef =
  Brand.nominal<BattleProcedureExecutionRef>();
const unitActionA = battleProcedureExecutionRef("unit-action-a");
const unitActionB = battleProcedureExecutionRef("unit-action-b");
const magicExcludedRestriction: ActionRestriction = {
  kind: "exclude",
  actions: ["magic"],
};

function createActionEconomyDriver() {
  return defineDriver(actionEconomyDriverSchema, () => {
    let state = initialActionEconomyState();

    function reset(): void {
      state = initialActionEconomyState();
    }

    function grantUnitAction(
      sourceProcedureRef: BattleProcedureExecutionRef,
    ): void {
      const result = grantUnitActionResource(
        state,
        unitOwnerId,
        sourceProcedureRef,
        magicExcludedRestriction,
      );
      if (Result.isSuccess(result)) {
        state = result.success;
      }
    }

    function spendActionIfAllowed(action: "attack" | "magic"): void {
      const result = spendAction(state, action);
      if (Result.isSuccess(result)) {
        state = result.success;
      }
    }

    return {
      init: () => Effect.sync(reset),
      doSpendAttackAction: () =>
        Effect.sync(() => spendActionIfAllowed("attack")),
      doSpendMagicAction: () =>
        Effect.sync(() => spendActionIfAllowed("magic")),
      doGrantRestrictedUnitActionA: () =>
        Effect.sync(() => grantUnitAction(unitActionA)),
      doGrantRestrictedUnitActionB: () =>
        Effect.sync(() => grantUnitAction(unitActionB)),
      doSpendBonusAction: () =>
        Effect.sync(() => {
          const result = spendActivationResource(state, {
            kind: "bonusAction",
          });
          if (Result.isSuccess(result)) {
            state = result.success;
          }
        }),
      doSpendFreeAction: () =>
        Effect.sync(() => {
          const result = spendActivationResource(state, { kind: "free" });
          if (Result.isSuccess(result)) {
            state = result.success;
          }
        }),
      doResetTurn: () => Effect.sync(reset),
      step: () => Effect.void,
      getState: () => Effect.succeed(projectActionEconomy(state)),
    };
  });
}

function createConditionsDriver() {
  return defineDriver(conditionsDriverSchema, () => {
    let state = EMPTY_CONDITION_STATE;

    function reset(): void {
      state = EMPTY_CONDITION_STATE;
    }

    return {
      init: () => Effect.sync(reset),
      doApplyBlinded: () =>
        Effect.sync(() => {
          state = applyCondition(state, "blinded");
        }),
      doRemoveBlinded: () =>
        Effect.sync(() => {
          state = removeCondition(state, "blinded");
        }),
      doApplyProne: () =>
        Effect.sync(() => {
          state = applyCondition(state, "prone");
        }),
      doRemoveProne: () =>
        Effect.sync(() => {
          state = removeCondition(state, "prone");
        }),
      doApplyParalyzed: () =>
        Effect.sync(() => {
          state = applyCondition(state, "paralyzed");
        }),
      doRemoveParalyzed: () =>
        Effect.sync(() => {
          state = removeCondition(state, "paralyzed");
        }),
      doApplyUnconscious: () =>
        Effect.sync(() => {
          state = applyCondition(state, "unconscious");
        }),
      doRemoveUnconscious: () =>
        Effect.sync(() => {
          state = removeCondition(state, "unconscious");
        }),
      doApplyDirectIncapacitated: () =>
        Effect.sync(() => {
          state = applyCondition(state, "incapacitated");
        }),
      doRemoveDirectIncapacitated: () =>
        Effect.sync(() => {
          state = removeCondition(state, "incapacitated");
        }),
      step: () => Effect.void,
      getState: () => Effect.succeed(projectConditions(state)),
    };
  });
}

function createDeathSavesDriver() {
  return defineDriver(deathSavesDriverSchema, () => {
    let state = resetDeathSaveRuntimeState();

    function reset(): void {
      state = resetDeathSaveRuntimeState();
    }

    return {
      init: () => Effect.sync(reset),
      doRollFail: () =>
        Effect.sync(() => {
          state = resolveDeathSavingThrow(state, 5);
        }),
      doRollNat1: () =>
        Effect.sync(() => {
          state = resolveDeathSavingThrow(state, 1);
        }),
      doRollSuccess: () =>
        Effect.sync(() => {
          state = resolveDeathSavingThrow(state, 10);
        }),
      doRollNat20: () =>
        Effect.sync(() => {
          state = resolveDeathSavingThrow(state, 20);
        }),
      doDamageFailure: () =>
        Effect.sync(() => {
          state = addDeathFailures(state, 1);
        }),
      doCriticalDamageFailure: () =>
        Effect.sync(() => {
          state = addDeathFailures(state, 2);
        }),
      step: () => Effect.void,
      getState: () => Effect.succeed(projectDeathSaves(state)),
    };
  });
}

function createInitiativeDriver() {
  return defineDriver(initiativeDriverSchema, () => {
    let stack = initialInitiativeStack();
    let lastInsert: InitiativeLastInsert = { status: "none", tie: [] };

    function reset(): void {
      stack = initialInitiativeStack();
      lastInsert = { status: "none", tie: [] };
    }

    function removeCreature(creature: string): void {
      const result = removeFromInitiative(stack, (value) => value === creature);
      if (Option.isSome(result)) {
        stack = result.value;
      }
    }

    function insertCreature(
      creature: string,
      initiative: number,
      decision?: readonly [readonly [string, ...string[]], number],
    ): void {
      const result = insertByInitiative(
        stack,
        creature,
        Initiative(initiative),
        decision == null ? undefined : initiativeTieDecision(decision),
      );
      if (result.status === "ok") {
        stack = result.stack;
        lastInsert = { status: "ok", tie: [] };
        return;
      }
      if (result.status === "decide") {
        lastInsert = { status: "decide", tie: result.tie };
        return;
      }
      lastInsert = { status: "error", tie: [] };
    }

    return {
      init: () => Effect.sync(reset),
      doNext: () =>
        Effect.sync(() => {
          stack = nextInitiative(stack);
        }),
      doRemoveC1: () => Effect.sync(() => removeCreature("c1")),
      doRemoveC2: () => Effect.sync(() => removeCreature("c2")),
      doInsertC3NoDecision: () => Effect.sync(() => insertCreature("c3", 3)),
      doInsertCxTieNoDecision: () => Effect.sync(() => insertCreature("cx", 2)),
      doInsertCxTieDecision: () =>
        Effect.sync(() => insertCreature("cx", 2, [["c2", "c2b"], 1])),
      doInsertC3WrongDecision: () =>
        Effect.sync(() => insertCreature("c3", 3, [["c1"], 0])),
      step: () => Effect.void,
      getState: () => Effect.succeed(projectInitiative(stack, lastInsert)),
    };
  });
}

const RESTRICTED_UNIT_ACTION_ORDERS = [0, 1, 2, 3, 4] as const;
type RestrictedUnitActionOrder = (typeof RESTRICTED_UNIT_ACTION_ORDERS)[number];

const quintNumberSchema = Schema.Union([
  Schema.Number,
  Schema.BigInt,
  ITFBigInt,
]).pipe(
  Schema.decodeTo(Schema.Number, {
    decode: SchemaGetter.transform<number, number | bigint>((value) =>
      typeof value === "bigint" ? Number(value) : value,
    ),
    encode: SchemaGetter.transform<number, number>((value) => value),
  }),
);

const quintRestrictedUnitActionOrderSchema = quintNumberSchema.pipe(
  Schema.refine(
    (value): value is RestrictedUnitActionOrder =>
      RESTRICTED_UNIT_ACTION_ORDERS.some((order) => order === value),
    { expected: "a restricted unit action order from 0 through 4" },
  ),
);

const restrictedUnitActionProcedureRefsByOrder = [
  [],
  [unitActionA],
  [unitActionB],
  [unitActionA, unitActionB],
  [unitActionB, unitActionA],
] as const;

const actionEconomySpecStateSchema = Schema.Struct({
  qTurnActionAvailable: Schema.Boolean,
  qRestrictedUnitActionOrder: quintRestrictedUnitActionOrderSchema,
  qHasBonusAction: Schema.Boolean,
});

const actionEconomyStateCheck = stateCheck(
  decodeActionEconomySpecState,
  compareState,
);

const conditionsSpecStateSchema = Schema.Struct({
  qBlinded: Schema.Boolean,
  qCharmed: Schema.Boolean,
  qDeafened: Schema.Boolean,
  qFrightened: Schema.Boolean,
  qGrappled: Schema.Boolean,
  qInvisible: Schema.Boolean,
  qParalyzed: Schema.Boolean,
  qPetrified: Schema.Boolean,
  qPoisoned: Schema.Boolean,
  qProne: Schema.Boolean,
  qRestrained: Schema.Boolean,
  qStunned: Schema.Boolean,
  qUnconscious: Schema.Boolean,
  qDirectIncapacitated: Schema.Boolean,
  qHasIncapacitated: Schema.Boolean,
  qHasProne: Schema.Boolean,
});

const conditionsStateCheck = stateCheck(
  decodeConditionsSpecState,
  compareState,
);

const deathSavesSpecStateSchema = Schema.Struct({
  qSuccesses: quintNumberSchema,
  qFailures: quintNumberSchema,
  qStable: Schema.Boolean,
  qDead: Schema.Boolean,
  qHpRegained: Schema.Boolean,
});

const deathSavesStateCheck = stateCheck(
  decodeDeathSavesSpecState,
  compareState,
);

const initiativeEntrySchema = Schema.Struct({
  creature: Schema.String,
  initiative: quintNumberSchema,
});

const LAST_INSERT_SIMPLE_VARIANTS = [
  "LastInsertNone",
  "LastInsertOk",
  "LastInsertErrorDecisionSuppliedWithoutTie",
] as const;
const lastInsertVariantTagSchema = Schema.Literals(LAST_INSERT_SIMPLE_VARIANTS);

const initiativeLastInsertObjectSchema = Schema.Union([
  Schema.Struct({ tag: Schema.Literal("LastInsertNone") }),
  Schema.Struct({ tag: Schema.Literal("LastInsertOk") }),
  Schema.Struct({
    tag: Schema.Literal("LastInsertDecision"),
    value: Schema.NonEmptyArray(Schema.String),
  }),
  Schema.Struct({
    tag: Schema.Literal("LastInsertErrorDecisionSuppliedWithoutTie"),
  }),
]);

const initiativeLastInsertSchema = Schema.Union([
  lastInsertVariantTagSchema,
  initiativeLastInsertObjectSchema,
]);

const initiativeSpecStateSchema = Schema.Struct({
  qRound: quintNumberSchema,
  qAlreadyActed: Schema.Array(initiativeEntrySchema),
  qStillToAct: Schema.Array(initiativeEntrySchema),
  qLastInsert: initiativeLastInsertSchema,
});

const initiativeStateCheck = stateCheck(
  decodeInitiativeSpecState,
  compareState,
);

describe("shared reducer algebra MBT", () => {
  it("replays action economy traces against the TypeScript reducer", async () => {
    await Effect.runPromise(
      quintRun({
        spec: path.resolve(
          import.meta.dirname,
          "../proofs/action-economy-algebra-inductive.qnt",
        ),
        init: "init",
        step: "step",
        driverFactory: createActionEconomyDriver(),
        backend: "typescript",
        nTraces: Number(process.env["MBT_TRACES"] ?? 1),
        maxSteps: Number(process.env["MBT_STEPS"] ?? 12),
        invariants: ["invariant"],
        stateCheck: actionEconomyStateCheck,
      }),
    );
  }, 120_000);

  it("replays condition traces against the TypeScript reducer", async () => {
    await Effect.runPromise(
      quintRun({
        spec: path.resolve(
          import.meta.dirname,
          "../proofs/conditions-algebra-inductive.qnt",
        ),
        init: "init",
        step: "step",
        driverFactory: createConditionsDriver(),
        backend: "typescript",
        nTraces: Number(process.env["MBT_TRACES"] ?? 1),
        maxSteps: Number(process.env["MBT_STEPS"] ?? 12),
        invariants: ["invariant"],
        stateCheck: conditionsStateCheck,
      }),
    );
  }, 120_000);

  it("replays death save traces against the TypeScript reducer", async () => {
    await Effect.runPromise(
      quintRun({
        spec: path.resolve(
          import.meta.dirname,
          "../proofs/death-saves-algebra-inductive.qnt",
        ),
        init: "init",
        step: "step",
        driverFactory: createDeathSavesDriver(),
        backend: "typescript",
        nTraces: Number(process.env["MBT_TRACES"] ?? 1),
        maxSteps: Number(process.env["MBT_STEPS"] ?? 12),
        invariants: ["invariant"],
        stateCheck: deathSavesStateCheck,
      }),
    );
  }, 120_000);

  it("replays initiative traces against the TypeScript reducer", async () => {
    await Effect.runPromise(
      quintRun({
        spec: path.resolve(
          import.meta.dirname,
          "../proofs/initiative-algebra-invariant.qnt",
        ),
        init: "init",
        step: "step",
        driverFactory: createInitiativeDriver(),
        backend: "typescript",
        nTraces: Number(process.env["MBT_TRACES"] ?? 1),
        maxSteps: Number(process.env["MBT_STEPS"] ?? 12),
        invariants: ["invariant"],
        stateCheck: initiativeStateCheck,
      }),
    );
  }, 120_000);
});

describe("shared reducer algebra trace-state decoders", () => {
  it("decodes encoded ITF bigint fields across projections", async () => {
    const actionState = await Effect.runPromise(
      decodeActionEconomySpecState({
        qTurnActionAvailable: true,
        qRestrictedUnitActionOrder: { "#bigint": "3" },
        qHasBonusAction: false,
      }),
    );
    const deathSaveState = await Effect.runPromise(
      decodeDeathSavesSpecState({
        qSuccesses: { "#bigint": "2" },
        qFailures: { "#bigint": "1" },
        qStable: false,
        qDead: false,
        qHpRegained: false,
      }),
    );
    const initiativeState = await Effect.runPromise(
      decodeInitiativeSpecState({
        qRound: { "#bigint": "2" },
        qAlreadyActed: [{ creature: "c4", initiative: { "#bigint": "4" } }],
        qStillToAct: [{ creature: "c1", initiative: { "#bigint": "1" } }],
        qLastInsert: {
          tag: "LastInsertDecision",
          value: ["c1"],
        },
      }),
    );

    expect(actionState).toEqual({
      turnActionAvailable: true,
      restrictedUnitActionProcedureRefs: [unitActionA, unitActionB],
      hasBonusAction: false,
    });
    expect(deathSaveState).toEqual({
      successes: 2,
      failures: 1,
      stable: false,
      dead: false,
      hpRegained: false,
    });
    expect(initiativeState).toEqual({
      round: 2,
      alreadyActed: [{ creature: "c4", initiative: 4 }],
      stillToAct: [{ creature: "c1", initiative: 1 }],
      lastInsert: { status: "decide", tie: ["c1"] },
    });
  });

  it("returns a typed failure for malformed action-economy state", async () => {
    const result = await Effect.runPromise(
      Effect.result(
        decodeActionEconomySpecState({
          qTurnActionAvailable: true,
          qRestrictedUnitActionOrder: 5,
          qHasBonusAction: true,
        }),
      ),
    );

    expect(Result.isFailure(result)).toBe(true);
  });

  it("returns a typed failure for malformed conditions state", async () => {
    const result = await Effect.runPromise(
      Effect.result(decodeConditionsSpecState({ qBlinded: "not-a-boolean" })),
    );

    expect(Result.isFailure(result)).toBe(true);
  });

  it("returns a typed failure for malformed death-save state", async () => {
    const result = await Effect.runPromise(
      Effect.result(decodeDeathSavesSpecState({ qSuccesses: "not-a-number" })),
    );

    expect(Result.isFailure(result)).toBe(true);
  });

  it("returns a typed failure for malformed initiative state", async () => {
    const result = await Effect.runPromise(
      Effect.result(
        decodeInitiativeSpecState({
          qRound: 1,
          qAlreadyActed: [],
          qStillToAct: [],
          qLastInsert: "LastInsertDecision",
        }),
      ),
    );

    expect(Result.isFailure(result)).toBe(true);
  });
});

function initialActionEconomyState(): ActionEconomyState {
  return resetTurnActionEconomy({
    actionResources: [],
    currentHasBonusAction: false,
    actionOrBonusActionExclusion: { kind: "notRestricted" },
    movementActionBonusActionExclusion: { kind: "notRestricted" },
  });
}

function projectActionEconomy(
  state: ActionEconomyState,
): ActionEconomyProjection {
  return {
    turnActionAvailable: state.actionResources.some(
      (resource) => resource.source === "turn",
    ),
    restrictedUnitActionProcedureRefs: restrictedUnitActionProcedureRefs(
      state.actionResources,
    ),
    hasBonusAction: state.currentHasBonusAction,
  };
}

function restrictedUnitActionProcedureRefs(
  resources: ReadonlyArray<RuntimeActionResource>,
): readonly BattleProcedureExecutionRef[] {
  return resources
    .filter((resource) => resource.source === "unit")
    .map((resource) => resource.sourceProcedureRef);
}

function projectConditions(state: ConditionState): ConditionsProjection {
  return {
    blinded: state.blinded,
    charmed: state.charmed,
    deafened: state.deafened,
    frightened: state.frightened,
    grappled: state.grappled,
    invisible: state.invisible,
    paralyzed: state.paralyzed,
    petrified: state.petrified,
    poisoned: state.poisoned,
    prone: state.prone,
    restrained: state.restrained,
    stunned: state.stunned,
    unconscious: state.unconscious,
    directIncapacitated: state.directIncapacitated,
    hasIncapacitated: isIncapacitated(state),
    hasProne: hasCondition(state, "prone"),
  };
}

function projectDeathSaves(state: DeathSaveRuntimeState): DeathSavesProjection {
  return {
    successes: state.deathSaves.successes,
    failures: state.deathSaves.failures,
    stable: state.stable,
    dead: state.dead,
    hpRegained: state.hpRegained,
  };
}

function initialInitiativeStack(): InitiativeStack<string> {
  return createInitiativeStack(
    [
      initiativeEntry("c4", 4),
      initiativeEntry("c2", 2),
      initiativeEntry("c2b", 2),
      initiativeEntry("c1", 1),
    ],
    Round(1),
  );
}

function initiativeEntry(
  creature: string,
  initiative: number,
): InitiativeEntry<string> {
  return { creature, initiative: Initiative(initiative) };
}

function initiativeTieDecision(
  decision: readonly [readonly [string, ...string[]], number],
): InitiativeTieDecision<string> {
  return [decision[0], Index(decision[1])];
}

function projectInitiative(
  stack: InitiativeStack<string>,
  lastInsert: InitiativeLastInsert,
): InitiativeProjection {
  return {
    round: stack.round,
    alreadyActed: stack.alreadyActed.map(projectInitiativeEntry),
    stillToAct: stack.stillToAct.map(projectInitiativeEntry),
    lastInsert,
  };
}

function projectInitiativeEntry(
  entry: InitiativeEntry<string>,
): InitiativeProjectionEntry {
  return {
    creature: entry.creature,
    initiative: entry.initiative,
  };
}

function decodeActionEconomySpecState(raw: unknown) {
  return Schema.decodeUnknownEffect(actionEconomySpecStateSchema)(raw).pipe(
    Effect.map(
      (state): ActionEconomyProjection => ({
        turnActionAvailable: state.qTurnActionAvailable,
        restrictedUnitActionProcedureRefs: [
          ...restrictedUnitActionProcedureRefsByOrder[
            state.qRestrictedUnitActionOrder
          ],
        ],
        hasBonusAction: state.qHasBonusAction,
      }),
    ),
  );
}

function decodeConditionsSpecState(raw: unknown) {
  return Schema.decodeUnknownEffect(conditionsSpecStateSchema)(raw).pipe(
    Effect.map((state) => ({
      blinded: state.qBlinded,
      charmed: state.qCharmed,
      deafened: state.qDeafened,
      frightened: state.qFrightened,
      grappled: state.qGrappled,
      invisible: state.qInvisible,
      paralyzed: state.qParalyzed,
      petrified: state.qPetrified,
      poisoned: state.qPoisoned,
      prone: state.qProne,
      restrained: state.qRestrained,
      stunned: state.qStunned,
      unconscious: state.qUnconscious,
      directIncapacitated: state.qDirectIncapacitated,
      hasIncapacitated: state.qHasIncapacitated,
      hasProne: state.qHasProne,
    })),
  );
}

function decodeDeathSavesSpecState(raw: unknown) {
  return Schema.decodeUnknownEffect(deathSavesSpecStateSchema)(raw).pipe(
    Effect.map((state) => ({
      successes: state.qSuccesses,
      failures: state.qFailures,
      stable: state.qStable,
      dead: state.qDead,
      hpRegained: state.qHpRegained,
    })),
  );
}

function decodeInitiativeSpecState(raw: unknown) {
  return Schema.decodeUnknownEffect(initiativeSpecStateSchema)(raw).pipe(
    Effect.map((state) => ({
      round: state.qRound,
      alreadyActed: state.qAlreadyActed,
      stillToAct: state.qStillToAct,
      lastInsert: decodeInitiativeLastInsert(state.qLastInsert),
    })),
  );
}

type InitiativeLastInsertInput = Schema.Schema.Type<
  typeof initiativeLastInsertSchema
>;

function decodeInitiativeLastInsert(
  raw: InitiativeLastInsertInput,
): InitiativeLastInsert {
  return Match.value(raw).pipe(
    Match.when("LastInsertNone", () => ({
      status: "none" as const,
      tie: [] as const,
    })),
    Match.when("LastInsertOk", () => ({
      status: "ok" as const,
      tie: [] as const,
    })),
    Match.when("LastInsertErrorDecisionSuppliedWithoutTie", () => ({
      status: "error" as const,
      tie: [] as const,
    })),
    Match.when({ tag: "LastInsertNone" }, () => ({
      status: "none" as const,
      tie: [] as const,
    })),
    Match.when({ tag: "LastInsertOk" }, () => ({
      status: "ok" as const,
      tie: [] as const,
    })),
    Match.when({ tag: "LastInsertErrorDecisionSuppliedWithoutTie" }, () => ({
      status: "error" as const,
      tie: [] as const,
    })),
    Match.when({ tag: "LastInsertDecision" }, ({ value }) => ({
      status: "decide" as const,
      tie: value,
    })),
    Match.exhaustive,
  );
}

function compareState<T>(spec: T, impl: T): boolean {
  expect(impl).toEqual(spec);
  return true;
}
