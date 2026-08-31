import {
  elapsedTimeTicks,
  parsePositiveElapsedTimeTicks,
} from "@dnd/shared/elapsed-time";
import { DieRollResult } from "@dnd/shared/types";
import { Result } from "effect";
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

    expect(Result.isSuccess(advanced)).toBe(true);
    if (Result.isSuccess(advanced)) {
      expect(advanced.success).toMatchObject({
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

    expect(Result.isSuccess(advanced)).toBe(true);
    if (Result.isSuccess(advanced)) {
      expect(advanced.success).toMatchObject({
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

    expect(Result.isFailure(advanced)).toBe(true);
  });

  test("decrements sampled Stable recovery timers", () => {
    const advanced = advanceStableRecovery({
      recovery: {
        kind: "regains1HpAfter",
        remaining: requireSuccess(parsePositiveElapsedTimeTicks(600)),
      },
      ticks: elapsedTimeTicks(300),
    });

    expect(Result.isSuccess(advanced)).toBe(true);
    if (Result.isSuccess(advanced)) {
      expect(advanced.success).toMatchObject({
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
        remaining: requireSuccess(parsePositiveElapsedTimeTicks(300)),
      },
      ticks: elapsedTimeTicks(300),
    });
    expect(recovered).toMatchObject({
      _tag: "Success",
      success: { tag: "recovered" },
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
      _tag: "Failure",
      failure: { tag: "stableRecoveryIssue" },
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
      _tag: "Success",
      success: {
        tag: "needsStableRecoveryRoll",
        elapsedTicks: 0,
        remainingTicks: 600,
      },
    });
  });
});

function requireSuccess<A, E>(result: Result.Result<A, E>): A {
  if (Result.isSuccess(result)) return result.success;
  throw new Error("Expected Result.succeed.");
}
