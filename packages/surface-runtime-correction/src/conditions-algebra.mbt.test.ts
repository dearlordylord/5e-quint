import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  applyCondition,
  EMPTY_CONDITION_STATE,
  hasCondition,
  isIncapacitated,
  removeCondition,
  type ConditionState,
} from "@dnd/shared-algebras/conditions-algebra";

type ModelState = {
  readonly state: ConditionState;
  readonly hasIncapacitated: boolean;
  readonly hasProne: boolean;
};

const quintStateSchema = z.object({
  qBlinded: z.boolean(),
  qCharmed: z.boolean(),
  qDeafened: z.boolean(),
  qFrightened: z.boolean(),
  qGrappled: z.boolean(),
  qInvisible: z.boolean(),
  qParalyzed: z.boolean(),
  qPetrified: z.boolean(),
  qPoisoned: z.boolean(),
  qProne: z.boolean(),
  qRestrained: z.boolean(),
  qStunned: z.boolean(),
  qUnconscious: z.boolean(),
  qDirectIncapacitated: z.boolean(),
  qHasIncapacitated: z.boolean(),
  qHasProne: z.boolean(),
});

function normalizeQuintState(raw: unknown): ModelState {
  const parsed = quintStateSchema.parse(raw);
  const state: ConditionState = {
    blinded: parsed.qBlinded,
    charmed: parsed.qCharmed,
    deafened: parsed.qDeafened,
    frightened: parsed.qFrightened,
    grappled: parsed.qGrappled,
    invisible: parsed.qInvisible,
    paralyzed: parsed.qParalyzed,
    petrified: parsed.qPetrified,
    poisoned: parsed.qPoisoned,
    prone: parsed.qProne,
    restrained: parsed.qRestrained,
    stunned: parsed.qStunned,
    unconscious: parsed.qUnconscious,
    directIncapacitated: parsed.qDirectIncapacitated,
  };
  return {
    state,
    hasIncapacitated: parsed.qHasIncapacitated,
    hasProne: parsed.qHasProne,
  };
}

function compareState(spec: ModelState, impl: ModelState): boolean {
  expect(impl).toEqual(spec);
  return true;
}

function makeInitialModelState(): ModelState {
  return {
    state: EMPTY_CONDITION_STATE,
    hasIncapacitated: false,
    hasProne: false,
  };
}

const driverSchema = {
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

function refreshDerived(state: ConditionState): ModelState {
  return {
    state,
    hasIncapacitated: isIncapacitated(state),
    hasProne: hasCondition(state, "prone"),
  };
}

function createConditionsDriver() {
  return defineDriver(driverSchema, () => {
    let state = makeInitialModelState();

    return {
      init: () => {
        state = makeInitialModelState();
      },
      doApplyBlinded: () => {
        state = refreshDerived(applyCondition(state.state, "blinded"));
      },
      doRemoveBlinded: () => {
        state = refreshDerived(removeCondition(state.state, "blinded"));
      },
      doApplyProne: () => {
        state = refreshDerived(applyCondition(state.state, "prone"));
      },
      doRemoveProne: () => {
        state = refreshDerived(removeCondition(state.state, "prone"));
      },
      doApplyParalyzed: () => {
        state = refreshDerived(applyCondition(state.state, "paralyzed"));
      },
      doRemoveParalyzed: () => {
        state = refreshDerived(removeCondition(state.state, "paralyzed"));
      },
      doApplyUnconscious: () => {
        state = refreshDerived(applyCondition(state.state, "unconscious"));
      },
      doRemoveUnconscious: () => {
        state = refreshDerived(removeCondition(state.state, "unconscious"));
      },
      doApplyDirectIncapacitated: () => {
        state = refreshDerived(applyCondition(state.state, "incapacitated"));
      },
      doRemoveDirectIncapacitated: () => {
        state = refreshDerived(removeCondition(state.state, "incapacitated"));
      },
      step: () => {},
      getState: () => state,
    };
  });
}

const conditionsStateCheck = stateCheck(normalizeQuintState, compareState);

describe("Conditions Algebra MBT", () => {
  it("replays condition traces against TS algebra", async () => {
    const specPath = path.resolve(
      import.meta.dirname,
      "../conditions-algebra-mbt.qnt",
    );
    await run({
      spec: specPath,
      init: "init",
      step: "step",
      driver: createConditionsDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 16),
      stateCheck: conditionsStateCheck,
    });
  }, 120_000);
});
