import * as path from "node:path";

// KERNEL-COVERAGE: parity-witness BATTLE.DAMAGE.DEATH_SAVING_THROW_LIFECYCLE

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Either, Option, Schema } from "effect";
import { describe, expect, it } from "vitest";

import type { ActionRestriction, UnitRecord } from "@dnd/surface/surface/types";
import {
  CreatureId as CreatureIdSchema,
  Index,
  Initiative,
  Round,
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
  readonly restrictedUnitActionIds: readonly UnitRecord["id"][];
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
const unitActionA: UnitRecord["id"] = "unit-action-a";
const unitActionB: UnitRecord["id"] = "unit-action-b";
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

    function grantUnitAction(sourceUnitId: UnitRecord["id"]): void {
      const result = grantUnitActionResource(
        state,
        unitOwnerId,
        sourceUnitId,
        magicExcludedRestriction,
      );
      if (Either.isRight(result)) {
        state = result.right;
      }
    }

    function spendActionIfAllowed(action: "attack" | "magic"): void {
      const result = spendAction(state, action);
      if (Either.isRight(result)) {
        state = result.right;
      }
    }

    return {
      init: reset,
      doSpendAttackAction: () => spendActionIfAllowed("attack"),
      doSpendMagicAction: () => spendActionIfAllowed("magic"),
      doGrantRestrictedUnitActionA: () => grantUnitAction(unitActionA),
      doGrantRestrictedUnitActionB: () => grantUnitAction(unitActionB),
      doSpendBonusAction: () => {
        const result = spendActivationResource(state, { kind: "bonusAction" });
        if (Either.isRight(result)) {
          state = result.right;
        }
      },
      doSpendFreeAction: () => {
        const result = spendActivationResource(state, { kind: "free" });
        if (Either.isRight(result)) {
          state = result.right;
        }
      },
      doResetTurn: reset,
      step: () => {},
      getState: () => projectActionEconomy(state),
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
      init: reset,
      doApplyBlinded: () => {
        state = applyCondition(state, "blinded");
      },
      doRemoveBlinded: () => {
        state = removeCondition(state, "blinded");
      },
      doApplyProne: () => {
        state = applyCondition(state, "prone");
      },
      doRemoveProne: () => {
        state = removeCondition(state, "prone");
      },
      doApplyParalyzed: () => {
        state = applyCondition(state, "paralyzed");
      },
      doRemoveParalyzed: () => {
        state = removeCondition(state, "paralyzed");
      },
      doApplyUnconscious: () => {
        state = applyCondition(state, "unconscious");
      },
      doRemoveUnconscious: () => {
        state = removeCondition(state, "unconscious");
      },
      doApplyDirectIncapacitated: () => {
        state = applyCondition(state, "incapacitated");
      },
      doRemoveDirectIncapacitated: () => {
        state = removeCondition(state, "incapacitated");
      },
      step: () => {},
      getState: () => projectConditions(state),
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
      init: reset,
      doRollFail: () => {
        state = resolveDeathSavingThrow(state, 5);
      },
      doRollNat1: () => {
        state = resolveDeathSavingThrow(state, 1);
      },
      doRollSuccess: () => {
        state = resolveDeathSavingThrow(state, 10);
      },
      doRollNat20: () => {
        state = resolveDeathSavingThrow(state, 20);
      },
      doDamageFailure: () => {
        state = addDeathFailures(state, 1);
      },
      doCriticalDamageFailure: () => {
        state = addDeathFailures(state, 2);
      },
      step: () => {},
      getState: () => projectDeathSaves(state),
    };
  });
}

function createInitiativeDriver() {
  return defineDriver(initiativeDriverSchema, () => {
    let stack = initialInitiativeStack();
    let lastInsertStatus: InitiativeLastInsert["status"] = "none";
    let lastTie: readonly string[] = [];

    function reset(): void {
      stack = initialInitiativeStack();
      lastInsertStatus = "none";
      lastTie = [];
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
        lastInsertStatus = "ok";
        lastTie = [];
        return;
      }
      if (result.status === "decide") {
        lastInsertStatus = "decide";
        lastTie = result.tie;
        return;
      }
      lastInsertStatus = "error";
      lastTie = [];
    }

    return {
      init: reset,
      doNext: () => {
        stack = nextInitiative(stack);
      },
      doRemoveC1: () => removeCreature("c1"),
      doRemoveC2: () => removeCreature("c2"),
      doInsertC3NoDecision: () => insertCreature("c3", 3),
      doInsertCxTieNoDecision: () => insertCreature("cx", 2),
      doInsertCxTieDecision: () => insertCreature("cx", 2, [["c2", "c2b"], 1]),
      doInsertC3WrongDecision: () => insertCreature("c3", 3, [["c1"], 0]),
      step: () => {},
      getState: () => projectInitiative(stack, lastInsertStatus, lastTie),
    };
  });
}

const actionEconomyStateCheck = stateCheck(
  normalizeActionEconomySpecState,
  compareState,
);
const conditionsStateCheck = stateCheck(
  normalizeConditionsSpecState,
  compareState,
);
const deathSavesStateCheck = stateCheck(
  normalizeDeathSavesSpecState,
  compareState,
);
const initiativeStateCheck = stateCheck(
  normalizeInitiativeSpecState,
  compareState,
);

describe("shared reducer algebra MBT", () => {
  it("replays action economy traces against the TypeScript reducer", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../proofs/action-economy-algebra-inductive.qnt",
      ),
      init: "init",
      step: "step",
      driver: createActionEconomyDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 12),
      invariants: ["invariant"],
      stateCheck: actionEconomyStateCheck,
    });
  }, 120_000);

  it("replays condition traces against the TypeScript reducer", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../proofs/conditions-algebra-inductive.qnt",
      ),
      init: "init",
      step: "step",
      driver: createConditionsDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 12),
      invariants: ["invariant"],
      stateCheck: conditionsStateCheck,
    });
  }, 120_000);

  it("replays death save traces against the TypeScript reducer", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../proofs/death-saves-algebra-inductive.qnt",
      ),
      init: "init",
      step: "step",
      driver: createDeathSavesDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 12),
      invariants: ["invariant"],
      stateCheck: deathSavesStateCheck,
    });
  }, 120_000);

  it("replays initiative traces against the TypeScript reducer", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../proofs/initiative-algebra-invariant.qnt",
      ),
      init: "init",
      step: "step",
      driver: createInitiativeDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 12),
      invariants: ["invariant"],
      stateCheck: initiativeStateCheck,
    });
  }, 120_000);
});

function initialActionEconomyState(): ActionEconomyState {
  return resetTurnActionEconomy({
    actionResources: [],
    currentHasBonusAction: false,
    actionOrBonusActionExclusion: { kind: "notRestricted" },
  });
}

function projectActionEconomy(
  state: ActionEconomyState,
): ActionEconomyProjection {
  return {
    turnActionAvailable: state.actionResources.some(
      (resource) => resource.source === "turn",
    ),
    restrictedUnitActionIds: restrictedUnitActionIds(state.actionResources),
    hasBonusAction: state.currentHasBonusAction,
  };
}

function restrictedUnitActionIds(
  resources: ReadonlyArray<RuntimeActionResource>,
): readonly UnitRecord["id"][] {
  return resources
    .filter((resource) => resource.source === "unit")
    .map((resource) => resource.sourceUnitId);
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
  lastInsertStatus: InitiativeLastInsert["status"],
  lastTie: readonly string[],
): InitiativeProjection {
  return {
    round: stack.round,
    alreadyActed: stack.alreadyActed.map(projectInitiativeEntry),
    stillToAct: stack.stillToAct.map(projectInitiativeEntry),
    lastInsert: initiativeLastInsert(lastInsertStatus, lastTie),
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

function normalizeActionEconomySpecState(
  raw: unknown,
): ActionEconomyProjection {
  const state = quintStateRecord(raw);
  return {
    turnActionAvailable: booleanField(state, "qTurnActionAvailable"),
    restrictedUnitActionIds: quintRestrictedUnitActionIds(
      numberField(state, "qRestrictedUnitActionOrder"),
    ),
    hasBonusAction: booleanField(state, "qHasBonusAction"),
  };
}

function quintRestrictedUnitActionIds(
  order: number,
): readonly UnitRecord["id"][] {
  if (order === 0) return [];
  if (order === 1) return [unitActionA];
  if (order === 2) return [unitActionB];
  if (order === 3) return [unitActionA, unitActionB];
  if (order === 4) return [unitActionB, unitActionA];
  throw new Error(`Unknown Quint restricted unit action order: ${order}.`);
}

function normalizeConditionsSpecState(raw: unknown): ConditionsProjection {
  const state = quintStateRecord(raw);
  return {
    blinded: booleanField(state, "qBlinded"),
    charmed: booleanField(state, "qCharmed"),
    deafened: booleanField(state, "qDeafened"),
    frightened: booleanField(state, "qFrightened"),
    grappled: booleanField(state, "qGrappled"),
    invisible: booleanField(state, "qInvisible"),
    paralyzed: booleanField(state, "qParalyzed"),
    petrified: booleanField(state, "qPetrified"),
    poisoned: booleanField(state, "qPoisoned"),
    prone: booleanField(state, "qProne"),
    restrained: booleanField(state, "qRestrained"),
    stunned: booleanField(state, "qStunned"),
    unconscious: booleanField(state, "qUnconscious"),
    directIncapacitated: booleanField(state, "qDirectIncapacitated"),
    hasIncapacitated: booleanField(state, "qHasIncapacitated"),
    hasProne: booleanField(state, "qHasProne"),
  };
}

function normalizeDeathSavesSpecState(raw: unknown): DeathSavesProjection {
  const state = quintStateRecord(raw);
  return {
    successes: numberField(state, "qSuccesses"),
    failures: numberField(state, "qFailures"),
    stable: booleanField(state, "qStable"),
    dead: booleanField(state, "qDead"),
    hpRegained: booleanField(state, "qHpRegained"),
  };
}

function normalizeInitiativeSpecState(raw: unknown): InitiativeProjection {
  const state = quintStateRecord(raw);
  return {
    round: numberField(state, "qRound"),
    alreadyActed: listField(state, "qAlreadyActed").map(
      normalizeInitiativeEntry,
    ),
    stillToAct: listField(state, "qStillToAct").map(normalizeInitiativeEntry),
    lastInsert: initiativeLastInsert(
      normalizeInsertStatus(state["qLastInsertStatus"]),
      listField(state, "qLastTie").map(stringValue),
    ),
  };
}

function initiativeLastInsert(
  status: InitiativeLastInsert["status"],
  tie: readonly string[],
): InitiativeLastInsert {
  if (status === "decide") {
    if (tie.length === 0) {
      throw new Error("Expected decide insert status to carry a nonempty tie.");
    }
    return { status, tie: nonEmptyTie(tie) };
  }

  if (tie.length > 0) {
    throw new Error("Expected non-decide insert status to carry no tie.");
  }
  return { status, tie: [] };
}

function nonEmptyTie(tie: readonly string[]): readonly [string, ...string[]] {
  if (tie.length === 0) {
    throw new Error("Expected initiative tie to be nonempty.");
  }
  return [tie[0], ...tie.slice(1)];
}

function normalizeInitiativeEntry(raw: unknown): InitiativeProjectionEntry {
  if (!isRecord(raw)) {
    throw new Error("Expected Quint initiative entry to be an object.");
  }
  return {
    creature: stringField(raw, "creature"),
    initiative: numberField(raw, "initiative"),
  };
}

function compareState<T>(spec: T, impl: T): boolean {
  expect(impl).toEqual(spec);
  return true;
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (!isRecord(raw)) {
    throw new Error("Expected Quint state to be an object.");
  }
  return raw;
}

function numberField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): number {
  const value = state[field];
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  throw new Error(`Expected Quint integer field ${field}.`);
}

function booleanField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): boolean {
  const value = state[field];
  if (typeof value === "boolean") return value;
  throw new Error(`Expected Quint boolean field ${field}.`);
}

function stringField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): string {
  return stringValue(state[field]);
}

function stringValue(value: unknown): string {
  if (typeof value === "string") return value;
  throw new Error(`Expected Quint string, got ${String(value)}.`);
}

function listField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): readonly unknown[] {
  const value = state[field];
  if (Array.isArray(value)) return value;
  throw new Error(`Expected Quint list field ${field}.`);
}

function normalizeInsertStatus(raw: unknown): InitiativeLastInsert["status"] {
  if (raw === "none" || raw === "ok" || raw === "decide" || raw === "error") {
    return raw;
  }
  throw new Error(`Unknown Quint insert status: ${String(raw)}.`);
}

function isRecord(raw: unknown): raw is Readonly<Record<string, unknown>> {
  return typeof raw === "object" && raw !== null;
}
