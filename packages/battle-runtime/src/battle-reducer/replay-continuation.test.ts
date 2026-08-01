import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";
import { describe, expect, test } from "vitest";

import {
  battleId,
  characterSeed,
  combatantId,
  fighterId,
  startBattleRight,
  statBlockCreatureInit,
} from "../battle-runtime.test-support.ts";
import type { BattleFill } from "../battle-state-execution.ts";
import {
  reconstructReplayContinuationFills,
  ReplayContinuationExecution,
  resolveReplayContinuation,
} from "./replay-continuation.ts";
import { spellProcedureExecutionRegistry } from "./spell-procedure-profiles/execution-composition.ts";

const replayExecution = ReplayContinuationExecution.fromExecutionRegistry(
  spellProcedureExecutionRegistry(),
  () => {
    throw new Error(
      "A stale replay subject must not reach procedure execution.",
    );
  },
);

describe("reconstructReplayContinuationFills", () => {
  test("keeps the recorded prefix and appends only new submitted suffix fills", () => {
    const target = {
      kind: "targetChoice",
      holeId: holeId("replay-target"),
      value: combatantId("target"),
    } satisfies BattleFill;
    const damageType = {
      kind: "damageTypeChoice",
      holeId: holeId("replay-damage-type"),
      value: "fire",
    } satisfies BattleFill;

    expect(
      reconstructReplayContinuationFills([target], [{ ...target }, damageType]),
    ).toEqual([target, damageType]);
  });

  test("does not collapse separately submitted non-semantic fills", () => {
    const damageType = {
      kind: "damageTypeChoice",
      holeId: holeId("replay-damage-type"),
      value: "fire",
    } satisfies BattleFill;

    expect(
      reconstructReplayContinuationFills([damageType], [{ ...damageType }]),
    ).toEqual([damageType, { ...damageType }]);
  });

  test("matches recorded semantic fills in order before retaining the suffix", () => {
    const firstTarget = {
      kind: "targetChoice",
      holeId: holeId("first-replay-target"),
      value: combatantId("first-target"),
    } satisfies BattleFill;
    const secondTarget = {
      kind: "targetChoice",
      holeId: holeId("second-replay-target"),
      value: combatantId("second-target"),
    } satisfies BattleFill;

    expect(
      reconstructReplayContinuationFills(
        [firstTarget, secondTarget],
        [{ ...secondTarget }, { ...firstTarget }],
      ),
    ).toEqual([firstTarget, secondTarget, { ...firstTarget }]);
  });
});

describe("resolveReplayContinuation", () => {
  test("reports a procedure-neutral diagnostic when no replay frame owns the subject", () => {
    const state = startBattleRight({
      battleId: battleId("battle-stale-replay-subject"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });

    expect(
      resolveReplayContinuation({
        state,
        subject: {
          tag: "runtimeCommand",
          actorId: fighterId,
          command: "endTurn",
        },
        fills: [],
        execution: replayExecution,
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "Interrupted procedure replay must be resolved before other battle subjects.",
    });
  });
});
