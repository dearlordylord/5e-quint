import { Result } from "effect";
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

function requireSuccess<T, E>(value: Result.Result<T, E>): T {
  if (Result.isFailure(value)) {
    throw new Error("expected Success");
  }
  return value.success;
}

describe("elapsed time algebra", () => {
  test("converts minutes and hours to canonical ticks", () => {
    expect(Number(requireSuccess(elapsedTimeTicksFromMinutes(1)))).toBe(
      ELAPSED_TIME_TICKS_PER_MINUTE,
    );
    expect(Number(requireSuccess(elapsedTimeTicksFromHours(1)))).toBe(
      ELAPSED_TIME_TICKS_PER_HOUR,
    );
    expect(Number(requireSuccess(elapsedTimeTicksFromHours(8)))).toBe(4_800);
  });

  test("keeps authored time-span units canonical", () => {
    const duration = requireSuccess(
      timeSpanDuration({ unit: "minute", amount: 1 }),
    );

    expect(duration.unit).toBe("minute");
    expect(Number(duration.amount)).toBe(1);
    expect(formatTimeSpanDuration(duration)).toBe("1 minute");
  });

  test("rejects fractional and unsupported elapsed-time values", () => {
    const fractional = elapsedTimeTicksFromMinutes(1.5);
    expect(Result.isFailure(fractional)).toBe(true);
    if (Result.isFailure(fractional)) {
      expect(fractional.failure).toEqual({
        kind: "fractionalAmount",
        amount: 1.5,
      });
    }

    const unsupported = elapsedTimeTicksFromTimeSpanDuration({
      unit: "second",
      amount: 6,
    });
    expect(Result.isFailure(unsupported)).toBe(true);
    if (Result.isFailure(unsupported)) {
      expect(unsupported.failure).toEqual({
        kind: "unsupportedUnit",
        unit: "second",
      });
    }
  });

  test("parses positive elapsed-time ticks without admitting expired timers", () => {
    expect(Number(requireSuccess(parsePositiveElapsedTimeTicks(1)))).toBe(1);
    expect(Result.isFailure(parsePositiveElapsedTimeTicks(0))).toBe(true);
  });

  test("formats the largest exact elapsed-time unit", () => {
    expect(
      formatElapsedTimeTicks(requireSuccess(elapsedTimeTicksFromMinutes(10))),
    ).toBe("10 minutes");
    expect(
      formatElapsedTimeTicks(requireSuccess(elapsedTimeTicksFromHours(8))),
    ).toBe("8 hours");
    expect(formatElapsedTimeTicks(elapsedTimeTicks(14_400))).toBe("1 day");
    expect(formatElapsedTimeTicks(elapsedTimeTicks(1))).toBe("1 round");
    expect(formatElapsedTimeTicks(elapsedTimeTicks(2))).toBe("2 rounds");
  });

  test("parses timer and boundary domains with precise failures", () => {
    expect(isTimeSpanUnit("round")).toBe(true);
    expect(isTimeSpanUnit("second")).toBe(false);
    expect(Number(requireSuccess(parseElapsedTimeTicks(0)))).toBe(0);
    expect(Result.isFailure(parseElapsedTimeTicks(-1))).toBe(true);
    expect(Result.isFailure(parseElapsedTimeTicks(1.5))).toBe(true);
    expect(Result.isFailure(parsePositiveElapsedTimeTicks(1.5))).toBe(true);
    expect(Number(requireSuccess(parsePositiveInt(2)))).toBe(2);
    expect(Result.isFailure(parsePositiveInt(0))).toBe(true);
    expect(Result.isFailure(parsePositiveInt(1.5))).toBe(true);
    expect(Number(requireSuccess(parseBoundaryCrossingsRemaining(2)))).toBe(2);
    expect(Result.isFailure(parseBoundaryCrossingsRemaining(0))).toBe(true);
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
    expect(Number(requireSuccess(elapsedTimeTicksFromUnit("round", 2)))).toBe(
      2,
    );
    expect(Number(requireSuccess(elapsedTimeTicksFromUnit("day", 2)))).toBe(
      28_800,
    );
    expect(Result.isFailure(elapsedTimeTicksFromUnit("day", -1))).toBe(true);
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
    expect(
      Result.isFailure(timeSpanDuration({ unit: "minute", amount: 0 })),
    ).toBe(true);
    expect(
      Result.isFailure(timeSpanDuration({ unit: "second", amount: 1 })),
    ).toBe(true);
  });
});
