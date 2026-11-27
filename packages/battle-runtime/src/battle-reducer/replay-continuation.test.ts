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
import { DieRollResult } from "@dnd/shared/types";
import {
  BARDIC_INSPIRATION_DIE_EFFECT_KIND,
  type BattleFill,
} from "../battle-state-execution.ts";
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
      reconstructReplayContinuationFills(
        [target],
        [{ ...target }, damageType],
        undefined,
      ),
    ).toEqual([target, damageType]);
  });

  test("does not collapse separately submitted non-semantic fills", () => {
    const damageType = {
      kind: "damageTypeChoice",
      holeId: holeId("replay-damage-type"),
      value: "fire",
    } satisfies BattleFill;

    expect(
      reconstructReplayContinuationFills(
        [damageType],
        [{ ...damageType }],
        undefined,
      ),
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
        undefined,
      ),
    ).toEqual([firstTarget, secondTarget, { ...firstTarget }]);
  });
});

describe("a recorded roll the replay asks again", () => {
  const attackRoll = (
    total: number,
    naturalD20: number,
    d20TestAddedDice?: NonNullable<
      Extract<
        BattleFill,
        { readonly kind: "attackRoll" }
      >["value"]["d20TestAddedDice"]
    >,
  ) =>
    ({
      kind: "attackRoll",
      holeId: holeId("replay-attack-roll"),
      value: {
        total,
        d20TestRoll: { tag: "single", naturalD20: DieRollResult(naturalD20) },
        ...(d20TestAddedDice === undefined ? {} : { d20TestAddedDice }),
      },
    }) satisfies BattleFill;
  const addedDie = [
    {
      kind: "addDie",
      effectKind: BARDIC_INSPIRATION_DIE_EFFECT_KIND,
      dieRoll: DieRollResult(4),
    },
  ] as const;

  test("takes the later added dice, on the roll a Reaction lowered", () => {
    expect(
      reconstructReplayContinuationFills(
        [attackRoll(9, 10)],
        [attackRoll(12, 10, addedDie)],
        3,
      ),
    ).toEqual([attackRoll(9, 10, addedDie)]);
  });

  test("takes the later added dice, on a roll no Reaction lowered", () => {
    expect(
      reconstructReplayContinuationFills(
        [attackRoll(13, 11)],
        [attackRoll(13, 11, addedDie)],
        undefined,
      ),
    ).toEqual([attackRoll(13, 11, addedDie)]);
  });

  test("lowers the roll asked again by the kept reduction, not by its total", () => {
    expect(
      reconstructReplayContinuationFills(
        [attackRoll(13, 11)],
        [attackRoll(25, 11, addedDie)],
        undefined,
      ),
    ).toEqual([attackRoll(13, 11), attackRoll(25, 11, addedDie)]);
    expect(
      reconstructReplayContinuationFills(
        [attackRoll(9, 10)],
        [attackRoll(20, 10, addedDie)],
        3,
      ),
    ).toEqual([attackRoll(9, 10), attackRoll(20, 10, addedDie)]);
  });

  test("leaves a changed roll to fill the hole twice", () => {
    expect(
      reconstructReplayContinuationFills(
        [attackRoll(9, 10)],
        [attackRoll(12, 11, addedDie)],
        3,
      ),
    ).toEqual([attackRoll(9, 10), attackRoll(12, 11, addedDie)]);
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
