import { d20Roll, deathSaveCount } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";

import {
  addDeathFailures,
  deathSavingThrowRollAfterD20Reroll,
  deathSavingThrowRollFails,
  deathSavingThrowRollWithAddedDie,
  DEATH_SAVES_RESET,
  deathSavingThrowRegainedHitPoint,
  deathSaveStateFailures,
  deathSaveStateIsDead,
  deathSaveStateIsStable,
  deathSaveStateSuccesses,
  resetDeathSaveRuntimeState,
  resetDeathSaves,
  resolveDeathSavingThrow,
  unmodifiedDeathSavingThrowRoll,
  type DeathSaveRuntimeState,
} from "./death-saves-algebra.ts";

type DeathSavingThrowCount = 0 | 1 | 2;

function dyingState(
  successes: DeathSavingThrowCount = 0,
  failures: DeathSavingThrowCount = 0,
): DeathSaveRuntimeState {
  return {
    tag: "dying",
    deathSaves: {
      successes: deathSaveCount(successes),
      failures: deathSaveCount(failures),
    },
  };
}

describe("death-save algebra", () => {
  test("constructs the reset values and classifies every runtime state", () => {
    expect(resetDeathSaves()).toEqual(DEATH_SAVES_RESET);
    expect(resetDeathSaveRuntimeState()).toEqual(dyingState());

    const states: readonly DeathSaveRuntimeState[] = [
      dyingState(1, 2),
      { tag: "stable" },
      { tag: "dead" },
    ];
    expect(states.map(deathSaveStateIsStable)).toEqual([false, true, false]);
    expect(states.map(deathSaveStateIsDead)).toEqual([false, false, true]);
    expect(states.map(deathSaveStateSuccesses)).toEqual([1, 0, 0]);
    expect(states.map(deathSaveStateFailures)).toEqual([2, 0, 3]);
  });

  test("matches both saving-throw outcomes", () => {
    expect(
      deathSavingThrowRegainedHitPoint({ tag: "noHitPointRecovery" }),
    ).toBe(false);
    expect(deathSavingThrowRegainedHitPoint({ tag: "regainedHitPoint" })).toBe(
      true,
    );
  });

  test("adds failures across dying, stable, and dead states", () => {
    const dead = { tag: "dead" } as const;
    expect(addDeathFailures(dead, deathSaveCount(1))).toBe(dead);

    expect(addDeathFailures({ tag: "stable" }, deathSaveCount(1))).toEqual(
      dyingState(0, 1),
    );
    expect(addDeathFailures({ tag: "stable" }, deathSaveCount(3))).toEqual({
      tag: "dead",
    });

    expect(addDeathFailures(dyingState(1, 0), deathSaveCount(1))).toEqual(
      dyingState(1, 1),
    );
    expect(addDeathFailures(dyingState(1, 2), deathSaveCount(1))).toEqual({
      tag: "dead",
    });
  });

  test("resolves unchanged states and every dying-roll transition", () => {
    const stable = { tag: "stable" } as const;
    const dead = { tag: "dead" } as const;
    expect(
      resolveDeathSavingThrow(
        stable,
        unmodifiedDeathSavingThrowRoll(d20Roll(20)),
      ),
    ).toEqual({
      state: stable,
      outcome: { tag: "noHitPointRecovery" },
    });
    expect(
      resolveDeathSavingThrow(dead, unmodifiedDeathSavingThrowRoll(d20Roll(1))),
    ).toEqual({
      state: dead,
      outcome: { tag: "noHitPointRecovery" },
    });

    const dying = dyingState(1, 0);
    const recovered = resolveDeathSavingThrow(
      dying,
      unmodifiedDeathSavingThrowRoll(d20Roll(20)),
    );
    expect(recovered).toEqual({
      state: resetDeathSaveRuntimeState(),
      outcome: { tag: "regainedHitPoint" },
    });
    expect(deathSavingThrowRegainedHitPoint(recovered.outcome)).toBe(true);

    expect(
      resolveDeathSavingThrow(
        dying,
        unmodifiedDeathSavingThrowRoll(d20Roll(1)),
      ),
    ).toEqual({
      state: dyingState(1, 2),
      outcome: { tag: "noHitPointRecovery" },
    });
    expect(
      resolveDeathSavingThrow(
        dying,
        unmodifiedDeathSavingThrowRoll(d20Roll(10)),
      ),
    ).toEqual({
      state: dyingState(2, 0),
      outcome: { tag: "noHitPointRecovery" },
    });
    expect(
      resolveDeathSavingThrow(
        dyingState(2, 0),
        unmodifiedDeathSavingThrowRoll(d20Roll(10)),
      ),
    ).toEqual({
      state: { tag: "stable" },
      outcome: { tag: "noHitPointRecovery" },
    });
    expect(
      resolveDeathSavingThrow(
        dying,
        unmodifiedDeathSavingThrowRoll(d20Roll(2)),
      ),
    ).toEqual({
      state: dyingState(1, 1),
      outcome: { tag: "noHitPointRecovery" },
    });
  });

  test("a bonus counts toward 10, but a 1 or a 20 on the d20 decides first", () => {
    const dying = dyingState(1, 0);
    const rerolled = (naturalD20: number) => ({
      naturalD20: d20Roll(naturalD20),
      bonus: 9,
    });

    expect(resolveDeathSavingThrow(dying, rerolled(2))).toEqual({
      state: dyingState(2, 0),
      outcome: { tag: "noHitPointRecovery" },
    });
    expect(
      resolveDeathSavingThrow(dying, { naturalD20: d20Roll(2), bonus: 7 }),
    ).toEqual({
      state: dyingState(1, 1),
      outcome: { tag: "noHitPointRecovery" },
    });
    expect(resolveDeathSavingThrow(dying, rerolled(1))).toEqual({
      state: dyingState(1, 2),
      outcome: { tag: "noHitPointRecovery" },
    });
    expect(resolveDeathSavingThrow(dying, rerolled(20))).toEqual({
      state: resetDeathSaveRuntimeState(),
      outcome: { tag: "regainedHitPoint" },
    });
  });

  test("a later reroll of the d20 replaces the d20 and keeps the bonus", () => {
    expect(
      deathSavingThrowRollAfterD20Reroll(
        { naturalD20: d20Roll(1), bonus: 9 },
        d20Roll(2),
      ),
    ).toEqual({ naturalD20: d20Roll(2), bonus: 9 });
    expect(
      deathSavingThrowRollAfterD20Reroll(
        unmodifiedDeathSavingThrowRoll(d20Roll(1)),
        d20Roll(2),
      ),
    ).toEqual(unmodifiedDeathSavingThrowRoll(d20Roll(2)));
  });

  test("an added die adds to what was added to the d20, which stays", () => {
    expect(
      deathSavingThrowRollWithAddedDie({ naturalD20: d20Roll(2), bonus: 9 }, 4),
    ).toEqual({ naturalD20: d20Roll(2), bonus: 13 });
    expect(
      deathSavingThrowRollFails(
        deathSavingThrowRollWithAddedDie(
          unmodifiedDeathSavingThrowRoll(d20Roll(1)),
          6,
        ),
      ),
    ).toBe(true);
  });

  test("a roll fails on a 1, or on a total under 10 without a 20", () => {
    expect(
      deathSavingThrowRollFails(unmodifiedDeathSavingThrowRoll(d20Roll(9))),
    ).toBe(true);
    expect(
      deathSavingThrowRollFails(unmodifiedDeathSavingThrowRoll(d20Roll(10))),
    ).toBe(false);
    expect(
      deathSavingThrowRollFails({ naturalD20: d20Roll(1), bonus: 9 }),
    ).toBe(true);
    expect(
      deathSavingThrowRollFails({ naturalD20: d20Roll(3), bonus: 7 }),
    ).toBe(false);
    expect(
      deathSavingThrowRollFails({ naturalD20: d20Roll(20), bonus: 0 }),
    ).toBe(false);
  });
});
