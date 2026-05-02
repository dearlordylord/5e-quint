import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";

import {
  elapsedTimeTicksFromHours,
  elapsedTimeTicksFromMinutes,
  elapsedTimeTicksFromTimeSpanDuration,
  ELAPSED_TIME_TICKS_PER_HOUR,
  ELAPSED_TIME_TICKS_PER_MINUTE,
  formatElapsedTimeTicks,
  formatTimeSpanDuration,
  timeSpanDuration,
} from "./elapsed-time.ts";

function requireRight<T, E>(value: Either.Either<T, E>): T {
  if (Either.isLeft(value)) {
    throw new Error("expected Right");
  }
  return value.right;
}

describe("elapsed time algebra", () => {
  test("converts minutes and hours to canonical ticks", () => {
    expect(Number(requireRight(elapsedTimeTicksFromMinutes(1)))).toBe(
      ELAPSED_TIME_TICKS_PER_MINUTE,
    );
    expect(Number(requireRight(elapsedTimeTicksFromHours(1)))).toBe(
      ELAPSED_TIME_TICKS_PER_HOUR,
    );
    expect(Number(requireRight(elapsedTimeTicksFromHours(8)))).toBe(4_800);
  });

  test("keeps authored time-span units canonical", () => {
    const duration = requireRight(
      timeSpanDuration({ unit: "minute", amount: 1 }),
    );

    expect(duration.unit).toBe("minute");
    expect(Number(duration.amount)).toBe(1);
    expect(formatTimeSpanDuration(duration)).toBe("1 minute");
  });

  test("rejects fractional and unsupported elapsed-time values", () => {
    expect(Either.isLeft(elapsedTimeTicksFromMinutes(1.5))).toBe(true);
    expect(
      Either.isLeft(
        elapsedTimeTicksFromTimeSpanDuration({ unit: "second", amount: 6 }),
      ),
    ).toBe(true);
  });

  test("formats the largest exact elapsed-time unit", () => {
    expect(
      formatElapsedTimeTicks(requireRight(elapsedTimeTicksFromMinutes(10))),
    ).toBe("10 minutes");
    expect(
      formatElapsedTimeTicks(requireRight(elapsedTimeTicksFromHours(8))),
    ).toBe("8 hours");
  });
});
