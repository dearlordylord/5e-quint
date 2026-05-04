import { Brand, Either, Match } from "effect";

export const TIME_SPAN_SECONDS_PER_ROUND = 6;
export const TIME_SPAN_SECONDS_PER_MINUTE = 60;
export const ELAPSED_TIME_TICKS_PER_MINUTE =
  TIME_SPAN_SECONDS_PER_MINUTE / TIME_SPAN_SECONDS_PER_ROUND;
export const ELAPSED_TIME_TICKS_PER_HOUR = ELAPSED_TIME_TICKS_PER_MINUTE * 60;
export const ELAPSED_TIME_HOURS_PER_DAY = 24;
export const ELAPSED_TIME_TICKS_PER_DAY =
  ELAPSED_TIME_TICKS_PER_HOUR * ELAPSED_TIME_HOURS_PER_DAY;

export const TIME_SPAN_UNITS = ["round", "minute", "hour", "day"] as const;
export type TimeSpanUnit = (typeof TIME_SPAN_UNITS)[number];

export type ElapsedTimeTicks = number & Brand.Brand<"ElapsedTimeTicks">;
const ElapsedTimeTicks = Brand.nominal<ElapsedTimeTicks>();

export type PositiveInt = number & Brand.Brand<"PositiveInt">;
const PositiveInt = Brand.nominal<PositiveInt>();

// Count of future actor-relative turn-boundary crossings while an effect is active.
export type BoundaryCrossingsRemaining = number &
  Brand.Brand<"BoundaryCrossingsRemaining">;
const BoundaryCrossingsRemaining = Brand.nominal<BoundaryCrossingsRemaining>();

export type TimeSpanDuration = {
  readonly kind: "timeSpan";
  readonly unit: TimeSpanUnit;
  readonly amount: PositiveInt;
};

export type ElapsedTimeParseError =
  | { readonly kind: "unsupportedUnit"; readonly unit: string }
  | { readonly kind: "fractionalAmount"; readonly amount: number }
  | { readonly kind: "negativeAmount"; readonly amount: number }
  | { readonly kind: "nonPositiveAmount"; readonly amount: number };

export type SurfaceTimeSpanDurationValue = {
  readonly unit: string;
  readonly amount: number;
};

const TIME_SPAN_UNIT_SET: ReadonlySet<string> = new Set(TIME_SPAN_UNITS);

export function isTimeSpanUnit(unit: string): unit is TimeSpanUnit {
  return TIME_SPAN_UNIT_SET.has(unit);
}

export function parseElapsedTimeTicks(
  value: number,
): Either.Either<ElapsedTimeTicks, ElapsedTimeParseError> {
  if (!Number.isInteger(value)) {
    return Either.left({ kind: "fractionalAmount", amount: value });
  }
  if (value < 0) {
    return Either.left({ kind: "negativeAmount", amount: value });
  }
  return Either.right(ElapsedTimeTicks(value));
}

export function elapsedTimeTicks(value: number): ElapsedTimeTicks {
  return ElapsedTimeTicks(value);
}

export function boundaryCrossingsRemaining(
  value: number,
): BoundaryCrossingsRemaining {
  return BoundaryCrossingsRemaining(value);
}

export function parseBoundaryCrossingsRemaining(
  value: number,
): Either.Either<BoundaryCrossingsRemaining, ElapsedTimeParseError> {
  const parsed = parsePositiveInt(value);
  return Either.isRight(parsed)
    ? Either.right(BoundaryCrossingsRemaining(parsed.right))
    : Either.left(parsed.left);
}

export function parsePositiveInt(
  value: number,
): Either.Either<PositiveInt, ElapsedTimeParseError> {
  if (!Number.isInteger(value)) {
    return Either.left({ kind: "fractionalAmount", amount: value });
  }
  if (value <= 0) {
    return Either.left({ kind: "nonPositiveAmount", amount: value });
  }
  return Either.right(PositiveInt(value));
}

export function decrementBoundaryCrossingsRemaining(
  value: BoundaryCrossingsRemaining,
): BoundaryCrossingsRemaining | null {
  const next = Number(value) - 1;
  return next <= 0 ? null : boundaryCrossingsRemaining(next);
}

export function elapsedTimeTicksFromUnit(
  unit: TimeSpanUnit,
  amount: number,
): Either.Either<ElapsedTimeTicks, ElapsedTimeParseError> {
  if (!Number.isInteger(amount)) {
    return Either.left({ kind: "fractionalAmount", amount });
  }
  if (amount < 0) {
    return Either.left({ kind: "negativeAmount", amount });
  }

  return Either.right(
    elapsedTimeTicks(
      Match.value(unit).pipe(
        Match.when("round", () => amount),
        Match.when("minute", () => amount * ELAPSED_TIME_TICKS_PER_MINUTE),
        Match.when("hour", () => amount * ELAPSED_TIME_TICKS_PER_HOUR),
        Match.when("day", () => amount * ELAPSED_TIME_TICKS_PER_DAY),
        Match.exhaustive,
      ),
    ),
  );
}

export function elapsedTimeTicksFromTimeSpanDuration(
  duration: SurfaceTimeSpanDurationValue,
): Either.Either<ElapsedTimeTicks, ElapsedTimeParseError> {
  if (!isTimeSpanUnit(duration.unit)) {
    return Either.left({ kind: "unsupportedUnit", unit: duration.unit });
  }
  return elapsedTimeTicksFromUnit(duration.unit, duration.amount);
}

export function timeSpanDuration(
  value: SurfaceTimeSpanDurationValue,
): Either.Either<TimeSpanDuration, ElapsedTimeParseError> {
  if (!isTimeSpanUnit(value.unit)) {
    return Either.left({ kind: "unsupportedUnit", unit: value.unit });
  }
  const amount = parsePositiveInt(value.amount);
  return Either.isRight(amount)
    ? Either.right({ kind: "timeSpan", unit: value.unit, amount: amount.right })
    : Either.left(amount.left);
}

export function elapsedTimeTicksFromMinutes(
  minutes: number,
): Either.Either<ElapsedTimeTicks, ElapsedTimeParseError> {
  return elapsedTimeTicksFromUnit("minute", minutes);
}

export function elapsedTimeTicksFromHours(
  hours: number,
): Either.Either<ElapsedTimeTicks, ElapsedTimeParseError> {
  return elapsedTimeTicksFromUnit("hour", hours);
}

export function formatTimeSpanDuration(duration: TimeSpanDuration): string {
  return formatTimeSpanUnit(Number(duration.amount), duration.unit);
}

export function formatElapsedTimeTicks(ticks: ElapsedTimeTicks): string {
  const value = Number(ticks);
  if (value % ELAPSED_TIME_TICKS_PER_DAY === 0) {
    return formatTimeSpanUnit(value / ELAPSED_TIME_TICKS_PER_DAY, "day");
  }
  if (value % ELAPSED_TIME_TICKS_PER_HOUR === 0) {
    return formatTimeSpanUnit(value / ELAPSED_TIME_TICKS_PER_HOUR, "hour");
  }
  if (value % ELAPSED_TIME_TICKS_PER_MINUTE === 0) {
    return formatTimeSpanUnit(value / ELAPSED_TIME_TICKS_PER_MINUTE, "minute");
  }
  return formatTimeSpanUnit(value, "round");
}

export function describeElapsedTimeParseError(
  error: ElapsedTimeParseError,
): string {
  return Match.value(error).pipe(
    Match.when(
      { kind: "unsupportedUnit" },
      ({ unit }) => `Unsupported elapsed-time unit: ${unit}`,
    ),
    Match.when(
      { kind: "fractionalAmount" },
      ({ amount }) => `Elapsed-time amount must be an integer: ${amount}`,
    ),
    Match.when(
      { kind: "negativeAmount" },
      ({ amount }) => `Elapsed-time amount must be non-negative: ${amount}`,
    ),
    Match.when(
      { kind: "nonPositiveAmount" },
      ({ amount }) => `Amount must be a positive integer: ${amount}`,
    ),
    Match.exhaustive,
  );
}

function formatTimeSpanUnit(amount: number, unit: TimeSpanUnit): string {
  return `${amount} ${unit}${amount === 1 ? "" : "s"}`;
}
