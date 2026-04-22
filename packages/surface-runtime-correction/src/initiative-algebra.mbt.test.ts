import * as path from "node:path";
import { execSync } from "node:child_process";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import * as Either from "effect/Either";
import * as Option from "effect/Option";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";

import {
  createScoredInitiativeStack,
  type InitiativeEntry,
  insertByInitiative,
  nextInitiative,
  removeFromInitiative,
  type InitiativeStack,
} from "@dnd/shared/initiative-algebra";
import { Index, Initiative, Round } from "@dnd/shared/types";

type CreatureId = "c1" | "c2" | "c2b" | "c3" | "c4" | "cx";

type ModelState = {
  readonly stack: InitiativeStack<CreatureId>;
  readonly lastInsertStatus: "none" | "ok" | "decide" | "error";
  readonly lastTie: ReadonlyArray<CreatureId>;
};

function killZombieEvaluators(): void {
  try {
    execSync("pkill -9 -f quint_evaluator", { stdio: "ignore" });
  } catch {}
  try {
    execSync("pkill -9 -f 'quint run .* --mbt'", { stdio: "ignore" });
  } catch {}
}

const entrySchema = z.object({
  creature: z.enum(["c1", "c2", "c2b", "c3", "c4", "cx"]),
  initiative: z.bigint(),
});

const quintStateSchema = z.object({
  qRound: z.bigint(),
  qAlreadyActed: z.array(entrySchema),
  qStillToAct: z.array(entrySchema).min(1),
  qLastInsertStatus: z.string(),
  qLastTie: z.array(z.enum(["c1", "c2", "c2b", "c3", "c4", "cx"])),
});

function parseEntry(raw: z.infer<typeof entrySchema>): InitiativeEntry<CreatureId> {
  return {
    creature: raw.creature,
    initiative: Initiative(Number(raw.initiative)),
  };
}

function normalizeQuintState(raw: unknown): ModelState {
  const parsed = quintStateSchema.parse(raw);
  return {
    stack: {
      round: Round(Number(parsed.qRound)),
      alreadyActed: parsed.qAlreadyActed.map(parseEntry),
      stillToAct: parsed.qStillToAct.map(parseEntry) as [
        InitiativeEntry<CreatureId>,
        ...Array<InitiativeEntry<CreatureId>>,
      ],
    },
    lastInsertStatus: parsed.qLastInsertStatus as ModelState["lastInsertStatus"],
    lastTie: parsed.qLastTie,
  };
}

function compareState(spec: ModelState, impl: ModelState): boolean {
  expect(impl).toEqual(spec);
  return true;
}

function makeInitialModelState(): ModelState {
  const created = createScoredInitiativeStack<CreatureId>([
    { creature: "c4", initiative: Initiative(4) },
    { creature: "c2", initiative: Initiative(2) },
    { creature: "c2b", initiative: Initiative(2) },
    { creature: "c1", initiative: Initiative(1) },
  ], Round(1));
  if (Either.isLeft(created)) {
    throw new Error(created.left);
  }
  return {
    stack: created.right,
    lastInsertStatus: "none",
    lastTie: [],
  };
}

const driverSchema = {
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

function createInitiativeDriver() {
  return defineDriver(driverSchema, () => {
    let state = makeInitialModelState();

    return {
      init: () => {
        state = makeInitialModelState();
      },
      doNext: () => {
        state = {
          ...state,
          stack: nextInitiative(state.stack)[0],
        };
      },
      doRemoveC1: () => {
        const removed = removeFromInitiative(
          state.stack,
          (creature) => creature === "c1",
        );
        if (Option.isSome(removed)) {
          state = { ...state, stack: removed.value };
        }
      },
      doRemoveC2: () => {
        const removed = removeFromInitiative(
          state.stack,
          (creature) => creature === "c2",
        );
        if (Option.isSome(removed)) {
          state = { ...state, stack: removed.value };
        }
      },
      doInsertC3NoDecision: () => {
        const result = insertByInitiative<CreatureId>(
          state.stack,
          "c3",
          Initiative(3),
        );
        if (result.status === "ok") {
          state = { ...state, stack: result.stack, lastInsertStatus: "ok", lastTie: [] };
        } else if (result.status === "decide") {
          state = { ...state, lastInsertStatus: "decide", lastTie: [...result.tie] };
        } else {
          state = { ...state, lastInsertStatus: "error", lastTie: [] };
        }
      },
      doInsertCxTieNoDecision: () => {
        const result = insertByInitiative<CreatureId>(
          state.stack,
          "cx",
          Initiative(2),
        );
        if (result.status === "ok") {
          state = { ...state, stack: result.stack, lastInsertStatus: "ok", lastTie: [] };
        } else if (result.status === "decide") {
          state = { ...state, lastInsertStatus: "decide", lastTie: [...result.tie] };
        } else {
          state = { ...state, lastInsertStatus: "error", lastTie: [] };
        }
      },
      doInsertCxTieDecision: () => {
        const result = insertByInitiative<CreatureId>(
          state.stack,
          "cx",
          Initiative(2),
          [["c2", "c2b"] as const, Index(1)],
        );
        if (result.status === "ok") {
          state = { ...state, stack: result.stack, lastInsertStatus: "ok", lastTie: [] };
        } else if (result.status === "decide") {
          state = { ...state, lastInsertStatus: "decide", lastTie: [...result.tie] };
        } else {
          state = { ...state, lastInsertStatus: "error", lastTie: [] };
        }
      },
      doInsertC3WrongDecision: () => {
        const result = insertByInitiative<CreatureId>(
          state.stack,
          "c3",
          Initiative(3),
          [["c1"] as const, Index(0)],
        );
        if (result.status === "ok") {
          state = { ...state, stack: result.stack, lastInsertStatus: "ok", lastTie: [] };
        } else if (result.status === "decide") {
          state = { ...state, lastInsertStatus: "decide", lastTie: [...result.tie] };
        } else {
          state = { ...state, lastInsertStatus: "error", lastTie: [] };
        }
      },
      step: () => {},
      getState: () => state,
    };
  });
}

const initiativeStateCheck = stateCheck(normalizeQuintState, compareState);

describe("Initiative Algebra MBT", () => {
  beforeAll(() => {
    killZombieEvaluators();
  });

  afterAll(() => {
    killZombieEvaluators();
  });

  it("replays initiative traces against TS algebra", async () => {
    const specPath = path.resolve(
      import.meta.dirname,
      "../initiative-algebra-mbt.qnt",
    );
    await run({
      spec: specPath,
      init: "init",
      step: "step",
      driver: createInitiativeDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 12),
      stateCheck: initiativeStateCheck,
    });
  }, 120_000);
});
