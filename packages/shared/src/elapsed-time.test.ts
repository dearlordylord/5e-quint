import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";

import {
  boundaryCrossingsRemaining,
  decrementBoundaryCrossingsRemaining,
  describeElapsedTimeParseError,
  elapsedTimeTicks,
  elapsedTimeTicksFromUnit,
  elapsedTimeTicksFromHours,
  elapsedTimeTicksFromMinutes,
  elapsedTimeTicksFromTimeSpanDuration,
  ELAPSED_TIME_TICKS_PER_HOUR,
  ELAPSED_TIME_TICKS_PER_MINUTE,
  formatElapsedTimeTicks,
  formatTimeSpanDuration,
  isTimeSpanUnit,
  parseBoundaryCrossingsRemaining,
  parseElapsedTimeTicks,
  parsePositiveInt,
  parsePositiveElapsedTimeTicks,
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

  test("parses positive elapsed-time ticks without admitting expired timers", () => {
    expect(Number(requireRight(parsePositiveElapsedTimeTicks(1)))).toBe(1);
    expect(Either.isLeft(parsePositiveElapsedTimeTicks(0))).toBe(true);
  });

  test("formats the largest exact elapsed-time unit", () => {
    expect(
      formatElapsedTimeTicks(requireRight(elapsedTimeTicksFromMinutes(10))),
    ).toBe("10 minutes");
    expect(
      formatElapsedTimeTicks(requireRight(elapsedTimeTicksFromHours(8))),
    ).toBe("8 hours");
    expect(formatElapsedTimeTicks(elapsedTimeTicks(14_400))).toBe("1 day");
    expect(formatElapsedTimeTicks(elapsedTimeTicks(1))).toBe("1 round");
    expect(formatElapsedTimeTicks(elapsedTimeTicks(2))).toBe("2 rounds");
  });

  test("parses timer and boundary domains with precise failures", () => {
    expect(isTimeSpanUnit("round")).toBe(true);
    expect(isTimeSpanUnit("second")).toBe(false);
    expect(Number(requireRight(parseElapsedTimeTicks(0)))).toBe(0);
    expect(Either.isLeft(parseElapsedTimeTicks(-1))).toBe(true);
    expect(Either.isLeft(parseElapsedTimeTicks(1.5))).toBe(true);
    expect(Either.isLeft(parsePositiveElapsedTimeTicks(1.5))).toBe(true);
    expect(Number(requireRight(parsePositiveInt(2)))).toBe(2);
    expect(Either.isLeft(parsePositiveInt(0))).toBe(true);
    expect(Either.isLeft(parsePositiveInt(1.5))).toBe(true);
    expect(Number(requireRight(parseBoundaryCrossingsRemaining(2)))).toBe(2);
    expect(Either.isLeft(parseBoundaryCrossingsRemaining(0))).toBe(true);
    expect(
      Number(
        decrementBoundaryCrossingsRemaining(boundaryCrossingsRemaining(2)),
      ),
    ).toBe(1);
    expect(
      decrementBoundaryCrossingsRemaining(boundaryCrossingsRemaining(1)),
    ).toBeNull();
  });

  test("converts every time unit and describes every parse error", () => {
    expect(Number(requireRight(elapsedTimeTicksFromUnit("round", 2)))).toBe(2);
    expect(Number(requireRight(elapsedTimeTicksFromUnit("day", 2)))).toBe(
      28_800,
    );
    expect(Either.isLeft(elapsedTimeTicksFromUnit("day", -1))).toBe(true);
    expect(
      describeElapsedTimeParseError({
        kind: "unsupportedUnit",
        unit: "second",
      }),
    ).toContain("second");
    expect(
      describeElapsedTimeParseError({
        kind: "fractionalAmount",
        amount: 1.5,
      }),
    ).toContain("1.5");
    expect(
      describeElapsedTimeParseError({ kind: "negativeAmount", amount: -1 }),
    ).toContain("-1");
    expect(
      describeElapsedTimeParseError({ kind: "nonPositiveAmount", amount: 0 }),
    ).toContain("0");
    expect(Either.isLeft(timeSpanDuration({ unit: "minute", amount: 0 }))).toBe(
      true,
    );
    expect(Either.isLeft(timeSpanDuration({ unit: "second", amount: 1 }))).toBe(
      true,
    );
  });
});
