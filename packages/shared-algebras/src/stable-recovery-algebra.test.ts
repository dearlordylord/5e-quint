import {
  elapsedTimeTicks,
  parsePositiveElapsedTimeTicks,
} from "@dnd/shared/elapsed-time";
import { DieRollResult } from "@dnd/shared/types";
import { Either } from "effect";
import { describe, expect, test } from "vitest";

import {
  advanceStableRecovery,
  advanceStableRecoveryWithRoll,
} from "./stable-recovery-algebra.ts";

describe("Stable recovery algebra", () => {
  test("accumulates elapsed time before the 1-hour recovery roll boundary", () => {
    const advanced = advanceStableRecovery({
      recovery: {
        kind: "regains1HpAfter1d4Hours",
        elapsedBeforeRecoveryRoll: elapsedTimeTicks(0),
      },
      ticks: elapsedTimeTicks(300),
    });

    expect(Either.isRight(advanced)).toBe(true);
    if (Either.isRight(advanced)) {
      expect(advanced.right).toMatchObject({
        tag: "stable",
        recovery: {
          kind: "regains1HpAfter1d4Hours",
          elapsedBeforeRecoveryRoll: 300,
        },
        elapsedTicks: 300,
      });
    }
  });

  test("uses accumulated elapsed time when resolving the recovery roll", () => {
    const advanced = advanceStableRecoveryWithRoll({
      recovery: {
        kind: "regains1HpAfter1d4Hours",
        elapsedBeforeRecoveryRoll: elapsedTimeTicks(300),
      },
      ticks: elapsedTimeTicks(300),
      roll: DieRollResult(1),
    });

    expect(Either.isRight(advanced)).toBe(true);
    if (Either.isRight(advanced)) {
      expect(advanced.right).toMatchObject({
        tag: "recovered",
        elapsedTicks: 300,
      });
    }
  });

  test("rejects a recovery roll before the 1-hour boundary", () => {
    const advanced = advanceStableRecoveryWithRoll({
      recovery: {
        kind: "regains1HpAfter1d4Hours",
        elapsedBeforeRecoveryRoll: elapsedTimeTicks(0),
      },
      ticks: elapsedTimeTicks(300),
      roll: DieRollResult(1),
    });

    expect(Either.isLeft(advanced)).toBe(true);
  });

  test("decrements sampled Stable recovery timers", () => {
    const advanced = advanceStableRecovery({
      recovery: {
        kind: "regains1HpAfter",
        remaining: requireRight(parsePositiveElapsedTimeTicks(600)),
      },
      ticks: elapsedTimeTicks(300),
    });

    expect(Either.isRight(advanced)).toBe(true);
    if (Either.isRight(advanced)) {
      expect(advanced.right).toMatchObject({
        tag: "stable",
        recovery: { kind: "regains1HpAfter", remaining: 300 },
        elapsedTicks: 300,
      });
    }
  });

  test("recovers when sampled time elapses and rejects invalid d4 results", () => {
    const recovered = advanceStableRecovery({
      recovery: {
        kind: "regains1HpAfter",
        remaining: requireRight(parsePositiveElapsedTimeTicks(300)),
      },
      ticks: elapsedTimeTicks(300),
    });
    expect(recovered).toMatchObject({
      _tag: "Right",
      right: { tag: "recovered" },
    });

    expect(
      advanceStableRecoveryWithRoll({
        recovery: {
          kind: "regains1HpAfter1d4Hours",
          elapsedBeforeRecoveryRoll: elapsedTimeTicks(0),
        },
        ticks: elapsedTimeTicks(600),
        roll: DieRollResult(5),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { tag: "stableRecoveryIssue" },
    });
  });

  test("starts the recovery-roll protocol at the one-hour boundary", () => {
    expect(
      advanceStableRecovery({
        recovery: {
          kind: "regains1HpAfter1d4Hours",
          elapsedBeforeRecoveryRoll: elapsedTimeTicks(0),
        },
        ticks: elapsedTimeTicks(600),
      }),
    ).toMatchObject({
      _tag: "Right",
      right: {
        tag: "needsStableRecoveryRoll",
        elapsedTicks: 0,
        remainingTicks: 600,
      },
    });
  });
});

function requireRight<A, E>(either: Either.Either<A, E>): A {
  if (Either.isRight(either)) return either.right;
  throw new Error("Expected Either.right.");
}
